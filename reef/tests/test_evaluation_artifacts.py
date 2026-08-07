"""Validators for evaluation data: the query manifest and the cold-review bundle.

Test-only. Nothing here imports or exercises engine behaviour beyond reading constants —
these assert properties of evaluation *artifacts*, which is where the last three defects
lived. A benchmark that claims a configuration it did not run, a harness that scores tasks
retrieval cannot perform, and a review bundle that leaks the answer key are all failures
that no engine test would catch.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

BENCHMARKS = Path(__file__).resolve().parents[1] / "benchmarks"
MANIFEST = BENCHMARKS / "ridgeline-query-manifest-v2.json"
COLD_REVIEW = BENCHMARKS / "cold-review"
TEMPLATES = COLD_REVIEW / "export-templates"
BUILDER = COLD_REVIEW / "build_blinded_export.py"
VERIFIER = COLD_REVIEW / "verify_blinding.sh"

VALID_TIERS = {"T1", "T2", "T3"}
VALID_DISPOSITIONS = {
    "SUPPORTED",
    "CONTRADICTED",
    "SUBJECT_PRESENT_FACT_ABSENT",
    "EXPLICITLY_ABSENT",
    "INSUFFICIENT_EVIDENCE",
    "OUT_OF_SCOPE",
    "REQUIRES_COMPARISON",
    "REQUIRES_CALCULATION",
    "UNCALIBRATED",
}


@pytest.fixture(scope="module")
def manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


class TestQueryManifest:
    def test_it_exists_and_parses(self, manifest: dict) -> None:
        assert manifest["name"] == "ridgeline-query-manifest-v2"
        assert manifest["queries"]

    def test_every_query_has_a_stable_id_and_they_are_unique(self, manifest: dict) -> None:
        ids = [q["query_id"] for q in manifest["queries"]]
        assert len(ids) == len(set(ids)), "duplicate query ids"
        assert all(q["query_id"] for q in manifest["queries"])

    def test_every_query_carries_the_required_labels(self, manifest: dict) -> None:
        required = (
            "query_id",
            "query_text",
            "primary_capability_class",
            "primary_capability",
            "metric_tier",
            "expected_disposition",
            "directly_responsive_passage_exists",
            "arithmetic_required",
            "multiple_documents_required",
            "explicit_absence_must_be_established",
            "all_source_files_accessible",
            "retrieval_recall_is_valid_metric",
        )
        for q in manifest["queries"]:
            missing = [k for k in required if k not in q]
            assert not missing, f"{q['query_id']} missing {missing}"

    def test_capability_classes_are_in_range(self, manifest: dict) -> None:
        for q in manifest["queries"]:
            assert 1 <= q["primary_capability_class"] <= 10
            if q.get("secondary_capability_class") is not None:
                assert 1 <= q["secondary_capability_class"] <= 10

    def test_tiers_and_dispositions_are_from_the_defined_sets(self, manifest: dict) -> None:
        for q in manifest["queries"]:
            assert q["metric_tier"] in VALID_TIERS
            assert q["expected_disposition"] in VALID_DISPOSITIONS

    def test_retrieval_recall_is_valid_only_for_tier_one(self, manifest: dict) -> None:
        """The whole point of the taxonomy. Retrieval is scored only where it can succeed."""
        for q in manifest["queries"]:
            if q["retrieval_recall_is_valid_metric"]:
                assert q["metric_tier"] == "T1", (
                    f"{q['query_id']} claims retrieval recall is valid but sits in "
                    f"{q['metric_tier']}"
                )

    def test_inaccessible_sources_are_never_retrieval_eligible(self, manifest: dict) -> None:
        """RDG-021's source has zero chunks. Any retrieval metric on it is invented."""
        for q in manifest["queries"]:
            # None means "not evaluated in this run" (R2-dependent), which is different
            # from a file that exists and could not be indexed.
            if q["all_source_files_accessible"] is False:
                assert q["metric_tier"] == "T3"
                assert not q["retrieval_recall_is_valid_metric"]
                assert not q.get("operand_recall_is_valid_metric")

    def test_the_three_corrected_cases_are_documented(self, manifest: dict) -> None:
        by_finding = {
            q.get("source_finding"): q for q in manifest["queries"] if q.get("source_finding")
        }
        # Previously counted as retrieval misses; none is a retrieval task.
        assert by_finding["RDG-009"]["primary_capability_class"] == 4  # calculation
        assert by_finding["RDG-015"]["primary_capability_class"] == 6  # absence
        assert by_finding["RDG-021"]["primary_capability_class"] == 8  # inaccessible
        assert by_finding["RDG-021"]["metric_tier"] == "T3"
        for fid in ("RDG-009", "RDG-015", "RDG-021"):
            assert not by_finding[fid]["retrieval_recall_is_valid_metric"]

    def test_the_one_genuine_retrieval_miss_is_still_tier_one(self, manifest: dict) -> None:
        """Reclassification must not quietly excuse the real failure."""
        by_finding = {
            q.get("source_finding"): q for q in manifest["queries"] if q.get("source_finding")
        }
        rdg008 = by_finding["RDG-008"]
        assert rdg008["metric_tier"] == "T1"
        assert rdg008["retrieval_recall_is_valid_metric"]
        assert rdg008["observed"]["first_rank"] is None, "RDG-008 should still be a miss"

    def test_miss_causes_are_attributed(self, manifest: dict) -> None:
        """A miss is not always a retrieval failure; the cause determines the owner."""
        valid = {
            "gate_suppressed",
            "ranking_outside_top_12",
            "never_retrieved",
            "unretrievable_no_chunks",
            None,
        }
        scored = [
            q
            for q in manifest["queries"]
            if q.get("origin") == "planted_finding" and q.get("scored_in_r1")
        ]
        for q in scored:
            assert q["observed"]["miss_cause"] in valid
            if q["observed"]["first_rank"] is None:
                assert q["observed"]["miss_cause"] is not None, (
                    f"{q['query_id']} is a miss with no attributed cause"
                )

    def test_query_wording_was_not_altered_to_improve_results(self, manifest: dict) -> None:
        """Labels changed; queries did not. Verified against the live constants."""
        from reef.calibrate_floor import ANSWERABLE_QUERIES, NEGATIVE_QUERIES
        from reef.evaluate import ABSTENTION_HELDOUT_QUESTIONS

        by_origin: dict[str, list[str]] = {}
        for q in manifest["queries"]:
            by_origin.setdefault(q["origin"], []).append(q["query_text"])

        assert by_origin["calibration_answerable"] == list(ANSWERABLE_QUERIES)
        assert by_origin["calibration_negative"] == list(NEGATIVE_QUERIES)
        assert by_origin["heldout_negative"] == list(ABSTENTION_HELDOUT_QUESTIONS)

    def test_finding_queries_match_the_fixture_titles_verbatim(self, manifest: dict) -> None:
        gt_path = BENCHMARKS.parents[1] / "fixtures" / "reef-deal-room" / "ground-truth.json"
        if not gt_path.is_file():
            pytest.skip("fixture not present")
        titles = {f["id"]: f["title"] for f in json.loads(gt_path.read_text())["findings"]}
        for q in manifest["queries"]:
            if q.get("source_finding"):
                assert q["query_text"] == titles[q["source_finding"]]

    def test_metrics_report_tiers_separately(self, manifest: dict) -> None:
        metrics = manifest["metrics_r1"]
        assert "retrieval_only_T1" in metrics
        assert "operand_retrieval_T2" in metrics
        assert "not_scored_T3" in metrics
        assert metrics["not_scored_T3"]["status"] == "invalid_expectation"
        assert metrics["superseded_metric"]["previous"]

    def test_small_sample_warning_is_present(self, manifest: dict) -> None:
        """T1 has two queries. A rate over it is not a performance claim."""
        assert manifest["metrics_r1"]["retrieval_only_T1"]["eligible"] < 10
        assert "small_sample_warning" in manifest
        assert "statistically meaningful" in manifest["small_sample_warning"]


