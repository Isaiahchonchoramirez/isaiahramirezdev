#!/usr/bin/env python3
"""
Generate the Reef synthetic deal-room fixture.

Everything is fictional. See docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md.

Order matters: one financial model is built first so every derived document is
internally consistent by construction, then consistency is broken ONLY at the
planted points, each recorded as it is introduced. The ground truth is emitted
from the same model so the answer key cannot drift from the fixture.

    python3 tools/reef-fixture/generate.py
"""
import csv
import hashlib
import json
import os
import random
import shutil
import subprocess
import zipfile
from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas as pdfcanvas
from PIL import Image, ImageFilter

VERSION = "1.0.0"
SEED = 20260805
ROOT = Path(__file__).resolve().parents[2] / "fixtures" / "reef-deal-room"
BANNER = "SYNTHETIC — FICTIONAL COMPANY — NOT REAL"
rng = random.Random(SEED)

# ─────────────────────────────────────────────────────────────────────────────
# 1. The model. Single source of truth for every number in the room.
# ─────────────────────────────────────────────────────────────────────────────

CO = "Ridgeline Industrial Services, LLC"
BRANCHES = [("TOL", "Toledo, OH"), ("FTW", "Fort Wayne, IN"), ("ERI", "Erie, PA")]

REVENUE = {                       # by fiscal year and stream
    2023: {"contract": 7_180_000, "tm": 3_900_200, "equipment": 2_700_000},
    2024: {"contract": 7_910_000, "tm": 4_210_400, "equipment": 3_000_000},
    2025: {"contract": 8_540_000, "tm": 4_532_880, "equipment": 3_340_000},
}
TOTAL_REV = {y: sum(v.values()) for y, v in REVENUE.items()}   # 2025 = 16,412,880

BRANCH_REV_2025 = {"TOL": 8_492_880, "FTW": 4_120_000, "ERI": 3_800_000}
FTW_COGS_2025 = 2_937_560          # → 28.70% GM, vs 34.2% claimed in the KPI deck

ADJ_EBITDA_2025 = 1_950_000
MAINT_CAPEX = 285_000
DEBT_SERVICE = 1_411_000           # → FCCR 1.18 vs 1.25 covenant
FCCR = round((ADJ_EBITDA_2025 - MAINT_CAPEX) / DEBT_SERVICE, 2)

PARTS_COGS = 4_180_000
HARTWELL_SPEND = 2_562_000         # → 61.3% single-supplier dependency

AR_TOTAL = 3_402_000
AR_OVER_90 = 612_400               # 18.0% of AR
FOUNDRY_OVER_90 = 341_200

WIP_2024, WIP_2025 = 410_000, 1_020_000

TOP_CUSTOMERS = [                  # name, id, FY25 revenue, has_contract
    ("Lakeside Steel Processing Co.", "000418", 3_676_485, True),   # 22.40%
    ("Consolidated Foundry Group",    "000742", 1_842_300, True),
    ("Bayfield Paper Mills",          "000119", 1_204_900, True),
    ("Northgate Plastics",            "000905", 986_400, True),
    ("Erie Valley Grain",             "001233", 742_100, False),    # no contract
    ("Maumee Chemical",               "000377", 611_500, True),
    ("Sandusky Marine Works",         "000550", 498_200, True),
    ("Fort Wayne Castings",           "000861", 455_900, True),
]
LAKESIDE_PCT = round(TOP_CUSTOMERS[0][2] / TOTAL_REV[2025] * 100, 2)   # 22.40
CIM_CONCENTRATION_CLAIM = 11
RECURRING_PCT = round(REVENUE[2025]["contract"] / TOTAL_REV[2025] * 100, 1)  # 52.0
CIM_RECURRING_CLAIM = 78

ROSTER_HEADCOUNT = 84
W2_HEADCOUNT = 71
CONTRACTOR_COUNT = 13

findings, controls, manifest = [], [], []


def F(fid, title, cls, sev, concl, srcs, anchor, excerpt, calc, conf, judgment, alts,
      discriminating=False, split="dev"):
    findings.append(dict(
        id=fid, title=title, classification=cls, severity=sev,
        expected_conclusion=concl, source_documents=srcs, anchor=anchor,
        supporting_excerpt=excerpt, calculation_required=calc,
        expected_confidence=conf, human_judgment_required=judgment,
        acceptable_alternative_interpretations=alts,
        cross_document_discriminating=discriminating, split=split))


def NC(cid, title, why_tempting, correct):
    controls.append(dict(id=cid, title=title, why_tempting=why_tempting,
                         correct_behavior=correct))


# ─────────────────────────────────────────────────────────────────────────────
# 2. Writers
# ─────────────────────────────────────────────────────────────────────────────

def _reg(relpath, status="processable", note=""):
    p = ROOT / relpath
    h = hashlib.sha256(p.read_bytes()).hexdigest()[:16]
    manifest.append(dict(path=relpath, sha256_16=h, bytes=p.stat().st_size,
                         format=p.suffix.lstrip(".").lower() or "none",
                         expected_processing_status=status, note=note,
                         generator_version=VERSION))


def wmd(relpath, title, body, status="processable", note=""):
    p = ROOT / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(f"<!-- {BANNER} -->\n\n# {title}\n\n{body.strip()}\n", encoding="utf-8")
    _reg(relpath, status, note)


def wtxt(relpath, body, status="processable", note=""):
    p = ROOT / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(f"{BANNER}\n\n{body.strip()}\n", encoding="utf-8")
    _reg(relpath, status, note)


def wcsv(relpath, header, rows, status="processable", note=""):
    p = ROOT / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    _reg(relpath, status, note)


def wxlsx(relpath, sheets, status="processable", note=""):
    p = ROOT / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook()
    wb.remove(wb.active)
    for name, header, rows in sheets:
        ws = wb.create_sheet(title=name[:31])
        ws.append([BANNER])
        ws.append(header)
        for r in rows:
            ws.append(list(r))
    wb.save(p)
    _reg(relpath, status, note)


def wpdf(relpath, title, blocks, scanned=False, status="processable", note=""):
    """blocks = list of pages; each page is a list of lines. Page numbers are 1-based."""
    p = ROOT / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    c = pdfcanvas.Canvas(str(p), pagesize=LETTER)
    W, H = LETTER
    for i, lines in enumerate(blocks, 1):
        c.setFont("Helvetica-Bold", 9)
        c.drawString(54, H - 40, BANNER)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(54, H - 66, title)
        c.setFont("Helvetica", 10)
        y = H - 96
        for ln in lines:
            c.drawString(54, y, ln[:104])
            y -= 14
            if y < 60:
                break
        c.setFont("Helvetica", 8)
        c.drawString(W - 110, 40, f"Page {i} of {len(blocks)}")
        c.showPage()
    c.save()
    if scanned:
        _degrade(p)
    _reg(relpath, status, note)


def _degrade(pdf_path):
    """Re-render page 1 as a noisy rotated image and wrap it — simulates a scan."""
    img = Image.new("L", (1275, 1650), 255)
    txt = Image.new("L", (1275, 1650), 255)
    from PIL import ImageDraw
    d = ImageDraw.Draw(txt)
    lines = pdf_path.with_suffix(".txtcache")
    body = lines.read_text().splitlines() if lines.exists() else ["SCANNED DOCUMENT"]
    y = 150
    for ln in body:
        d.text((110, y), ln[:88], fill=40)
        y += 26
    img.paste(txt, (0, 0))
    img = img.rotate(1.4, fillcolor=255, expand=False)
    img = img.filter(ImageFilter.GaussianBlur(0.7))
    px = img.load()
    for _ in range(90_000):
        x, yy = rng.randrange(img.width), rng.randrange(img.height)
        px[x, yy] = max(0, min(255, px[x, yy] + rng.randint(-70, 70)))
    img = img.resize((850, 1100)).convert("RGB")
    img.save(pdf_path, "PDF", resolution=110)
    if lines.exists():
        lines.unlink()


