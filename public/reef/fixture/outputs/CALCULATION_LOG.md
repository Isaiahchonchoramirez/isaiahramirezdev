<!-- FICTIONAL EVALUATION MATERIAL — SYNTHETIC DEAL ROOM -->

# Calculation log

**Ridgeline Industrial Services, LLC** · R1 baseline

*Fictional evaluation material produced during an internal rehearsal. Not a customer
deliverable.*

Every figure in the issue register marked **Calculated** appears here with its inputs,
its source anchors, and the arithmetic. Each is reproducible from the package without
Reef. Nothing here is an accounting opinion.

---

### C1 · Customer concentration — largest customer share of FY2025 revenue

| Input | Value | Source |
|---|---|---|
| Lakeside Steel Processing Co., FY2025 revenue | 3,676,485 | `03_Customers/Revenue_by_Customer_FY25.xlsx`, sheet `FY25`, row 3 |
| Total FY2025 revenue | 16,412,880 | `02_Financial/Income_Statement_FY2025.pdf`, p.1, "Total revenue" |

```
3,676,485 ÷ 16,412,880 = 0.22400 → 22.40%
```

**22.40%.** Cross-checked: the revenue-by-customer schedule sums to 16,412,880, tying
exactly to the income statement. Seller Q&A Q-011 states no customer exceeds 11%.

### C2 · Recurring revenue share

| Input | Value | Source |
|---|---|---|
| Contract service revenue, FY2025 | 8,540,000 | `02_Financial/Income_Statement_FY2025.pdf`, p.1 |
| Total FY2025 revenue | 16,412,880 | same |

```
8,540,000 ÷ 16,412,880 = 0.52032 → 52.0%
```

**52.0% on contracted maintenance revenue.** Management reports 78%.
`06_Operations/kpi_definitions.txt` defines management's measure as contracted
maintenance **plus** time-and-materials work from customers holding a contract. Both
figures are arithmetically defensible under their own definitions. Recorded as
**Unresolved**, not as an error.

### C3 · Fixed charge coverage ratio, FY2025

| Input | Value | Source |
|---|---|---|
| Adjusted EBITDA | 1,950,000 | `02_Financial/Covenant_Compliance_Certificate_FY2025.pdf`, p.1 |
| Maintenance capital expenditure | 285,000 | same |
| Total fixed charges (P&I) | 1,411,000 | same |

```
(1,950,000 − 285,000) ÷ 1,411,000 = 1,665,000 ÷ 1,411,000 = 1.1800
```

**1.18x** against a **1.25x** minimum under §6.11 of the credit agreement
(`02_Financial/debt_schedule.csv`, row 1, `covenants`). The certificate in the package
states the same 1.18x. No waiver or amendment is in the package.

### C4 · Accounts receivable over 90 days

| Input | Value | Source |
|---|---|---|
| Total AR | 3,402,000 | `02_Financial/ar_aging.csv`, sum of `amount` |
| AR with `days_outstanding` > 90 | 612,400 | rows 1–4 |
| Consolidated Foundry Group, 118 days | 341,200 | row 1 (`INV-24118`) |

```
612,400 ÷ 3,402,000 = 0.18001 → 18.0%
341,200 ÷ 612,400   = 0.55716 → 55.7% of the over-90 balance is one customer
```

AR detail ties exactly to the balance sheet figure of 3,402,000
(`02_Financial/Balance_Sheet_FY2025.pdf`, p.1). Seller Q&A Q-014 states there are no
collection issues.

### C5 · Supplier concentration in parts cost of revenue

| Input | Value | Source |
|---|---|---|
| Hartwell Supply Company, FY2025 | 2,562,000 | `04_Suppliers/top_vendor_schedule.txt`, line 4 |
| Total parts cost of revenue | 4,180,000 | same, line 3 |

```
2,562,000 ÷ 4,180,000 = 0.61292 → 61.3%
```

**61.3%** from one distributor, terminable for convenience on 60 days' notice
(`04_Suppliers/Hartwell_Distribution_Agreement.pdf`, p.1 §11.2).

### C6 · Unbilled work in process growth vs revenue growth

| Input | Value | Source |
|---|---|---|
| WIP, 2024-12-31 | 410,000 | `06_Operations/wip_schedule.txt` |
| WIP, 2025-12-31 | 1,020,000 | same |
| FY2024 revenue | 15,120,400 | `02_Financial/monthly_income_statement.xlsx`, FY2024 rows |
| FY2025 revenue | 16,412,880 | `02_Financial/Income_Statement_FY2025.pdf`, p.1 |

```
WIP     : (1,020,000 ÷ 410,000) − 1 = 1.4878 → +148.8%
Revenue : (16,412,880 ÷ 15,120,400) − 1 = 0.0855 → +8.5%
Ratio   : 148.8 ÷ 8.5 = 17.5×
```

WIP grew roughly **17.5 times faster than revenue.**

### C7 · Fort Wayne branch gross margin

| Input | Value | Source |
|---|---|---|
| Fort Wayne revenue, FY2025 | 4,120,000 | `02_Financial/trial_balance.csv`, `JE-FTW-4000`, account 4000 |
| Fort Wayne cost of revenue | 2,937,560 | `02_Financial/trial_balance.csv`, `JE-FTW-5000`, account 5000 |

```
(4,120,000 − 2,937,560) ÷ 4,120,000 = 1,182,440 ÷ 4,120,000 = 0.28700 → 28.70%
```

**28.7%** from the trial balance. The branch KPI deck reports **34.2%**
(`06_Operations/Branch_KPI_Deck_FY2025.pdf`, p.1, line 4). A difference of 5.5
percentage points, or roughly **227,000** of gross profit. No overhead allocation policy
is supplied, which is one possible explanation.

### C8 · Capital expenditure register vs fixed asset register

| Source | Vehicle additions | Total |
|---|---|---|
| `09_Capex/capex_register.csv` | 5 | 487,000 |
| `09_Capex/fixed_asset_register.csv` | 3 | 312,000 |

```
487,000 − 312,000 = 175,000 unreconciled
Box truck unit 43: 118,900 (capex) vs 188,500 (fixed asset) = 69,600 difference on one asset
```

### C9 · Revenue schedule variance between the two supplied workbooks

```
Bayfield Paper Mills: 1,204,900 (FY25.xlsx) − 1,086,900 (FY25_v2.xlsx) = 118,000
```

Both files are undated and carry no revision marks. Only the original ties to the income
statement; the v2 total is 118,000 short.

### C10 · Headcount reconciliation

| Input | Value | Source |
|---|---|---|
| Roster rows | 84 | `05_Employees/employee_roster.xlsx`, sheet `Roster` |
| W-2 employees at 2025-12-31 | 71 | `05_Employees/payroll_summary.txt`, line 3 |
| 1099 contractors | 13 | `05_Employees/contractor_schedule.csv`, 13 rows |

```
71 + 13 = 84  ✓ reconciles
```

The roster is complete. The finding is not a count discrepancy — it is that **13 of the
84 are 1099 contractors performing field technician work**, and Q&A Q-022 states all
field staff are employees. Ten of the 13 are titled "Field technician."

---

## Reproducibility

Every calculation above uses only figures present in the package, at the anchors given.
None depends on an assumption not stated in its row. Re-running them by hand from the
source files reproduces the same numbers.

**Not calculated, and deliberately so:** any adjusted-earnings figure, any valuation
multiple, any normalized working capital, any tax effect. Those belong to the
quality-of-earnings provider and to counsel.