class TestHeldOutContaminationIsDeclared:
    def test_the_benchmark_marks_the_heldout_set_diagnostic_only(self) -> None:
        record = json.loads((BENCHMARKS / "ridgeline-m1-baseline-v2.json").read_text())
        status = record["abstention"]["heldout_set_status"]
        assert "DIAGNOSTIC" in status["status"].upper()
        assert status["queries_unchanged"] is True
        assert status["no_difficult_case_was_moved_out"] is True

    def test_the_code_comment_warns_future_readers(self) -> None:
        source = (Path(__file__).resolve().parents[1] / "src/reef/evaluate.py").read_text()
        assert "DIAGNOSTIC ONLY" in source
        assert "contaminated" in source.lower()


#: A fixed, comfortably-past build time for synthetic exports. The verifier's `.git` check
#: is a comparison against it, so tests need commits it can fall on either side of.
_BUILT_AT = datetime(2026, 6, 1, tzinfo=UTC)


def _git(root: Path, *args: str, when: datetime | None = None) -> None:
    """Run git in `root` with a fixed identity, and optionally a fixed commit time."""
    env = {
        **os.environ,
        "GIT_AUTHOR_NAME": "reviewer",
        "GIT_AUTHOR_EMAIL": "reviewer@example.invalid",
        "GIT_COMMITTER_NAME": "reviewer",
        "GIT_COMMITTER_EMAIL": "reviewer@example.invalid",
    }
    if when is not None:
        env["GIT_AUTHOR_DATE"] = env["GIT_COMMITTER_DATE"] = when.isoformat()
    subprocess.run(
        ["git", "-C", str(root), *args], check=True, capture_output=True, text=True, env=env
    )