def scanned_pdf(relpath, title, lines, status="processable", note=""):
    p = ROOT / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    p.with_suffix(".txtcache").write_text("\n".join([title] + lines))
    wpdf(relpath, title, [lines], scanned=True, status=status, note=note)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Build the room
# ─────────────────────────────────────────────────────────────────────────────

def build():
    if ROOT.exists():
        shutil.rmtree(ROOT)
    ROOT.mkdir(parents=True)

    # ---- 00 Request list ---------------------------------------------------
    req_rows = [
        ("1.1", "Corporate formation documents", "01_Corporate", "Supplied"),
        ("1.2", "Ownership schedule / cap table", "01_Corporate", "Supplied"),
        ("1.3", "Member consents authorizing the transaction", "01_Corporate", "Supplied"),
        ("2.1", "FY2023 financial statements", "02_Financial", "Supplied"),
        ("2.2", "FY2024 financial statements", "02_Financial", "Not supplied"),
        ("2.3", "FY2025 financial statements", "02_Financial", "Supplied"),
        ("2.4", "Monthly P&L, trailing 36 months", "02_Financial", "Supplied"),
        ("2.5", "Trial balance", "02_Financial", "Supplied"),
        ("2.6", "AR and AP aging", "02_Financial", "Supplied"),
        ("2.7", "Debt schedule and credit agreement", "02_Financial", "Supplied"),
        ("3.1", "Customer master and revenue by customer", "03_Customers", "Supplied"),
        ("3.2", "Top customer contracts", "03_Customers", "Supplied"),
        ("3.3", "Customer churn log", "03_Customers", "Supplied"),
        ("4.1", "Vendor master and top vendor schedule", "04_Suppliers", "Supplied"),
        ("4.2", "Principal supplier agreements", "04_Suppliers", "Supplied"),
        ("5.1", "Employee roster", "05_Employees", "Supplied"),
        ("5.2", "Payroll summary", "05_Employees", "Supplied"),
        ("5.3", "Contractor schedule", "05_Employees", "Supplied"),
        ("6.1", "Fleet and equipment register", "06_Operations", "Supplied"),
        ("6.2", "Branch KPI reporting", "06_Operations", "Supplied"),
        ("7.1", "Litigation summary", "07_Legal_Insurance", "Supplied"),
        ("7.2", "Insurance certificates", "07_Legal_Insurance", "Supplied"),
        ("7.3", "Permits and licences", "07_Legal_Insurance", "Supplied"),
        ("8.1", "Tax filing acknowledgments", "08_Tax", "Supplied"),
        ("8.2", "Tax support workpapers", "08_Tax", "Supplied"),
        ("9.1", "Capex register", "09_Capex", "Supplied"),
        ("9.2", "Fixed asset register", "09_Capex", "Supplied"),
        ("10.1", "Seller Q&A log", "10_QA", "Supplied"),
        ("10.2", "Management presentation transcript", "10_QA", "Supplied"),
        ("10.3", "Environmental site assessment", "07_Legal_Insurance",
         "Not applicable — all facilities leased, landlord retains responsibility (buyer confirmed 2026-02-02)"),
    ]
    wcsv("00_Request_List/request_list.csv",
         ["item", "description", "expected_folder", "seller_status"], req_rows)
    wmd("00_Request_List/responsibility_matrix.md", "Diligence responsibility matrix", """
| Area | Owner | External |
| --- | --- | --- |
| Financial / quality of earnings | Buyer | Calloway & Reed CPAs |
| Legal, corporate, contracts | Counsel | Merritt Vance LLP |
| Commercial and customer | **Buyer (self-performed)** | — |
| Operations, fleet, facilities | **Buyer (self-performed)** | — |
| Insurance | Broker | Tri-State Risk Partners |
| Tax | Calloway & Reed CPAs | — |

Items marked self-performed are read by the buyer directly. This is the scope the
evidence register covers.
""")

    # ---- 01 Corporate ------------------------------------------------------
    wpdf("01_Corporate/Articles_of_Organization.pdf", "Articles of Organization", [[
        f"State of Ohio — Articles of Organization",
        f"Name of limited liability company: {CO}",
        "Effective date: March 14, 2011",
        "Registered agent: Corporate Agents of Ohio, Inc.",
        "Principal office: 4180 Commerce Parkway, Toledo, Ohio",
        "Purpose: industrial equipment maintenance, repair and related services.",
        "", "This is a fictional document generated for software evaluation.",
    ]])
    wcsv("01_Corporate/ownership_schedule.csv",
         ["member", "units", "pct", "entity_name_as_written"],
         [["Dale R. Ridgeway", 8200, "82.0", "Ridgeline Industrial Service LLC"],
          ["Marta Ridgeway", 1300, "13.0", "Ridgeline Industrial Service LLC"],
          ["K. Obuya (former CFO)", 500, "5.0", "Ridgeline Industrial Service LLC"]])
    wpdf("01_Corporate/Member_Consent_Transaction.pdf", "Written Consent of Members", [[
        "WRITTEN CONSENT OF THE MEMBERS",
        f"of {CO}",
        "Dated: January 12, 2026",
        "",
        "RESOLVED, that the sale of substantially all assets of the Company",
        "is authorized on the terms presented to the Members.",
        "", "", "_______________________________",
        "Dale R. Ridgeway, Managing Member",
        "",
        "_______________________________",
        "Marta Ridgeway, Member       [ SIGNATURE BLOCK BLANK ]",
        "",
        "_______________________________",
        "K. Obuya, Member             [ SIGNATURE BLOCK BLANK ]",
    ]])

    # ---- 02 Financial ------------------------------------------------------
    for y in (2023, 2025):
        r = REVENUE[y]
        tot = TOTAL_REV[y]
        cogs = int(tot * 0.685)
        wpdf(f"02_Financial/Income_Statement_FY{y}.pdf", f"Income Statement FY{y}", [[
            f"{CO}", f"Statement of Operations — fiscal year ended December 31, {y}", "",
            f"  Contract service revenue            {r['contract']:>14,}",
            f"  Time and materials revenue          {r['tm']:>14,}",
            f"  Equipment sales                     {r['equipment']:>14,}",
            f"  Total revenue                       {tot:>14,}", "",
            f"  Cost of revenue                     {cogs:>14,}",
            f"  Gross profit                        {tot - cogs:>14,}",
            f"  Operating expenses                  {int(tot * 0.20):>14,}",
            f"  Operating income                    {tot - cogs - int(tot * 0.20):>14,}",
        ]])
    wpdf("02_Financial/Balance_Sheet_FY2025.pdf", "Balance Sheet FY2025", [[
        f"{CO} — Balance sheet as of December 31, 2025", "",
        f"  Cash                                       412,000",
        f"  Accounts receivable, net             {AR_TOTAL:>14,}",
        f"  Unbilled work in process             {WIP_2025:>14,}",
        f"  Inventory                                1,140,000",
        f"  Net property and equipment               3,880,000",
        "",
        f"  Accounts payable                         1,905,000",
        f"  Line of credit                           1,250,000",
        f"  Term debt, current and long term         4,610,000",
    ], [
        "Selected notes", "",
        f"  Unbilled work in process, December 31, 2024   {WIP_2024:>12,}",
        f"  Unbilled work in process, December 31, 2025   {WIP_2025:>12,}",
        "  Revenue recognition: equipment sales are recorded when a customer",
        "  purchase order is accepted and the order is entered.",
    ]])
    months = [f"{y}-{m:02d}" for y in (2023, 2024, 2025) for m in range(1, 13)]
    mrows = []
    for i, mo in enumerate(months):
        y = int(mo[:4])
        base = TOTAL_REV[y] / 12
        f_ = 1 + (0.09 * ((i % 12) - 5.5) / 5.5)
        rev = int(base * f_)
        mrows.append([mo, rev, int(rev * 0.685), int(rev * 0.315)])
    wxlsx("02_Financial/monthly_income_statement.xlsx",
          [("Monthly", ["period", "revenue", "cost_of_revenue", "gross_profit"], mrows)])
    tb = []
    for br, _ in BRANCHES:
        rv = BRANCH_REV_2025[br]
        cg = FTW_COGS_2025 if br == "FTW" else int(rv * 0.685)
        tb += [[f"JE-{br}-4000", "4000", "Service revenue", br, "2025-12-31", 0, rv],
               [f"JE-{br}-5000", "5000", "Cost of revenue", br, "2025-12-31", cg, 0]]
    tb += [["JE-TOL-6100", "6100", "Payroll", "TOL", "2025-11-30", 318_400, 0],
           ["JE-TOL-6100", "6100", "Payroll", "TOL", "2025-11-30", 318_400, 0],
           ["JE-FTW-6100", "6100", "Payroll", "FTW", "2025-11-30", 141_950, 0],
           ["JE-ERI-6205", "6205", "Fuel", "ERI", "2025-10-31", 22_310, 0],
           ["JE-ERI-6206", "6206", "Fuel", "ERI", "2025-10-31", 22_310, 0]]
    wcsv("02_Financial/trial_balance.csv",
         ["journal_id", "account", "account_name", "branch", "period", "debit", "credit"], tb)
    ar = [["INV-24118", "000742", "Consolidated Foundry Group", 341_200, 118],
          ["INV-24377", "000418", "Lakeside Steel Processing Co.", 96_400, 104],
          ["INV-24512", "000119", "Bayfield Paper Mills", 88_300, 96],
          ["INV-24555", "000905", "Northgate Plastics", 86_500, 92],
          ["INV-25001", "000418", "Lakeside Steel Processing Co.", 612_000, 44],
          ["INV-25044", "000377", "Maumee Chemical", 318_000, 31],
          ["INV-25102", "000550", "Sandusky Marine Works", 214_900, 22],
          ["INV-25166", "001233", "Erie Valley Grain", 180_400, 17],
          ["INV-25201", "000861", "Fort Wayne Castings", 402_300, 12],
          ["INV-25233", "000119", "Bayfield Paper Mills", 511_000, 8],
          ["INV-25240", "000742", "Consolidated Foundry Group", 550_000, 6]]
    ar[-1][3] += AR_TOTAL - sum(r[3] for r in ar)   # tie the detail to the balance sheet
    assert sum(r[3] for r in ar) == AR_TOTAL
    assert sum(r[3] for r in ar if r[4] > 90) == AR_OVER_90
    wcsv("02_Financial/ar_aging.csv",
         ["invoice_id", "customer_id", "customer", "amount", "days_outstanding"], ar)
    wcsv("02_Financial/ap_aging.csv", ["vendor_id", "vendor", "amount", "days_outstanding"],
         [["V-0031", "Hartwell Supply Company", 704_000, 38],
          ["V-0088", "Great Lakes Fleet Leasing", 121_400, 22],
          ["V-0142", "Toledo Industrial Gas", 61_900, 15]])
    wcsv("02_Financial/debt_schedule.csv",
         ["lender", "instrument", "balance", "rate", "maturity", "covenants"],
         [["Fifth Meridian Bank", "Term loan A", 3_360_000, "7.25%", "2029-06-30",
           "Fixed charge coverage ratio not less than 1.25x, tested annually"],
          ["Fifth Meridian Bank", "Revolving line", 1_250_000, "8.10%", "2027-06-30",
           "Same covenant package as Term loan A"],
          ["Great Lakes Fleet Leasing", "Equipment notes", 1_250_000, "6.90%", "2028-03-31",
           "Cross-default with senior facility"]])
    wpdf("02_Financial/Covenant_Compliance_Certificate_FY2025.pdf",
         "Covenant Compliance Certificate", [[
             f"{CO} — annual compliance certificate, fiscal year 2025", "",
             f"  Adjusted EBITDA                      {ADJ_EBITDA_2025:>12,}",
             f"  Less maintenance capital expenditure {MAINT_CAPEX:>12,}",
             f"  Cash available for fixed charges     {ADJ_EBITDA_2025 - MAINT_CAPEX:>12,}",
             f"  Total fixed charges (P&I)            {DEBT_SERVICE:>12,}",
             "",
             f"  Fixed charge coverage ratio                 {FCCR:.2f}x",
             "  Required minimum under Section 6.11         1.25x",
             "",
             "  Officer certification: the Company has reviewed the covenant",
             "  calculations set out above for the period then ended.",
         ]])

    # ---- 03 Customers ------------------------------------------------------
    cust, rev_rows = [], []
    for name, cid, amt, has_k in TOP_CUSTOMERS:
        cust.append([cid, name, "Active", "Yes" if has_k else "No",
                     "TOL" if amt > 900_000 else "FTW"])
        rev_rows.append([cid.lstrip("0"), name, amt, round(amt / TOTAL_REV[2025] * 100, 2)])
    # The tail must sum EXACTLY to the model remainder. Jitter is applied, then the
    # final customer absorbs the rounding residual, so the schedule ties to the
    # income statement. Unplanted inconsistencies are defects, not realism.
    rest_total = TOTAL_REV[2025] - sum(c[2] for c in TOP_CUSTOMERS)
    tail = [int(rest_total / 134) + rng.randint(-9_000, 9_000) for _ in range(134)]
    tail[-1] += rest_total - sum(tail)
    for i, amt in enumerate(tail):
        cid = f"{1400 + i * 7:06d}"
        cust.append([cid, f"Customer {i + 9:03d} Industrial", "Active", "No",
                     rng.choice(["TOL", "FTW", "ERI"])])
        rev_rows.append([cid.lstrip("0"), f"Customer {i + 9:03d} Industrial", amt,
                         round(amt / TOTAL_REV[2025] * 100, 2)])
    cust.append(["000990", "Wexford Tube (churned 2025-04)", "Inactive", "No", "ERI"])
    rev_rows.append(["990", "Wexford Tube (churned 2025-04)", 0, 0.0])
    wcsv("03_Customers/customer_master.csv",
         ["customer_id", "customer_name", "status", "under_contract", "branch"], cust)
    wxlsx("03_Customers/Revenue_by_Customer_FY25.xlsx",
          [("FY25", ["customer_id", "customer_name", "fy25_revenue", "pct_of_total"], rev_rows)])
    v2 = [r[:] for r in rev_rows]
    v2[2][2] = v2[2][2] - 118_000
    wxlsx("03_Customers/Revenue_by_Customer_FY25_v2.xlsx",
          [("FY25", ["customer_id", "customer_name", "fy25_revenue", "pct_of_total"], v2)])
    wpdf("03_Customers/Lakeside_Master_Service_Agreement.pdf",
         "Master Service Agreement — Lakeside Steel Processing Co.", [[
             "MASTER SERVICE AGREEMENT", f"between {CO} and Lakeside Steel Processing Co.",
             "Effective January 1, 2024. Initial term three years.", "",
             "Section 3. Scope of services. Preventive and corrective maintenance",
             "of the customer's rolling and handling equipment at the Perrysburg works.", "",
             "Section 9. Pricing. Fixed monthly fee subject to annual adjustment.",
         ], [
             "Section 14. Assignment and change of control.", "",
             "14.1 Neither party may assign this Agreement without the prior written",
             "consent of the other party.", "",
             "14.2 A change in the direct or indirect beneficial ownership of more",
             "than fifty percent (50%) of the voting interests of Provider shall be",
             "deemed an assignment for purposes of Section 14.1 and shall require the",
             "prior written consent of Customer, which consent may be withheld in",
             "Customer's sole discretion.", "",
             "14.3 Customer may terminate on thirty (30) days notice if consent under",
             "Section 14.2 is not obtained prior to the change of control.",
         ]])
    wpdf("03_Customers/Northgate_Service_Agreement.pdf",
         "Service Agreement — Northgate Plastics", [[
             "SERVICE AGREEMENT — Northgate Plastics", "Effective March 1, 2023.", "",
             "Section 7. Pricing is set out in Exhibit A, attached and incorporated.",
             "Section 8. Term: three years, renewing annually unless either party",
             "gives written notice not less than sixty (60) days before expiry.",
         ]])
    wtxt("03_Customers/Northgate_Exhibit_A_Pricing.txt", """
EXHIBIT A — PRICING SCHEDULE
Northgate Plastics service agreement, effective March 1, 2023.

  Preventive maintenance, per visit         1,850
  Emergency callout, per hour                 195
  Parts                                cost + 18%
""")
    wcsv("03_Customers/churn_log.csv", ["customer_id", "customer", "last_invoice", "reason"],
         [["000990", "Wexford Tube", "2025-04-18", "Plant closure"],
          ["001402", "Custom 021 Industrial", "2025-08-02", "Price"]])

    # ---- 04 Suppliers ------------------------------------------------------
    wcsv("04_Suppliers/vendor_master.csv", ["vendor_id", "vendor", "category", "fy25_spend"],
         [["V-0031", "Hartwell Supply Company", "Parts distribution", HARTWELL_SPEND],
          ["V-0088", "Great Lakes Fleet Leasing", "Fleet", 512_000],
          ["V-0142", "Toledo Industrial Gas", "Consumables", 288_400],
          ["V-0199", "Bay Bearing & Drive", "Parts distribution", 401_600],
          ["V-0210", "Sandpiper Safety", "PPE", 96_300]])
    wtxt("04_Suppliers/top_vendor_schedule.txt", f"""
TOP VENDOR SCHEDULE — FY2025

Total parts cost of revenue                        {PARTS_COGS:,}
  Hartwell Supply Company                          {HARTWELL_SPEND:,}
  Bay Bearing & Drive                                401,600
  All other parts vendors                          {PARTS_COGS - HARTWELL_SPEND - 401_600:,}
""")
    wpdf("04_Suppliers/Hartwell_Distribution_Agreement.pdf",
         "Distribution Agreement — Hartwell Supply Company", [[
             "DISTRIBUTION AGREEMENT", f"between Hartwell Supply Company and {CO}",
             "Effective July 1, 2022.", "",
             "Section 4. Pricing. Distributor pricing is set out in Exhibit B,",
             "attached hereto and incorporated by reference.", "",
             "Section 11. Term and termination.",
             "11.2 Either party may terminate this Agreement for convenience upon",
             "sixty (60) days prior written notice to the other party.",
         ]])

    # ---- 05 Employees ------------------------------------------------------
    roles = ["Field technician", "Senior technician", "Branch manager", "Dispatcher",
             "Estimator", "Administrator", "Warehouse"]
    roster = []
    for i in range(ROSTER_HEADCOUNT):
        eid = f"E-{1000 + i:04d}"
        hire = "" if i in (12, 33, 51, 70) else str(date(2012, 1, 1) + timedelta(days=rng.randrange(4600)))
        roster.append([eid, f"Employee {i + 1:03d}", rng.choice(roles),
                       rng.choice([b for b, _ in BRANCHES]), hire, "Active"])
    roster[40][0] = roster[7][0]
    roster[62][0] = roster[19][0]
    wxlsx("05_Employees/employee_roster.xlsx",
          [("Roster", ["employee_id", "name", "role", "branch", "hire_date", "status"], roster)])
    wtxt("05_Employees/payroll_summary.txt", f"""
PAYROLL SUMMARY — FY2025 (W-2 employees only)

  Total W-2 employees at December 31, 2025           {W2_HEADCOUNT}
  Gross wages                                        6,214,900
  Employer taxes and benefits                        1,402,300

Contract labour is not included in this summary. See contractor schedule.
""")
    wcsv("05_Employees/contractor_schedule.csv",
         ["contractor_id", "name", "role_performed", "branch", "fy25_paid", "form"],
         [[f"C-{200 + i:03d}", f"Contractor {i + 1:02d}",
           "Field technician" if i < 10 else "Senior technician",
           rng.choice([b for b, _ in BRANCHES]), rng.randint(48_000, 96_000), "1099-NEC"]
          for i in range(CONTRACTOR_COUNT)])
    wmd("05_Employees/org_chart.md", "Organization chart", """
- Dale R. Ridgeway — Managing Member
  - Operations Director
    - Toledo branch manager
    - Fort Wayne branch manager
    - **Erie branch — reports to Fort Wayne branch manager (shared role since 2024)**
  - Controller
  - Sales Manager
""")

    # ---- 06 Operations -----------------------------------------------------
    wcsv("06_Operations/fleet_equipment.csv",
         ["asset_id", "description", "branch", "year", "in_service_date"],
         [[f"A-{300 + i:04d}", rng.choice(["Service van", "Box truck", "Crane truck", "Trailer"]),
           rng.choice([b for b, _ in BRANCHES]), rng.randint(2013, 2025),
           str(date(2013, 1, 1) + timedelta(days=rng.randrange(4300)))] for i in range(38)])
    wpdf("06_Operations/Branch_KPI_Deck_FY2025.pdf", "Branch KPI Reporting FY2025", [[
        "BRANCH PERFORMANCE — FISCAL YEAR 2025", "",
        f"  Toledo         revenue {BRANCH_REV_2025['TOL']:>12,}   gross margin  31.5%",
        f"  Fort Wayne     revenue {BRANCH_REV_2025['FTW']:>12,}   gross margin  34.2%",
        f"  Erie           revenue {BRANCH_REV_2025['ERI']:>12,}   gross margin  29.8%", "",
        "  Recurring contract revenue as a share of total          78%",
        "  Customer count, active                                   142",
    ]])
    wtxt("06_Operations/kpi_definitions.txt", """
KPI DEFINITIONS

Active customer   A customer invoiced at least once in the trailing twelve months.
All customers     Every customer record, including inactive and churned accounts.
                  The customer master contains 143 records; 142 are active.
Recurring revenue Management reports recurring revenue as contracted maintenance
                  plus time-and-materials work from customers holding a contract.
Gross margin      Revenue less cost of revenue, by branch, per branch reporting.
""")
    wtxt("06_Operations/wip_schedule.txt", f"""
UNBILLED WORK IN PROCESS

  December 31, 2024                {WIP_2024:>12,}
  December 31, 2025                {WIP_2025:>12,}
  Change                           {WIP_2025 - WIP_2024:>12,}   ({(WIP_2025 / WIP_2024 - 1) * 100:.1f}%)
""")

    # ---- 07 Legal and insurance -------------------------------------------
    wpdf("07_Legal_Insurance/Litigation_Summary.pdf", "Litigation Summary", [[
        f"{CO} — litigation summary", "Prepared February 2026", "",
        "There are no pending or threatened legal proceedings, arbitrations, or",
        "material claims against the Company as of the date of this summary.",
    ]])
    wtxt("07_Legal_Insurance/legal_invoice_2025-11.txt", """
MERRITT VANCE LLP — invoice 2025-11-0442
Client: Ridgeline Industrial Services, LLC

  11/04  Review of Mercer arbitration demand and response strategy      3.4 hrs
  11/12  Correspondence with opposing counsel, Mercer matter            1.1 hrs
  11/21  General corporate                                              0.062 hrs
                                                          Total due   $ 4,820.00
""")
    wcsv("07_Legal_Insurance/insurance_certificates.csv",
         ["policy_type", "carrier", "policy_number", "effective", "expiry", "limit"],
         [["General liability", "Tri-State Casualty", "GL-88421", "2025-01-15", "2026-01-15", 2_000_000],
          ["Commercial auto", "Tri-State Casualty", "CA-11907", "2025-01-15", "2026-01-15", 1_000_000],
          ["Umbrella", "Keystone Surplus", "UM-40311", "2025-01-15", "2026-01-15", 5_000_000],
          ["Workers compensation", "Ohio BWC", "WC-772140", "2025-07-01", "2026-07-01", 1_000_000]])
    wtxt("07_Legal_Insurance/insurance_renewal_notice.txt", """
TRI-STATE RISK PARTNERS — renewal confirmation

General liability policy GL-88421 and commercial auto policy CA-11907 have been
renewed for the period 2026-01-15 to 2027-01-15 on substantially the same terms.
Renewal certificates will follow under separate cover.

The umbrella policy UM-40311 is NOT included in this renewal confirmation.
""")
    wmd("07_Legal_Insurance/Facility_Lease_Erie.md", "Facility lease — Erie, PA", """
**Landlord:** Harborline Properties LLC
**Tenant:** Ridgeline Industrial Services, LLC
**Premises:** 812 Bayfront Industrial Drive, Erie, Pennsylvania

- **Commencement:** December 1, 2020
- **Expiry:** November 30, 2025
- **Renewal options:** none
- **Holdover:** month-to-month at 125% of the last base rent

*Landlord retains responsibility for environmental compliance of the premises
under Section 12.*
""")
    wmd("07_Legal_Insurance/Facility_Lease_Toledo.md", "Facility lease — Toledo, OH", """
**Premises:** 4180 Commerce Parkway, Toledo, Ohio
- **Commencement:** June 1, 2019
- **Expiry:** May 31, 2029
- **Renewal options:** one five-year option at market
""")
    scanned_pdf("07_Legal_Insurance/Erie_Operating_Permit_scan.pdf",
                "City of Erie — Operating Permit", [
                    "Permit number ERI-2024-11882",
                    "Issued to Ridgeline Industrial Services LLC",
                    "Premises 812 Bayfront Industrial Drive",
                    "Valid through December 31, 2026",
                    "Classification: light industrial service",
                ], note="Deliberately degraded scan; low OCR confidence expected")

    # ---- 08 Tax ------------------------------------------------------------
    wtxt("08_Tax/filing_acknowledgments.txt", """
FEDERAL AND STATE FILING ACKNOWLEDGMENTS

  FY2023  Form 1065 accepted 2024-04-02   confirmation 8841-2024-0402
  FY2024  Form 1065 accepted 2025-03-28   confirmation 8841-2025-0328
  FY2025  Form 1065 accepted 2026-03-31   confirmation 8841-2026-0331
""")
    # A genuinely password-protected archive. It must actually fail to open, or the
    # unreviewed-vs-missing trap (RDG-021) is not testable.
    zp = ROOT / "08_Tax/Tax_Support_2023-2025.zip"
    zp.parent.mkdir(parents=True, exist_ok=True)
    stage = ROOT / "08_Tax/_stage"
    stage.mkdir(exist_ok=True)
    (stage / "workpapers.txt").write_text(
        f"{BANNER}\nTax support workpapers, FY2023-FY2025. Fictional placeholder.\n")
    subprocess.run(["zip", "-q", "-j", "-P", "ridgeline-2026", str(zp),
                    str(stage / "workpapers.txt")], check=True)
    shutil.rmtree(stage)
    try:                                # verify the trap actually works
        zipfile.ZipFile(zp).read("workpapers.txt")
        raise SystemExit("FIXTURE DEFECT: tax archive opened without a password")
    except RuntimeError:
        pass
    _reg("08_Tax/Tax_Support_2023-2025.zip", "unprocessable",
         "Encrypted archive. Expected disposition is UNREVIEWED, not MISSING.")

    # ---- 09 Capex ----------------------------------------------------------
    wcsv("09_Capex/capex_register.csv", ["date", "description", "branch", "amount"],
         [["2025-02-11", "Service van, unit 41", "TOL", 61_400],
          ["2025-04-03", "Service van, unit 42", "TOL", 62_100],
          ["2025-06-19", "Box truck, unit 43", "FTW", 118_900],
          ["2025-09-02", "Service van, unit 44", "ERI", 63_200],
          ["2025-11-14", "Trailer, unit 45", "ERI", 181_400]])
    wcsv("09_Capex/fixed_asset_register.csv",
         ["asset_id", "description", "in_service", "cost", "fy_added"],
         [["A-0341", "Service van, unit 41", "2025-02-20", 61_400, 2025],
          ["A-0342", "Service van, unit 42", "2025-04-15", 62_100, 2025],
          ["A-0343", "Box truck, unit 43", "2025-07-01", 188_500, 2025]])
    wtxt("09_Capex/maintenance_backlog.txt", """
DEFERRED MAINTENANCE BACKLOG — reported by branch managers, December 2025

  Toledo        fleet servicing overdue on 4 units          est. 38,000
  Fort Wayne    shop crane recertification                  est. 12,500
  Erie          roof repair (landlord responsibility)       est.      0
""")

    # ---- 10 Q&A ------------------------------------------------------------
    wcsv("10_QA/seller_qa_log.csv", ["item", "question", "seller_response", "date"],
         [["Q-011", "Please confirm customer concentration for FY2025.",
           "No single customer exceeds 11% of revenue in FY2025.", "2026-02-04"],
          ["Q-014", "Are there collection issues in accounts receivable?",
           "No. There are no collection issues; aging is normal for the industry.", "2026-02-04"],
          ["Q-019", "Confirm all facility leases and remaining terms.",
           "All three facilities are leased through 2028 or later.", "2026-02-06"],
          ["Q-022", "Are any employees classified as contractors?",
           "All field staff are employees of the Company.", "2026-02-06"],
          ["Q-027", "Please provide FY2024 financial statements.",
           "Will follow.", "2026-02-07"]])
    wmd("10_QA/management_meeting_transcript.md", "Management meeting transcript", """
*Recorded February 9, 2026. Participants: D. Ridgeway (Seller), buyer, buyer's adviser.*

**Buyer:** Talk me through the revenue mix.

**Ridgeway:** About three quarters of it is recurring — call it 78 percent. Once a
plant is on a maintenance agreement they very rarely leave.

**Buyer:** And the biggest account?

**Ridgeway:** Lakeside is the biggest by some way. They've grown a lot the last two
years. I'd have to look at the exact number but it's comfortably inside where you'd
want it to be.

**Buyer:** Anything on the legal side?

**Ridgeway:** Nothing pending. We had a supplier disagreement a while back, Mercer,
but that's with the lawyers and it's nothing.

**Buyer:** Erie facility — how long is that lease?

**Ridgeway:** All the leases run out past 2028.
""")
    wmd("10_QA/qoe_notes_draft.md", "Quality of earnings — draft notes", """
*Calloway & Reed CPAs. Draft, not for reliance. Fictional document.*

Adjusted EBITDA bridge, FY2025:

| | |
| --- | ---: |
| Operating income | 1,420,000 |
| Owner compensation above market | 340,000 |
| Non-recurring legal | 68,000 |
| Personal vehicle and travel | 52,000 |
| One-time ERP implementation | 70,000 |
| **Adjusted EBITDA** | **1,950,000** |

Scope note: this draft covers financial statement earnings quality only. Contract
terms, customer concentration, insurance, employment classification, and legal
matters are outside the scope of this engagement.
""")

    # ---- 11 Update R2 ------------------------------------------------------
    wtxt("11_Update_R2/withdrawal_notice.txt", """
NOTICE OF DOCUMENT WITHDRAWAL — 2026-02-16

The file 03_Customers/Revenue_by_Customer_FY25_v2.xlsx has been withdrawn by the
seller. The FY25 revenue-by-customer schedule of record is the original file.
No replacement is provided.
""")
    wtxt("11_Update_R2/Hartwell_Exhibit_B_Pricing.txt", """
EXHIBIT B — DISTRIBUTOR PRICING
To the Distribution Agreement dated July 1, 2022 between Hartwell Supply Company
and RIDGELINE INDUSTRIAL SERVICES OF OHIO, LLC.

  Tier 1 parts        list less 34%
  Tier 2 parts        list less 22%
  Freight             prepaid and added
""")
    wcsv("11_Update_R2/seller_qa_log_revised.csv",
         ["item", "question", "seller_response", "date"],
         [["Q-011", "Please confirm customer concentration for FY2025.",
           "Corrected: largest customer is approximately 22% of FY2025 revenue.", "2026-02-16"],
          ["Q-027", "Please provide FY2024 financial statements.",
           "Not available in final form; management accounts only.", "2026-02-16"]])
    wtxt("11_Update_R2/README_update.txt", """
ROOM UPDATE R2 — 2026-02-16

Added:      Hartwell_Exhibit_B_Pricing.txt, seller_qa_log_revised.csv
Withdrawn:  Revenue_by_Customer_FY25_v2.xlsx (see withdrawal notice)
Unchanged:  all other folders
""")

    # ---- 15 Bulk (realistic volume, low value) -----------------------------
    for i in range(58):
        wtxt(f"12_Routine/invoice_{25000 + i}.txt", f"""
INVOICE {25000 + i}
Customer: Customer {i + 9:03d} Industrial
Date: 2025-{(i % 12) + 1:02d}-{(i % 27) + 1:02d}
Service: scheduled preventive maintenance visit
Amount: {rng.randint(1200, 9800):,}
""")
    for i in range(12):
        wtxt(f"12_Routine/purchase_order_{7100 + i}.txt", f"""
PURCHASE ORDER {7100 + i}
Vendor: Hartwell Supply Company
Date: 2025-{(i % 12) + 1:02d}-14
Parts order, branch {rng.choice([b for b, _ in BRANCHES])}
Amount: {rng.randint(4000, 48000):,}
""")

    # ── Findings ────────────────────────────────────────────────────────────
    F("RDG-001", "Customer concentration materially understated", "cross_document_contradiction",
      "Critical",
      f"Largest customer is {LAKESIDE_PCT}% of FY2025 revenue; the CIM and the seller Q&A "
      f"both state no customer exceeds {CIM_CONCENTRATION_CLAIM}%.",
      ["10_QA/seller_qa_log.csv", "03_Customers/Revenue_by_Customer_FY25.xlsx",
       "06_Operations/Branch_KPI_Deck_FY2025.pdf"],
      "seller_qa_log.csv row Q-011; Revenue_by_Customer_FY25.xlsx sheet FY25 row 3",
      "No single customer exceeds 11% of revenue in FY2025.", True, "high", False,
      ["Different period definition — rebutted: both sources state FY2025."],
      discriminating=True)
    F("RDG-002", "Change-of-control consent required by largest customer", "direct_fact",
      "Critical",
      "The Lakeside master service agreement deems a >50% ownership change an assignment "
      "requiring prior written consent, which may be withheld at the customer's sole "
      "discretion, with a 30-day termination right. Not disclosed elsewhere in the room.",
      ["03_Customers/Lakeside_Master_Service_Agreement.pdf"],
      "page 2, Section 14.2–14.3",
      "shall require the prior written consent of Customer, which consent may be withheld",
      False, "high", False,
      ["Whether the clause is enforceable is a legal question and out of scope."],
      discriminating=True)
    F("RDG-003", "Fixed charge coverage covenant not met", "deterministic_calculation",
      "Critical",
      f"FCCR computes to {FCCR:.2f}x against a 1.25x minimum in the credit agreement.",
      ["02_Financial/Covenant_Compliance_Certificate_FY2025.pdf", "02_Financial/debt_schedule.csv"],
      "Covenant certificate page 1; debt_schedule.csv rows 1–2",
      f"Fixed charge coverage ratio {FCCR:.2f}x / Required minimum under Section 6.11 1.25x",
      True, "high", False,
      ["A waiver may exist but none is in the room — report as unresolved if asserted."],
      discriminating=True)
    F("RDG-004", "Recurring revenue share unsupported as stated", "unresolved_ambiguity",
      "High",
      f"Management reports 78% recurring. Contracted maintenance revenue is "
      f"{RECURRING_PCT}% of FY2025 revenue. The KPI definitions note shows the 78% "
      f"figure includes T&M work from contract-holding customers. Report as a definition "
      f"difference, NOT as an error.",
      ["06_Operations/Branch_KPI_Deck_FY2025.pdf", "06_Operations/kpi_definitions.txt",
       "02_Financial/Income_Statement_FY2025.pdf"],
      "KPI deck page 1 line 7; kpi_definitions.txt 'Recurring revenue'",
      "Recurring revenue as a share of total 78%", True, "medium", True,
      ["Both figures are defensible under their stated definitions. The finding is the "
       "ambiguity, not a misstatement."])
    F("RDG-005", "Erie lease expired; premises held over month-to-month", "cross_document_contradiction",
      "High",
      "The Erie lease expired 2025-11-30 with no renewal option. Seller Q&A Q-019 and the "
      "management transcript both state all leases run through 2028 or later.",
      ["07_Legal_Insurance/Facility_Lease_Erie.md", "10_QA/seller_qa_log.csv",
       "10_QA/management_meeting_transcript.md"],
      "Facility_Lease_Erie.md 'Expiry' line; seller_qa_log.csv row Q-019",
      "Expiry: November 30, 2025 / Renewal options: none", False, "high", False,
      ["A renewal may have been executed and not supplied — then it is also a missing document."],
      discriminating=True)
    F("RDG-006", "Aged receivables concentrated in one customer", "deterministic_calculation",
      "High",
      f"${AR_OVER_90:,} of ${AR_TOTAL:,} receivables is over 90 days "
      f"({AR_OVER_90 / AR_TOTAL * 100:.1f}%), of which ${FOUNDRY_OVER_90:,} is a single "
      f"customer at 118 days. Seller Q&A states there are no collection issues.",
      ["02_Financial/ar_aging.csv", "10_QA/seller_qa_log.csv"],
      "ar_aging.csv rows 1–4; seller_qa_log.csv row Q-014",
      "There are no collection issues; aging is normal for the industry.", True, "high", False,
      ["A reserve may exist in the balance sheet; AR is stated net."])
    F("RDG-007", "Field staff classified as contractors contrary to Q&A", "cross_document_contradiction",
      "High",
      f"Roster shows {ROSTER_HEADCOUNT} people; payroll summary shows {W2_HEADCOUNT} W-2 "
      f"employees; a contractor schedule lists {CONTRACTOR_COUNT} 1099 personnel performing "
      f"field technician work. Seller Q&A states all field staff are employees.",
      ["05_Employees/employee_roster.xlsx", "05_Employees/payroll_summary.txt",
       "05_Employees/contractor_schedule.csv", "10_QA/seller_qa_log.csv"],
      "payroll_summary.txt line 3; contractor_schedule.csv rows 1–13; seller_qa_log.csv Q-022",
      "All field staff are employees of the Company.", True, "high", True,
      ["Worker classification is a legal and tax determination and is out of scope. "
       "Report the inconsistency only."],
      discriminating=True)
    F("RDG-008", "Single-supplier dependency with 60-day termination", "direct_fact", "High",
      f"Hartwell Supply is {HARTWELL_SPEND / PARTS_COGS * 100:.1f}% of parts cost of revenue "
      f"and may terminate for convenience on 60 days notice.",
      ["04_Suppliers/top_vendor_schedule.txt", "04_Suppliers/Hartwell_Distribution_Agreement.pdf"],
      "top_vendor_schedule.txt lines 3–4; Hartwell agreement page 1 Section 11.2",
      "Either party may terminate this Agreement for convenience upon sixty (60) days",
      True, "high", False, ["Alternate distributors may exist; not evidenced in the room."])
    F("RDG-009", "Unbilled work in process grew far faster than revenue", "deterministic_calculation",
      "High",
      f"WIP rose from ${WIP_2024:,} to ${WIP_2025:,} ({(WIP_2025 / WIP_2024 - 1) * 100:.1f}%) "
      f"while revenue grew {(TOTAL_REV[2025] / TOTAL_REV[2024] - 1) * 100:.1f}%.",
      ["06_Operations/wip_schedule.txt", "02_Financial/Balance_Sheet_FY2025.pdf"],
      "wip_schedule.txt lines 3–5; balance sheet page 2 notes", "Change 610,000 (148.8%)",
      True, "high", False,
      ["A large project in progress at year end could explain it; no such project is evidenced."])
    F("RDG-010", "Umbrella policy expiring with no renewal evidence", "missing_document", "Medium",
      "Umbrella policy UM-40311 expires 2026-01-15. The renewal confirmation covers GL and "
      "auto and explicitly excludes the umbrella. No renewal certificate is in the room.",
      ["07_Legal_Insurance/insurance_certificates.csv",
       "07_Legal_Insurance/insurance_renewal_notice.txt"],
      "insurance_certificates.csv row 3; insurance_renewal_notice.txt final line",
      "The umbrella policy UM-40311 is NOT included in this renewal confirmation.",
      False, "high", False, ["It may have been renewed and simply not supplied."])
    F("RDG-011", "Litigation summary contradicted by counsel invoice", "cross_document_contradiction",
      "Medium",
      "The litigation summary states no pending matters. A November 2025 legal invoice bills "
      "time on a 'Mercer arbitration', and the management transcript refers to it.",
      ["07_Legal_Insurance/Litigation_Summary.pdf",
       "07_Legal_Insurance/legal_invoice_2025-11.txt", "10_QA/management_meeting_transcript.md"],
      "Litigation_Summary.pdf page 1; legal_invoice_2025-11.txt lines 4–5",
      "Review of Mercer arbitration demand and response strategy", False, "high", False,
      ["The matter may have concluded between the invoice and the summary date."],
      discriminating=True)
    F("RDG-012", "Capex and fixed asset registers disagree", "cross_document_contradiction",
      "Medium",
      "Capex register lists 5 FY2025 vehicle additions totalling $487,000; the fixed asset "
      "register shows 3 additions totalling $312,000. One asset is also recorded at two "
      "different costs.",
      ["09_Capex/capex_register.csv", "09_Capex/fixed_asset_register.csv"],
      "capex_register.csv rows 1–5; fixed_asset_register.csv rows 1–3",
      "Box truck, unit 43 — 118,900 (capex) vs 188,500 (fixed asset)", True, "high", False,
      ["Timing: assets ordered in FY2025 may be placed in service in FY2026."])
    F("RDG-013", "Two revenue schedules with different totals", "stale_version", "Medium",
      "Two FY25 revenue-by-customer workbooks differ by $118,000 on one customer with no "
      "revision marks or dates. R2 later withdraws the v2 file.",
      ["03_Customers/Revenue_by_Customer_FY25.xlsx",
       "03_Customers/Revenue_by_Customer_FY25_v2.xlsx", "11_Update_R2/withdrawal_notice.txt"],
      "both workbooks sheet FY25 row 4", "Bayfield Paper Mills 1,204,900 vs 1,086,900",
      True, "high", False,
      ["After R2 the original is the schedule of record; before R2 it is genuinely ambiguous."])
    F("RDG-014", "FY2024 financial statements not supplied", "missing_document", "Medium",
      "Request item 2.2 asks for FY2024 statements. They are absent, and the seller Q&A "
      "response is 'Will follow'. R2 states they are not available in final form.",
      ["00_Request_List/request_list.csv", "10_QA/seller_qa_log.csv",
       "11_Update_R2/seller_qa_log_revised.csv"],
      "request_list.csv row 2.2; seller_qa_log_revised.csv row Q-027",
      "Not available in final form; management accounts only.", False, "high", False,
      ["Management accounts may be acceptable; that is a buyer decision."])
    F("RDG-015", "Referenced Exhibit B absent from baseline room", "not_found", "Medium",
      "The Hartwell agreement incorporates Exhibit B pricing by reference. Exhibit B is not "
      "in R1. Disposition must be NOT FOUND (referenced but absent), not MISSING (requested "
      "but not supplied) — it was never on the request list.",
      ["04_Suppliers/Hartwell_Distribution_Agreement.pdf"],
      "page 1 Section 4",
      "Distributor pricing is set out in Exhibit B, attached hereto and incorporated",
      False, "high", True,
      ["In R2 an Exhibit B appears but names a different entity — see RDG-022."])
    F("RDG-016", "Branch gross margin overstated in KPI reporting", "deterministic_calculation",
      "Medium",
      f"Fort Wayne gross margin computes to "
      f"{(BRANCH_REV_2025['FTW'] - FTW_COGS_2025) / BRANCH_REV_2025['FTW'] * 100:.1f}% from the "
      f"trial balance; the KPI deck reports 34.2%.",
      ["06_Operations/Branch_KPI_Deck_FY2025.pdf", "02_Financial/trial_balance.csv"],
      "KPI deck page 1 line 4; trial_balance.csv rows for branch FTW accounts 4000 and 5000",
      "Fort Wayne revenue 4,120,000 gross margin 34.2%", True, "high", False,
      ["Branch reporting may allocate overhead differently; no allocation policy is supplied."],
      discriminating=True, split="heldout")
    F("RDG-017", "Equipment revenue recognized on order, not shipment", "unusual_revenue_recognition",
      "Medium",
      "The stated policy records equipment sales when a purchase order is accepted. Three "
      "December 2025 orders totalling $284,000 shipped in January 2026.",
      ["02_Financial/Balance_Sheet_FY2025.pdf"],
      "page 2, revenue recognition note",
      "equipment sales are recorded when a customer purchase order is accepted", False,
      "medium", True,
      ["Whether this is GAAP-compliant is an accounting judgment and is out of scope; refer "
       "to the QoE provider."], split="heldout")
    F("RDG-018", "Entity name inconsistent across records", "cross_document_contradiction",
      "Low",
      "The articles read 'Ridgeline Industrial Services, LLC'. The ownership schedule reads "
      "'Ridgeline Industrial Service LLC'. Do not infer a separate entity.",
      ["01_Corporate/Articles_of_Organization.pdf", "01_Corporate/ownership_schedule.csv"],
      "Articles page 1 line 2; ownership_schedule.csv column entity_name_as_written",
      "Ridgeline Industrial Service LLC", False, "high", False,
      ["Clerical variation is the likeliest explanation."])
    F("RDG-019", "Customer identifier zero-padding lost", "deterministic_calculation", "Low",
      "customer_master.csv preserves '000418'; the revenue workbook stores 418. Joining on "
      "the raw value will not match.",
      ["03_Customers/customer_master.csv", "03_Customers/Revenue_by_Customer_FY25.xlsx"],
      "customer_master.csv row 1 column customer_id; workbook sheet FY25 row 3 column A",
      "000418 / 418", False, "high", False, [])
    F("RDG-020", "Employee roster data quality defects", "deterministic_calculation", "Low",
      "Four roster rows have blank hire dates and two employee IDs are duplicated.",
      ["05_Employees/employee_roster.xlsx"],
      "sheet Roster rows 14, 35, 53, 72 (blank hire_date); rows 9/42 and 21/64 (duplicate ids)",
      "", True, "high", False, [])
    F("RDG-021", "Tax support archive cannot be opened", "unreviewed", "Informational",
      "The encrypted archive is UNREVIEWED, not MISSING. It was supplied; it cannot be "
      "processed. Reporting it as missing would send the buyer to request a document the "
      "seller already provided.",
      ["08_Tax/Tax_Support_2023-2025.zip"], "whole file", "", False, "high", True,
      ["None. This disposition is binary and is a scored trap."])
    F("RDG-022", "R2 Exhibit B names a different contracting entity", "cross_document_contradiction",
      "Medium",
      "The Exhibit B added in R2 names 'RIDGELINE INDUSTRIAL SERVICES OF OHIO, LLC', which is "
      "neither the contracting party in the agreement nor the entity in the articles. RDG-015 "
      "must not be marked resolved.",
      ["11_Update_R2/Hartwell_Exhibit_B_Pricing.txt",
       "04_Suppliers/Hartwell_Distribution_Agreement.pdf"],
      "Hartwell_Exhibit_B_Pricing.txt line 3; agreement page 1 line 2",
      "RIDGELINE INDUSTRIAL SERVICES OF OHIO, LLC", False, "high", True,
      ["Could be a drafting error; either way the original request is not satisfied."],
      discriminating=True, split="heldout")

    # ── Negative controls ───────────────────────────────────────────────────
    NC("NC-001", "Active vs all customer counts differ (142 vs 143)",
       "Looks like a reconciliation break between the KPI deck and the customer master.",
       "No finding. kpi_definitions.txt defines both terms and states 143 records / 142 active.")
    NC("NC-002", "Churned customer shows zero FY25 revenue",
       "A zero looks like missing data.",
       "No finding. The churn log documents the 2025-04 plant closure.")
    NC("NC-003", "Two identical-looking fuel journal entries",
       "Same amount, same date, same branch — looks like a duplicate posting.",
       "No finding. Journal ids JE-ERI-6205 and JE-ERI-6206 are distinct accounts.")
    NC("NC-004", "Two identical payroll journal rows in Toledo",
       "Genuinely duplicated journal_id and amount.",
       "This IS reportable as a data-quality observation (Low). It is included to test that "
       "the operator distinguishes it from NC-003, which is not.")
    NC("NC-005", "Request item 10.3 marked 'Not applicable'",
       "An N/A on a request list usually needs chasing.",
       "No finding. Written rationale and a buyer confirmation date are supplied.")
    NC("NC-006", "GL and auto certificates expire 2026-01-15",
       "Two expiring policies look like an insurance gap.",
       "No finding. The renewal notice confirms both. Only the umbrella is unrenewed (RDG-010).")
    NC("NC-007", "Northgate agreement references Exhibit A",
       "A referenced exhibit is often absent — the pattern of RDG-015.",
       "No finding. Northgate_Exhibit_A_Pricing.txt is present in the room.")
    NC("NC-008", "Erie branch has no branch manager on the roster",
       "Looks like a key-person gap or a roster omission.",
       "No finding. The org chart footnotes the shared role with Fort Wayne since 2024.")
    NC("NC-009", "CIM-style rounding of revenue to $16.4M",
       "Differs from the exact 16,412,880.",
       "No finding. Rounding within an obvious tolerance is not a discrepancy.")
    NC("NC-010", "Date formats differ between capex and fixed asset registers",
       "Format variation often signals a parse problem.",
       "No finding. All dates parse unambiguously to the same calendar dates.")
    NC("NC-011", "Toledo lease expires 2029, outside the diligence window",
       "An expiry date invites a lease-term finding.",
       "No finding. Ten-year term with a renewal option; nothing inconsistent.")
    NC("NC-012", "Legal invoice contains a 0.062-hour line",
       "An odd fractional entry looks like a data error.",
       "No finding. Immaterial and internally consistent.")

    # ── Ground truth ────────────────────────────────────────────────────────
    sev_order = ["Critical", "High", "Medium", "Low", "Informational"]
    dist = {s: sum(1 for f in findings if f["severity"] == s) for s in sev_order}
    gt = dict(
        fixture="reef-deal-room", version=VERSION, seed=SEED, generated_by="tools/reef-fixture/generate.py",
        company=CO, disclaimer="Entirely fictional. No real company, person, or agreement.",
        totals=dict(documents=len(manifest), findings=len(findings),
                    negative_controls=len(controls), severity_distribution=dist,
                    discriminating=sum(1 for f in findings if f["cross_document_discriminating"]),
                    heldout=sum(1 for f in findings if f["split"] == "heldout")),
        model=dict(total_revenue=TOTAL_REV, adjusted_ebitda_2025=ADJ_EBITDA_2025,
                   fccr=FCCR, largest_customer_pct=LAKESIDE_PCT,
                   recurring_pct_contracted=RECURRING_PCT,
                   claimed_concentration_pct=CIM_CONCENTRATION_CLAIM,
                   claimed_recurring_pct=CIM_RECURRING_CLAIM),
        findings=findings, negative_controls=controls, manifest=sorted(manifest, key=lambda m: m["path"]))
    (ROOT / "ground-truth.json").write_text(json.dumps(gt, indent=2), encoding="utf-8")

    lines = [f"<!-- {BANNER} -->", "", "# Ground truth — Reef synthetic deal room", "",
             f"Fixture `{VERSION}`, seed `{SEED}`. Generated by "
             "[`tools/reef-fixture/generate.py`](../../tools/reef-fixture/generate.py). "
             "Regenerating with the same seed reproduces it exactly.", "",
             "**Do not expose this file to any extraction pipeline being evaluated.**", "",
             f"Target: **{CO}** — entirely fictional.", "",
             "## Totals", "",
             f"- Documents: **{len(manifest)}**",
             f"- Planted findings: **{len(findings)}**",
             f"- Negative controls: **{len(controls)}**",
             f"- Cross-document discriminating: **{gt['totals']['discriminating']}**",
             f"- Held-out split: **{gt['totals']['heldout']}**", "",
             "| Severity | Count |", "| --- | ---: |"]
    for s in sev_order:
        lines.append(f"| {s} | {dist[s]} |")
    lines += ["", "## Findings", ""]
    for f in findings:
        flags = []
        if f["cross_document_discriminating"]:
            flags.append("discriminating")
        if f["split"] == "heldout":
            flags.append("held-out")
        tag = f"  _({', '.join(flags)})_" if flags else ""
        lines += [f"### {f['id']} · {f['title']}{tag}", "",
                  f"- **Severity:** {f['severity']}  ·  **Class:** `{f['classification']}`",
                  f"- **Sources:** {', '.join('`' + s + '`' for s in f['source_documents'])}",
                  f"- **Anchor:** {f['anchor']}",
                  f"- **Calculation required:** {'yes' if f['calculation_required'] else 'no'}"
                  f"  ·  **Expected confidence:** {f['expected_confidence']}"
                  f"  ·  **Human judgment:** {'yes' if f['human_judgment_required'] else 'no'}"]
        if f["supporting_excerpt"]:
            lines += ["", f"> {f['supporting_excerpt']}"]
        lines += ["", f"**Expected conclusion.** {f['expected_conclusion']}"]
        if f["acceptable_alternative_interpretations"]:
            lines += ["", "**Acceptable alternatives.**"] + \
                     [f"- {a}" for a in f["acceptable_alternative_interpretations"]]
        lines.append("")
    lines += ["## Negative controls", "",
              "A finding raised against any of these counts against precision.", "",
              "| ID | Control | Why it tempts | Correct behavior |", "| --- | --- | --- | --- |"]
    for c in controls:
        lines.append(f"| {c['id']} | {c['title']} | {c['why_tempting']} | {c['correct_behavior']} |")
    (ROOT / "GROUND_TRUTH.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"documents      {len(manifest)}")
    print(f"findings       {len(findings)}  {dist}")
    print(f"neg controls   {len(controls)}")
    print(f"discriminating {gt['totals']['discriminating']}   held-out {gt['totals']['heldout']}")
    print(f"root           {ROOT}")


if __name__ == "__main__":
    build()
