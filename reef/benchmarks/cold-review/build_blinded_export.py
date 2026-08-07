#!/usr/bin/env python3
"""Build a sanitized cold-review export.

Assembles a fresh reviewer workspace **outside** the source repository from an explicit
allowlist. Nothing is copied and then removed: a file arrives in the export only because it
was named as permitted.

That distinction is the whole point. Deleting sensitive files from a clone does not remove
them — the object store still holds them and one command recovers them. This export has no
history to recover from, because it was never a repository.

Usage:
    python build_blinded_export.py [--out DIR] [--force] [--skip-build]

Deterministic: the same source commit and fixture produce byte-identical output apart from
the recorded timestamp.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
COLD_REVIEW = HERE
REEF = HERE.parents[1]
REPO = REEF.parent
FIXTURE = REPO / "fixtures" / "reef-deal-room"
TEMPLATES = COLD_REVIEW / "export-templates"

DEFAULT_OUT = Path.home() / "Developer" / "reef-cold-review-export"
#: Bumped when a protocol change makes two reviews non-comparable. Version 2 gives each
#: reviewer a dedicated database and a namespaced room, fixes the freeze mechanism on one
#: detached hash file, and moves ingestion out of setup into a phase of its own — see
#: COLD_REVIEW_ADJUDICATION_001.md §6. Review 001 ran under version 1.
PROTOCOL_VERSION = "2"

#: Document folders a buyer would receive. Everything else under the fixture — the answer
#: key, the worked outputs, the fixture's own README describing what was planted — is simply
#: never named here, so it cannot be copied by accident.
DEAL_ROOM_FOLDERS = (
    "00_Request_List", "01_Corporate", "02_Financial", "03_Customers", "04_Suppliers",
    "05_Employees", "06_Operations", "07_Legal_Insurance", "08_Tax", "09_Capex",
    "10_QA", "11_Update_R2", "12_Routine",
)

#: Reviewer-facing documents. Written for the export and kept separate from the authors'
#: internal design records, so no internal prose can reach a reviewer through a missed edit.
ROOT_DOCS = (
    "README.md", "BLINDING_PROTOCOL.md", "REVIEWER_INSTRUCTIONS.md", "SCORING_PROTOCOL.md",
    "RESULT_STATES.md", "REVIEWER_OBSERVATIONS_TEMPLATE.md", "ADJUDICATION_HANDOFF.md",
    "QUERY_SUBMISSION_TEMPLATE.json", "EXPECTED_OUTPUT_SCHEMA.json",
)
ENGINE_DOCS = ("ENGINE_USAGE.md", "setup.sh", "teardown.sh")

#: Names that must never appear in the export, whatever the allowlist says. A second,
#: independent guard: if a permitted directory ever gains one of these, the build aborts
#: rather than shipping it.
FORBIDDEN_NAMES = frozenset({
    "ground-truth.json", "GROUND_TRUTH.md", "outputs",
    "EXECUTIVE_FINDINGS_MEMO.md", "ISSUE_REGISTER.md", "MISSING_INFORMATION_REQUEST.md",
    "CALCULATION_LOG.md", "REVIEW_NOTES.md", "DOCUMENT_INVENTORY.md",
    ".git", ".gitignore", ".env",
})
FORBIDDEN_SUFFIXES = (".pyc", ".pyo")


@dataclass
class BuildReport:
    out: Path
    source_commit: str
    source_branch: str
    wheel: str = ""
    wheel_sha256: str = ""
    files: list[tuple[str, str, int]] = field(default_factory=list)  # (path, sha256, bytes)
    skipped: list[str] = field(default_factory=list)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def git(*args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(REPO), *args], capture_output=True, text=True, check=True
    ).stdout.strip()


def guard(path: Path) -> None:
    """Refuse anything forbidden, even if an allowlisted directory contains it."""
    if path.name in FORBIDDEN_NAMES or path.suffix in FORBIDDEN_SUFFIXES:
        raise SystemExit(f"refusing to export forbidden file: {path}")
    if path.is_symlink():
        raise SystemExit(f"refusing to export symlink: {path}")


def copy_file(src: Path, dst: Path, report: BuildReport) -> None:
    guard(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    # follow_symlinks=True materialises content; the export must never contain a link.
    shutil.copyfile(src, dst, follow_symlinks=True)
    shutil.copymode(src, dst)
    rel = str(dst.relative_to(report.out))
    report.files.append((rel, sha256_file(dst), dst.stat().st_size))


def copy_tree(src: Path, dst: Path, report: BuildReport, suffixes: tuple[str, ...] = ()) -> None:
    for path in sorted(src.rglob("*")):
        if path.is_dir():
            continue
        if path.name in FORBIDDEN_NAMES or path.suffix in FORBIDDEN_SUFFIXES:
            report.skipped.append(str(path.relative_to(REPO)))
            continue
        if suffixes and path.suffix not in suffixes:
            report.skipped.append(str(path.relative_to(REPO)))
            continue
        copy_file(path, dst / path.relative_to(src), report)


#: Calibration fields that are *evaluation results*, not engine parameters. The engine reads
#: `similarity_floor` and the identity fields at request time and nothing else, so withholding
#: these changes no decision the engine makes and nothing `reef config` prints — while keeping
#: a reviewer from reading how the authors' own held-out set scored.
CALIBRATION_WITHHELD_FIELDS = (
    "heldout_negative_scores", "heldout_leaks", "separation_heldout",
    "generalises", "limitations",
)


def sanitize_wheel_calibration(wheel: Path) -> list[str]:
    """Rewrite the wheel in place, withholding calibration evidence from the shipped record.

    Engine code is untouched — only non-operational fields of a data file change. The
    operational values (model, dimension, metric, floor, pipeline version) are preserved
    byte-for-byte, so the export's engine behaves identically to the canonical one.
    """
    import zipfile

    target = "reef/calibration_data/"
    changed: list[str] = []
    tmp = wheel.with_suffix(".whl.tmp")

    with zipfile.ZipFile(wheel) as src, zipfile.ZipFile(
        tmp, "w", zipfile.ZIP_DEFLATED
    ) as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            if info.filename.startswith(target) and info.filename.endswith(".json"):
                record = json.loads(data)
                for field_name in CALIBRATION_WITHHELD_FIELDS:
                    record.pop(field_name, None)
                # Shape the loader still requires, with values that assert nothing.
                record["heldout_negative_scores"] = {"n": 0, "min": 0, "max": 0, "mean": 0}
                record["heldout_leaks"] = -1
                record["limitations"] = [
                    "Calibration provenance is withheld from this export so that a cold "
                    "reviewer cannot read how the authors' own evaluation scored. The "
                    "operational values above — model, dimension, metric, floor, pipeline "
                    "version — are unmodified.",
                ]
                record["heldout_evidence"] = "withheld_for_blinding"
                data = (json.dumps(record, indent=2) + "\n").encode()
                changed.append(info.filename)
            dst.writestr(info, data)

    tmp.replace(wheel)
    return changed


def build_wheel(skip: bool) -> Path:
    dist = REEF / "dist"
    if not skip:
        subprocess.run(["uv", "build", "--wheel"], cwd=REEF, check=True, capture_output=True)
    wheels = sorted(dist.glob("reef-*.whl"))
    if not wheels:
        raise SystemExit("no wheel built; run without --skip-build")
    return wheels[-1]


def write_document_index(deal_room: Path, out: Path, report: BuildReport) -> None:
    """A plain listing of what was supplied — the index an ordinary recipient would get.

    Deliberately carries no classification, no commentary, and no hint about which documents
    matter. Folder, name, size, nothing else.
    """
    rows: list[str] = []
    total = 0
    for folder in DEAL_ROOM_FOLDERS:
        d = deal_room / folder
        if not d.is_dir():
            continue
        for f in sorted(d.rglob("*")):
            if f.is_file():
                rows.append(f"| {folder} | {f.relative_to(d)} | {f.stat().st_size:,} |")
                total += 1

    text = (
        "# Document index\n\n"
        "Every file supplied in this data room, as delivered. No commentary.\n\n"
        f"**{total} files across {len(DEAL_ROOM_FOLDERS)} folders.**\n\n"
        "| Folder | File | Bytes |\n|---|---|---|\n" + "\n".join(rows) + "\n"
    )
    # Written at the export root, never inside the room: it is an artifact of this export,
    # and a file the engine would happily ingest as though the seller had supplied it.
    path = out / "DOCUMENT_INDEX.md"
    path.write_text(text, encoding="utf-8")
    report.files.append(
        (str(path.relative_to(report.out)), sha256_file(path), path.stat().st_size)
    )


def patch_alembic_ini(src: Path, dst: Path, report: BuildReport) -> None:
    """The wheel supplies `reef`, so the source-tree path prepend must go.

    Left in place it would point at a `src/` directory that does not exist in the export and
    alembic would fail with a confusing import error on the reviewer's first command.
    """
    text = src.read_text(encoding="utf-8")
    text = re.sub(r"(?m)^prepend_sys_path\s*=.*$", "prepend_sys_path = .", text)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(text, encoding="utf-8")
    report.files.append(
        (str(dst.relative_to(report.out)), sha256_file(dst), dst.stat().st_size)
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--force", action="store_true", help="replace an existing export")
    ap.add_argument("--skip-build", action="store_true", help="reuse the existing wheel")
    args = ap.parse_args()

    out: Path = args.out.expanduser().resolve()
    if out.is_relative_to(REPO):
        raise SystemExit(f"export must live outside the source repository: {out}")
    if out.exists():
        if not args.force:
            raise SystemExit(f"{out} exists; pass --force to replace it")
        shutil.rmtree(out)

    report = BuildReport(
        out=out,
        source_commit=git("rev-parse", "HEAD"),
        source_branch=git("rev-parse", "--abbrev-ref", "HEAD"),
    )
    out.mkdir(parents=True)

    print(f"source   {report.source_branch} @ {report.source_commit[:12]}")
    print(f"export   {out}")

    # --- reviewer-facing documents
    for name in ROOT_DOCS:
        copy_file(TEMPLATES / name, out / name, report)
    copy_file(COLD_REVIEW / "verify_blinding.sh", out / "verify_blinding.sh", report)
    (out / "verify_blinding.sh").chmod(0o755)

    # --- engine
    engine = out / "engine"
    wheel = build_wheel(args.skip_build)
    copy_file(wheel, engine / wheel.name, report)
    sanitized = sanitize_wheel_calibration(engine / wheel.name)
    report.wheel = wheel.name
    report.wheel_sha256 = sha256_file(engine / wheel.name)
    # The copy's hash changed after repacking; correct the recorded entry.
    rel = str((engine / wheel.name).relative_to(out))
    report.files = [f for f in report.files if f[0] != rel]
    report.files.append((rel, report.wheel_sha256, (engine / wheel.name).stat().st_size))
    print(f"wheel    calibration withheld in {len(sanitized)} record(s)")

    for name in ENGINE_DOCS:
        copy_file(TEMPLATES / name, engine / name, report)
    (engine / "setup.sh").chmod(0o755)
    (engine / "teardown.sh").chmod(0o755)

    patch_alembic_ini(REEF / "alembic.ini", engine / "alembic.ini", report)
    copy_tree(REEF / "alembic", engine / "alembic", report, suffixes=(".py", ".mako"))
    copy_tree(REEF / "ops", engine / "ops", report)
    (engine / "ops" / "bootstrap-local-db.sh").chmod(0o755)
    copy_file(REEF / ".env.example", engine / ".env.example", report)

    # --- the data room
    deal_room = out / "deal-room"
    for folder in DEAL_ROOM_FOLDERS:
        src = FIXTURE / folder
        if src.is_dir():
            copy_tree(src, deal_room / folder, report)
    write_document_index(deal_room, out, report)

    # --- manifest
    files = sorted(report.files)
    digest = hashlib.sha256(
        "\n".join(f"{p} {h}" for p, h, _ in files).encode()
    ).hexdigest()

    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "export_kind": "blinded_cold_review",
        "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "source": {
            "branch": report.source_branch,
            "commit": report.source_commit,
            "note": "recorded for provenance; no repository history is present in this export",
        },
        "engine": {
            "wheel": report.wheel,
            "wheel_sha256": report.wheel_sha256,
            "built_from_commit": report.source_commit,
            "sha256_differs_from_source_wheel": True,
            "modification": (
                "Calibration records inside the wheel had their evaluation evidence "
                "withheld (held-out score ranges, leak counts, generalisation flag and "
                "limitations prose). Engine code is byte-identical and the operational "
                "calibration values — model, dimension, metric, similarity floor, pipeline "
                "version — are unchanged, so the exported engine behaves identically."
            ),
        },
        "fixture": {
            "folders": list(DEAL_ROOM_FOLDERS),
            "document_count": sum(1 for p, _, _ in files if p.startswith("deal-room/")),
        },
        "included_paths": [p for p, _, _ in files],
        "excluded_path_classes": [
            "answer key (expected findings, expected anchors, expected severities)",
            "fixture worked outputs (issue register, findings memo, calculation log, review notes)",
            "fixture README describing what the room contains",
            "benchmark records, query manifests and prior measurements",
            "prior failure analyses and the authors' own query classifications",
            "evaluation harness, scorer code and calibration query labels",
            "version-control history, object storage, reflogs and worktree metadata",
            "environment files, caches, build intermediates and compiled artifacts",
        ],
        "file_count": len(files),
        "files": [{"path": p, "sha256": h, "bytes": b} for p, h, b in files],
        "manifest_sha256": digest,
        "verification": {"script": "verify_blinding.sh", "result": "pending"},
    }
    manifest_path = out / "BLINDED_EXPORT_MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"files    {len(files)}")
    print(f"manifest {digest}")

    # --- verify, and record the outcome inside the manifest
    result = subprocess.run(
        ["bash", str(out / "verify_blinding.sh"), str(out)],
        capture_output=True, text=True, check=False,
    )
    print(result.stdout.strip())
    manifest["verification"]["result"] = "PASS" if result.returncode == 0 else "FAIL"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    if result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
        print("\nBUILD FAILED VERIFICATION — export left in place for inspection")
        return 1

    print(f"\nexport ready: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