def _freeze_repository(root: Path, when: datetime) -> None:
    """What a reviewer does if they reach for git: init here, add, commit. Nothing else."""
    _git(root, "init", "-q", ".")
    _git(root, "add", "QUERY_SUBMISSION_TEMPLATE.json")
    _git(root, "commit", "-q", "-m", "pre-registered queries", when=when)


def _minimal_export(root: Path) -> Path:
    """A structurally valid export, so the verifier's own checks can be exercised."""
    (root / "engine").mkdir(parents=True)
    (root / "deal-room").mkdir()
    for name in (
        "README.md",
        "BLINDING_PROTOCOL.md",
        "REVIEWER_INSTRUCTIONS.md",
        "SCORING_PROTOCOL.md",
        "RESULT_STATES.md",
        "REVIEWER_OBSERVATIONS_TEMPLATE.md",
        "ADJUDICATION_HANDOFF.md",
        "QUERY_SUBMISSION_TEMPLATE.json",
        "EXPECTED_OUTPUT_SCHEMA.json",
        "DOCUMENT_INDEX.md",
    ):
        (root / name).write_text("placeholder\n")
    (root / "BLINDED_EXPORT_MANIFEST.json").write_text(
        json.dumps(
            {
                "manifest_sha256": "x",
                "engine": {"wheel_sha256": "y"},
                # The verifier dates a reviewer's own `.git` against this.
                "built_at": _BUILT_AT.isoformat(timespec="seconds"),
            }
        )
    )
    shutil.copyfile(VERIFIER, root / "verify_blinding.sh")
    (root / "engine" / "ENGINE_USAGE.md").write_text("x\n")
    (root / "engine" / "setup.sh").write_text("x\n")
    (root / "engine" / "teardown.sh").write_text("x\n")
    (root / "engine" / "alembic.ini").write_text("x\n")
    (root / "engine" / "reef-0.1.0-py3-none-any.whl").write_bytes(b"PK\x05\x06" + b"\0" * 18)
    for i in range(13):
        folder = root / "deal-room" / f"{i:02d}_Folder"
        folder.mkdir()
        for j in range(5):
            (folder / f"doc{j}.txt").write_text("ordinary document text\n")
    return root


def _run_verifier(target: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["bash", str(VERIFIER), str(target)], capture_output=True, text=True, check=False
    )


class TestExportTemplates:
    """The reviewer-facing documents the builder ships."""

    REQUIRED = (
        "README.md",
        "REVIEWER_INSTRUCTIONS.md",
        "QUERY_SUBMISSION_TEMPLATE.json",
        "EXPECTED_OUTPUT_SCHEMA.json",
        "SCORING_PROTOCOL.md",
        "BLINDING_PROTOCOL.md",
        "REVIEWER_OBSERVATIONS_TEMPLATE.md",
        "ADJUDICATION_HANDOFF.md",
        "RESULT_STATES.md",
        "ENGINE_USAGE.md",
        "setup.sh",
        "teardown.sh",
    )

    def test_every_required_template_exists(self) -> None:
        missing = [n for n in self.REQUIRED if not (TEMPLATES / n).is_file()]
        assert not missing, f"export templates missing {missing}"

    def test_templates_are_valid_json_where_they_claim_to_be(self) -> None:
        for name in ("QUERY_SUBMISSION_TEMPLATE.json", "EXPECTED_OUTPUT_SCHEMA.json"):
            json.loads((TEMPLATES / name).read_text(encoding="utf-8"))

    def test_templates_leak_no_finding_identifiers_or_values(self) -> None:
        """These ship to the reviewer. Anything in them, they see."""
        leaked: list[str] = []
        substance = [f"RDG-{n:03d}" for n in range(1, 23)] + [
            "22.4",
            "1.18",
            "000418",
            "Hartwell",
            "Lakeside",
            "Ridgeline",
        ]
        for path in TEMPLATES.rglob("*"):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            leaked += [f"{path.name}: {p!r}" for p in substance if p in text]
        assert not leaked, "export templates leak fixture content:\n  " + "\n  ".join(leaked)

    def test_templates_leak_no_prior_measurements(self) -> None:
        """A reviewer told how the engine scored last time is no longer independent."""
        leaked: list[str] = []
        priors = ["0.6555", "78.9", "87.5", "15/19", "3 of 6", "50%", "does not generalise"]
        for path in TEMPLATES.rglob("*"):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore").lower()
            leaked += [f"{path.name}: {p!r}" for p in priors if p.lower() in text]
        assert not leaked, "export templates leak prior results:\n  " + "\n  ".join(leaked)

    def test_templates_do_not_name_answer_key_paths(self) -> None:
        leaked: list[str] = []
        for path in TEMPLATES.rglob("*"):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for probe in (
                "ground-truth",
                "GROUND_TRUTH",
                "SYNTHETIC_DEAL_ROOM_SPEC",
                "benchmarks/",
            ):
                if probe in text:
                    leaked.append(f"{path.name}: {probe!r}")
        assert not leaked, "\n  ".join(leaked)

    def test_the_required_distribution_is_stated(self) -> None:
        template = json.loads((TEMPLATES / "QUERY_SUBMISSION_TEMPLATE.json").read_text())
        required = template["$distribution_required"]
        assert required["directly_answerable"] >= 10
        assert required["subject_present_fact_may_be_absent"] >= 5
        assert required["outside_corpus_scope"] >= 5
        assert required["requires_calculation_or_comparison"] >= 5
        assert required["missing_inaccessible_stale_or_unreviewed"] >= 3

    def test_the_output_schema_requires_pre_registration(self) -> None:
        """Freezing labels before the engine runs is the control against relabelling."""
        schema = json.loads((TEMPLATES / "EXPECTED_OUTPUT_SCHEMA.json").read_text())
        pre = schema["pre_registration"]
        assert "queries_file_sha256" in pre or "queries_file_commit" in pre
        assert pre["frozen_before_running_engine"] is True

    def test_the_output_schema_requires_the_resolved_configuration(self) -> None:
        schema = json.loads((TEMPLATES / "EXPECTED_OUTPUT_SCHEMA.json").read_text())
        env = schema["environment"]
        assert "reef_config_output_verbatim" in env
        assert "dotenv_reported" in env


class TestExportBuilder:
    def test_the_builder_exists_and_is_allowlist_driven(self) -> None:
        source = BUILDER.read_text(encoding="utf-8")
        assert "DEAL_ROOM_FOLDERS" in source
        assert "ROOT_DOCS" in source
        # A denylist would silently ship anything nobody thought to name.
        assert "allowlist" in source.lower()

    def test_the_builder_refuses_to_export_inside_the_repository(self) -> None:
        assert "must live outside the source repository" in BUILDER.read_text()

    def test_the_builder_names_no_answer_key_folder(self) -> None:
        source = BUILDER.read_text(encoding="utf-8")
        folders = re.findall(r'"(\d\d_[A-Za-z_]+)"', source)
        assert len(folders) >= 10
        assert "outputs" not in folders

    def test_the_builder_guards_against_forbidden_files_and_symlinks(self) -> None:
        source = BUILDER.read_text(encoding="utf-8")
        assert "refusing to export forbidden file" in source
        assert "refusing to export symlink" in source

    def test_the_builder_withholds_calibration_evidence(self) -> None:
        """The wheel ships a calibration record; its held-out evidence is a prior result."""
        source = BUILDER.read_text(encoding="utf-8")
        assert "CALIBRATION_WITHHELD_FIELDS" in source
        for field_name in ("heldout_leaks", "heldout_negative_scores", "limitations"):
            assert field_name in source


class TestBlindingVerifier:
    def test_it_requires_an_argument(self) -> None:
        result = subprocess.run(
            ["bash", str(VERIFIER)], capture_output=True, text=True, check=False
        )
        assert result.returncode == 2

    def test_a_well_formed_export_passes(self, tmp_path: Path) -> None:
        result = _run_verifier(_minimal_export(tmp_path / "good"))
        assert result.returncode == 0, result.stdout
        assert "PASS" in result.stdout

    def test_it_detects_an_answer_key(self, tmp_path: Path) -> None:
        root = _minimal_export(tmp_path / "leaky")
        (root / "deal-room" / "ground-truth.json").write_text("{}")
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "FAIL" in result.stdout

    def test_it_detects_finding_identifiers_in_content(self, tmp_path: Path) -> None:
        root = _minimal_export(tmp_path / "ids")
        (root / "deal-room" / "00_Folder" / "note.txt").write_text("see RDG-001 for detail")
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "RDG" in result.stdout

    def test_it_detects_repository_history(self, tmp_path: Path) -> None:
        root = _minimal_export(tmp_path / "hist")
        (root / ".git").mkdir()
        (root / ".git" / "HEAD").write_text("ref: refs/heads/main\n")
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "history" in result.stdout.lower()

    def test_it_detects_other_version_control_systems(self, tmp_path: Path) -> None:
        for vc in (".hg", ".svn", ".jj"):
            root = _minimal_export(tmp_path / f"vc{vc}")
            (root / vc).mkdir()
            result = _run_verifier(root)
            assert result.returncode != 0, f"{vc} was accepted"


class TestVerifierDistinguishesReviewerGitFromInherited:
    """Adjudication 001 §6.2: the verifier failed any `.git`, including the reviewer's own.

    The instructions offered `git init` as a way to freeze pre-registered questions, and a
    reviewer who took it could no longer run the check on their own export. The freeze is
    now a detached hash file, but the distinction still has to work: history inherited from
    the source repository is recoverable, and a repository created here after the export was
    built holds only what the reviewer put in it.
    """

    def test_a_repository_created_after_the_export_is_accepted(self, tmp_path: Path) -> None:
        root = _minimal_export(tmp_path / "reviewer-git")
        _freeze_repository(root, when=_BUILT_AT + timedelta(hours=3))
        result = _run_verifier(root)
        assert result.returncode == 0, result.stdout
        assert "created after this export" in result.stdout

    def test_history_predating_the_export_is_rejected(self, tmp_path: Path) -> None:
        root = _minimal_export(tmp_path / "inherited-git")
        _freeze_repository(root, when=_BUILT_AT - timedelta(days=30))
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "predating this export" in result.stdout

    def test_a_repository_with_remotes_is_rejected(self, tmp_path: Path) -> None:
        """A remote is a route back to the repository holding the answer key."""
        root = _minimal_export(tmp_path / "remote-git")
        _freeze_repository(root, when=_BUILT_AT + timedelta(hours=3))
        _git(root, "remote", "add", "origin", "https://example.invalid/reef.git")
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "remotes" in result.stdout

    def test_a_nested_repository_is_always_rejected(self, tmp_path: Path) -> None:
        """Following these instructions never produces one below the export root."""
        root = _minimal_export(tmp_path / "nested-git")
        _freeze_repository(root, when=_BUILT_AT + timedelta(hours=3))
        (root / "deal-room" / ".git").mkdir()
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "nested .git" in result.stdout

    def test_a_gitdir_link_is_rejected(self, tmp_path: Path) -> None:
        """A `.git` file points at storage outside the export, which nothing here checks."""
        root = _minimal_export(tmp_path / "linked-git")
        (root / ".git").write_text(f"gitdir: {tmp_path / 'elsewhere'}\n")
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "external git directory" in result.stdout

    def test_a_repository_is_rejected_when_the_export_has_no_build_time(
        self, tmp_path: Path
    ) -> None:
        """Without a build time there is nothing to date the commits against."""
        root = _minimal_export(tmp_path / "undated")
        manifest = root / "BLINDED_EXPORT_MANIFEST.json"
        record = json.loads(manifest.read_text())
        del record["built_at"]
        manifest.write_text(json.dumps(record))
        _freeze_repository(root, when=_BUILT_AT + timedelta(hours=3))
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "no build time" in result.stdout


class TestVerifierChecksDatabaseIsolation:
    """Adjudication 001 §6.1: every filesystem check passed while a foreign room existed.

    These assert the shape of the check without a database. Whether it reads Postgres
    correctly is exercised by running it against a real export; what is pinned here is that
    it refuses the configurations that made the first contamination possible.
    """

    def test_an_unprovisioned_export_passes(self, tmp_path: Path) -> None:
        """Before setup runs there is no database, so there is nothing to have leaked."""
        result = _run_verifier(_minimal_export(tmp_path / "unprovisioned"))
        assert result.returncode == 0, result.stdout
        assert "no reviewer database provisioned yet" in result.stdout

    def test_a_shared_database_is_rejected(self, tmp_path: Path) -> None:
        """`reef` is the host's development database — the one review 001 was polluted by."""
        root = _minimal_export(tmp_path / "shared-db")
        (root / "engine" / "reviewer-env.sh").write_text(
            'export REEF_ROOM="cold-review-ab"\n'
            'export REEF_DB_NAME="reef"\n'
            'export REEF_DATABASE_URL="postgresql+psycopg://reef_app:reef_app@localhost:5432/reef"\n'
        )
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "not a per-reviewer database" in result.stdout

    def test_an_unnamespaced_room_is_rejected(self, tmp_path: Path) -> None:
        """`cold-review` is the name review 001 told every reviewer to use."""
        root = _minimal_export(tmp_path / "shared-room")
        (root / "engine" / "reviewer-env.sh").write_text(
            'export REEF_ROOM="cold-review"\n'
            'export REEF_DB_NAME="reef_cr_ab"\n'
            'export REEF_DATABASE_URL="postgresql+psycopg://x:x@localhost:5432/reef_cr_ab"\n'
        )
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "not namespaced" in result.stdout

    def test_a_url_pointing_elsewhere_is_rejected(self, tmp_path: Path) -> None:
        """The name and the connection string must agree, or the check verifies nothing."""
        root = _minimal_export(tmp_path / "mismatched-db")
        (root / "engine" / "reviewer-env.sh").write_text(
            'export REEF_ROOM="cold-review-ab"\n'
            'export REEF_DB_NAME="reef_cr_ab"\n'
            'export REEF_DATABASE_URL="postgresql+psycopg://x:x@localhost:5432/reef"\n'
        )
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "points at" in result.stdout


class TestReviewerDatabaseScripts:
    """`setup.sh` and `teardown.sh` as shipped. Neither is run here; both are read."""

    SETUP = TEMPLATES / "setup.sh"
    TEARDOWN = TEMPLATES / "teardown.sh"

    def test_setup_requires_a_reviewer_id(self) -> None:
        result = subprocess.run(
            ["bash", str(self.SETUP)],
            capture_output=True,
            text=True,
            check=False,
            cwd=TEMPLATES,
            env={**os.environ, "REEF_REVIEWER_ID": ""},
        )
        assert result.returncode == 2
        assert "reviewer-id" in result.stderr

    def test_setup_rejects_a_malformed_reviewer_id(self) -> None:
        result = subprocess.run(
            ["bash", str(self.SETUP), "Not A Valid Id"],
            capture_output=True,
            text=True,
            check=False,
            cwd=TEMPLATES,
        )
        assert result.returncode == 2
        assert "reviewer id must match" in result.stderr

    def test_setup_namespaces_both_the_database_and_the_room(self) -> None:
        source = self.SETUP.read_text(encoding="utf-8")
        assert 'DB_NAME="reef_cr_${REVIEWER_ID}"' in source
        assert 'ROOM_NAME="cold-review-${REVIEWER_ID}"' in source

    def test_setup_refuses_a_database_that_already_holds_rooms(self) -> None:
        source = self.SETUP.read_text(encoding="utf-8")
        assert "SELECT count(*) FROM room" in source
        assert "must start from an empty database" in source

    def test_setup_does_not_ingest(self) -> None:
        """Adjudication 001 §6.3: installing must not reveal coverage before the freeze.

        The closing message *names* the Phase 3 commands, with the reviewer's room already
        filled in, which is the point. What must not happen is setup running them.
        """
        source = self.SETUP.read_text(encoding="utf-8")
        executed = source.split("cat <<DONE", 1)[0]
        commands = [
            line
            for line in executed.splitlines()
            if line.strip().startswith(("uv run", "./run.sh", "bash ", "reef "))
        ]
        assert commands, "no commands found — has setup.sh been restructured?"
        assert not any("ingest" in line for line in commands), commands
        assert not any("coverage" in line for line in commands), commands

    def test_setup_writes_configuration_to_a_readable_file_not_a_dotenv(self) -> None:
        """A `.env` would be picked up invisibly; the export tells reviewers to expect none."""
        source = self.SETUP.read_text(encoding="utf-8")
        assert "reviewer-env.sh" in source
        assert "> .env" not in source

    def test_teardown_only_drops_per_reviewer_databases(self) -> None:
        source = self.TEARDOWN.read_text(encoding="utf-8")
        assert "reef_cr_*)" in source
        assert "refusing to drop" in source

    def test_teardown_rejects_a_malformed_reviewer_id(self, tmp_path: Path) -> None:
        script = tmp_path / "teardown.sh"
        shutil.copyfile(self.TEARDOWN, script)
        result = subprocess.run(
            ["bash", str(script), "../reef"], capture_output=True, text=True, check=False
        )
        assert result.returncode == 2

    def test_the_bootstrap_script_takes_the_database_name_as_a_parameter(self) -> None:
        """Row-level security separates rooms; it does not separate two reviews on a host."""
        source = (Path(__file__).resolve().parents[1] / "ops/bootstrap-local-db.sh").read_text()
        assert 'DB_NAME="${REEF_DB_NAME:-reef}"' in source
        assert "REEF_DB_NAME must match" in source


class TestOneFreezeMechanism:
    """Adjudication 001 §6.2: two freeze mechanisms, one of which broke the verifier."""

    def test_the_instructions_name_the_hash_file_as_the_freeze(self) -> None:
        text = (TEMPLATES / "REVIEWER_INSTRUCTIONS.md").read_text(encoding="utf-8")
        assert "cold-review-queries.sha256" in text
        assert "One mechanism" in text

    def test_the_instructions_do_not_offer_git_as_an_alternative_freeze(self) -> None:
        text = (TEMPLATES / "REVIEWER_INSTRUCTIONS.md").read_text(encoding="utf-8")
        assert "git init -q ." not in text
        assert "git rev-parse HEAD" not in text

    def test_the_reviewer_is_told_to_ingest_after_freezing(self) -> None:
        """Adjudication 001 §6.3: the phase order must be followable without contradiction."""
        text = (TEMPLATES / "REVIEWER_INSTRUCTIONS.md").read_text(encoding="utf-8")
        assert text.index("Freeze your questions") < text.index("./run.sh ingest")
        assert "It does not load the data room" in text

    def test_it_detects_symlinks(self, tmp_path: Path) -> None:
        root = _minimal_export(tmp_path / "links")
        (root / "deal-room" / "escape").symlink_to(tmp_path)
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "symlink" in result.stdout.lower()

    def test_it_detects_absolute_source_paths(self, tmp_path: Path) -> None:
        root = _minimal_export(tmp_path / "paths")
        (root / "engine" / "note.txt").write_text("built from /Users/someone/Developer/x\n")
        result = _run_verifier(root)
        assert result.returncode != 0

    def test_it_detects_over_removal(self, tmp_path: Path) -> None:
        """An export stripped of the room is as useless as one that leaks."""
        root = _minimal_export(tmp_path / "empty")
        shutil.rmtree(root / "deal-room")
        (root / "deal-room").mkdir()
        result = _run_verifier(root)
        assert result.returncode != 0
        assert "over-removed" in result.stdout.lower()

    def test_it_does_not_object_to_ordinary_suggestive_filenames(self, tmp_path: Path) -> None:
        """A buyer sees names like `_revised` and `_v2`. Those are legitimate signal."""
        root = _minimal_export(tmp_path / "ordinary")
        folder = root / "deal-room" / "00_Folder"
        (folder / "schedule_revised.csv").write_text("a,b\n1,2\n")
        (folder / "report_v2_final.pdf").write_text("x\n")
        (folder / "update_supersedes_prior.txt").write_text("x\n")
        result = _run_verifier(root)
        assert result.returncode == 0, result.stdout


ADJUDICATION_JSON = BENCHMARKS / "cold-review" / "cold-review-adjudication-001.json"
ADJUDICATION_MD = BENCHMARKS / "cold-review" / "COLD_REVIEW_ADJUDICATION_001.md"

VALID_OWNERS = {
    "retrieval ranking",
    "abstention or evidence sufficiency",
    "result-state contract",
    "document-status handling",
    "relevance-score presentation",
    "ingestion or coverage reporting",
    "protocol or blinding",
    "expected unimplemented capability",
    "reviewer misunderstanding",
    "ambiguous or unresolved",
    "no defect",
}


@pytest.fixture(scope="module")
def adjudication() -> dict:
    return json.loads(ADJUDICATION_JSON.read_text(encoding="utf-8"))


class TestColdReviewAdjudication:
    def test_both_artifacts_exist(self) -> None:
        assert ADJUDICATION_JSON.is_file()
        assert ADJUDICATION_MD.is_file()

    def test_all_supplied_hashes_recorded_as_verified(self, adjudication: dict) -> None:
        """An adjudication that did not check provenance is an opinion, not a finding."""
        hashes = adjudication["integrity"]["supplied_hashes_verified"]
        assert len(hashes) == 5
        for name, entry in hashes.items():
            assert entry["status"] == "MATCH", f"{name} did not verify"
            assert len(entry["expected"]) == 64

    def test_reviewer_material_was_not_relabelled(self, adjudication: dict) -> None:
        """The control against an author revising a verdict after seeing the answer key."""
        integrity = adjudication["integrity"]
        assert integrity["reviewer_labels_preserved_verbatim"] is True
        assert integrity["adjudicator_relabelled_any_reviewer_verdict"] is False
        assert adjudication["reviewer_files_modified"] is False

    def test_engine_behaviour_declared_unchanged(self, adjudication: dict) -> None:
        assert adjudication["engine_behaviour_changed"] is False

    def test_the_disclosed_deviation_is_recorded(self, adjudication: dict) -> None:
        assert adjudication["integrity"]["disclosed_protocol_deviation"].strip()

    def test_every_query_is_adjudicated(self, adjudication: dict) -> None:
        ids = [q["query_id"] for q in adjudication["queries"]]
        assert ids == [f"CR-{n:03d}" for n in range(1, 34)]

    def test_every_query_carries_the_required_fields(self, adjudication: dict) -> None:
        required = (
            "reviewer_question",
            "reviewer_capability_class",
            "reviewer_expected_disposition",
            "actual_fixture_evidence",
            "canonical_source_anchors",
            "fact_directly_stated",
            "calculation_required",
            "cross_document_comparison_required",
            "absence_legitimately_concludable",
            "relevant_document_inaccessible",
            "source_stale_withdrawn_or_superseded",
            "engine_result",
            "citations_resolve",
            "result_supports_requested_fact",
            "final_adjudicated_disposition",
            "reviewer_engine_agreement",
            "defect_owner",
            "severity",
            "confidence",
        )
        for q in adjudication["queries"]:
            missing = [k for k in required if k not in q]
            assert not missing, f"{q['query_id']} missing {missing}"

    def test_defect_owners_come_from_the_defined_set(self, adjudication: dict) -> None:
        for q in adjudication["queries"]:
            assert q["defect_owner"] in VALID_OWNERS, q["defect_owner"]

    def test_metrics_are_reported_separately_not_combined(self, adjudication: dict) -> None:
        """Combining these hides the finding: one capability works, five cannot be expressed."""
        metrics = adjudication["metrics"]
        for section in (
            "citation_integrity",
            "direct_support",
            "capability_specific",
            "result_state_usability",
        ):
            assert section in metrics
        assert "accuracy" not in metrics, "a single accuracy score would hide the result"

    def test_citation_hard_gates_hold(self, adjudication: dict) -> None:
        citation = adjudication["metrics"]["citation_integrity"]
        assert citation["fabricated_citations"] == 0
        assert citation["unlabeled_inference"] == 0
        assert citation["citation_resolution"]["rate"] == 1.0

    def test_rates_carry_confidence_intervals(self, adjudication: dict) -> None:
        """At n=33 a bare percentage misleads; every rate must show its interval."""
        support = adjudication["metrics"]["direct_support"]
        for key in (
            "supported_query_precision",
            "supported_query_recall",
            "false_support_rate",
            "false_abstention_rate",
        ):
            assert "wilson_95" in support[key]
            low, high = support[key]["wilson_95"]
            assert 0.0 <= low <= high <= 1.0

    def test_the_nine_false_supports_are_each_classified(self, adjudication: dict) -> None:
        cases = adjudication["false_support_cases"]
        assert len(cases) == 9
        expected = {
            "CR-013",
            "CR-015",
            "CR-016",
            "CR-018",
            "CR-021",
            "CR-023",
            "CR-031",
            "CR-032",
            "CR-033",
        }
        assert {c["id"] for c in cases} == expected
        for case in cases:
            assert case["classification"] in VALID_OWNERS
            assert case["determination"].strip()

    def test_the_escalation_worthy_gate_is_reported_as_failing(self, adjudication: dict) -> None:
        """Four false supports would have changed what the reviewer did. Target is zero."""
        gate = adjudication["metrics"]["direct_support"]["escalation_worthy_false_supports"]
        assert gate["count"] == 4
        assert gate["status"] == "FAIL"

    def test_both_false_abstentions_record_the_floor_decision(self, adjudication: dict) -> None:
        cases = {c["id"]: c for c in adjudication["false_abstention_cases"]}
        assert set(cases) == {"CR-001", "CR-009"}
        for case in cases.values():
            assert case["floor"] == 0.6555
            assert case["direct_source_available"] is True
            # The point of both cases: retrieval worked and the gate discarded it.
            assert case["fused_rank_of_source"] <= 2
            assert 0 < case["margin_below_floor"] < 0.02
            assert case["generalises_beyond_fixture_phrasing"] is True

    def test_capability_results_cover_every_class(self, adjudication: dict) -> None:
        cap = adjudication["metrics"]["capability_specific"]
        for name in (
            "direct_retrieval",
            "calculation",
            "comparison",
            "absence_detection",
            "contradiction",
            "inaccessible_document_disposition",
            "stale_or_withdrawn_handling",
            "outside_scope_handling",
        ):
            assert name in cap, f"missing capability metric: {name}"
            assert cap[name]["n"] > 0

    def test_the_document_records_protocol_defects_separately(self) -> None:
        """Protocol defects must not be scored as engine retrieval failures."""
        text = ADJUDICATION_MD.read_text(encoding="utf-8")
        assert "Protocol defects" in text
        for topic in (
            "Database contamination",
            "Freeze mechanism",
            "Phase-order",
            "Ingestion-report",
        ):
            assert topic in text, f"protocol defect not covered: {topic}"

    def test_the_document_reaches_a_relevance_score_conclusion(self) -> None:
        text = ADJUDICATION_MD.read_text(encoding="utf-8")
        assert "relevance-score label" in text.lower() or "relevance score" in text.lower()
        assert "1/(60 + rank)" in text or "1/(60+rank)" in text

    def test_new_states_are_justified_generally_not_by_the_fixture(self) -> None:
        text = ADJUDICATION_MD.read_text(encoding="utf-8")
        assert "PRESENT_BUT_UNREADABLE" in text
        assert "SUPERSEDED_OR_WITHDRAWN" in text
        assert "General:" in text, "each proposed state needs a general justification"

    def test_recommendations_are_prioritised_with_scope_and_risk(self) -> None:
        text = ADJUDICATION_MD.read_text(encoding="utf-8")
        for heading in (
            "P0 — correctness",
            "P1 — protocol",
            "P2 — usability",
            "Deferred capability",
        ):
            assert heading in text, f"missing section: {heading}"
        assert "Overfitting risk" in text
        assert "Engine behaviour changes" in text
        assert "Blocks another cold review" in text
