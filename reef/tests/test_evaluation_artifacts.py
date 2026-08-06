"""Validators for evaluation data: the query manifest and the cold-review bundle.

Test-only. Nothing here imports or exercises engine behaviour beyond reading constants —
these assert properties of evaluation *artifacts*, which is where the last three defects
lived. A benchmark that claims a configuration it did not run, a harness that scores tasks
retrieval cannot perform, and a review bundle that leaks the answer key are all failures
that no engine test would catch.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

BENCHMARKS = Path(__file__).resolve().parents[1] / "benchmarks"
MANIFEST = BENCHMARKS / "ridgeline-query-manifest-v2.json"
COLD_REVIEW = BENCHMARKS / "cold-review"

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


class TestColdReviewBundle:
    REQUIRED = (
        "README.md",
        "REVIEWER_INSTRUCTIONS.md",
        "QUERY_SUBMISSION_TEMPLATE.json",
        "EXPECTED_OUTPUT_SCHEMA.json",
        "SCORING_PROTOCOL.md",
        "BLINDING_PROTOCOL.md",
        "REVIEWER_OBSERVATIONS_TEMPLATE.md",
        "ADJUDICATION_PROTOCOL.md",
    )

    def test_every_required_file_is_present(self) -> None:
        missing = [name for name in self.REQUIRED if not (COLD_REVIEW / name).is_file()]
        assert not missing, f"cold-review bundle is missing {missing}"

    def test_the_templates_are_valid_json(self) -> None:
        for name in ("QUERY_SUBMISSION_TEMPLATE.json", "EXPECTED_OUTPUT_SCHEMA.json"):
            json.loads((COLD_REVIEW / name).read_text(encoding="utf-8"))

    #: Files whose job is to name the paths that must be removed. Mentioning
    #: `ground-truth.json` in a deletion command is not a leak of its contents.
    MAY_NAME_PATHS = frozenset({"BLINDING_PROTOCOL.md", "verify_blinding.sh", "README.md"})

    def test_the_bundle_leaks_no_finding_identifiers_or_values(self) -> None:
        """The bundle ships to the reviewer. Anything in it, they see.

        Probes for the substance of the answer key — finding ids and planted figures —
        rather than for filenames. A leak here silently converts an independent review into
        a confirmation of the author's own labels.
        """
        leaked: list[str] = []
        substance = [f"RDG-{n:03d}" for n in range(1, 23)] + [
            "22.4",  # the planted concentration figure
            "1.18",  # the planted covenant ratio
            "000418",  # the planted zero-padded identifier
            "Hartwell",  # a planted counterparty
            "Lakeside",  # the planted largest customer
        ]
        for path in COLD_REVIEW.rglob("*"):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for probe in substance:
                if probe in text:
                    leaked.append(f"{path.name}: {probe!r}")
        assert not leaked, "cold-review bundle leaks ground truth:\n  " + "\n  ".join(leaked)

    def test_only_the_blinding_files_name_answer_key_paths(self) -> None:
        """Everything else must not even hint at what exists to be hidden."""
        leaked: list[str] = []
        for path in COLD_REVIEW.rglob("*"):
            if not path.is_file() or path.name in self.MAY_NAME_PATHS:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for probe in ("ground-truth.json", "GROUND_TRUTH", "SYNTHETIC_DEAL_ROOM_SPEC"):
                if probe in text:
                    leaked.append(f"{path.name}: {probe!r}")
        assert not leaked, "\n  ".join(leaked)

    def test_the_bundle_does_not_reveal_the_expected_answers_to_sample_queries(self) -> None:
        """The template carries two illustrative queries. They must be plausible without
        telling the reviewer what the fixture plants."""
        template = json.loads((COLD_REVIEW / "QUERY_SUBMISSION_TEMPLATE.json").read_text())
        assert len(template["queries"]) <= 2, (
            "more than two examples starts to prescribe the reviewer's question set"
        )

    def test_required_distribution_matches_the_instructions(self) -> None:
        template = json.loads((COLD_REVIEW / "QUERY_SUBMISSION_TEMPLATE.json").read_text())
        required = template["$distribution_required"]
        assert required["directly_answerable"] >= 10
        assert required["subject_present_fact_may_be_absent"] >= 5
        assert required["outside_corpus_scope"] >= 5
        assert required["requires_calculation_or_comparison"] >= 5
        assert required["missing_inaccessible_stale_or_unreviewed"] >= 3

    def test_the_output_schema_requires_pre_registration(self) -> None:
        """Labels committed before the engine runs is the control against relabelling."""
        schema = json.loads((COLD_REVIEW / "EXPECTED_OUTPUT_SCHEMA.json").read_text())
        assert "pre_registration" in schema
        assert "queries_file_commit" in schema["pre_registration"]

    def test_the_output_schema_requires_the_resolved_configuration(self) -> None:
        """A result without its configuration is what produced the invalidated benchmark."""
        schema = json.loads((COLD_REVIEW / "EXPECTED_OUTPUT_SCHEMA.json").read_text())
        env = schema["environment"]
        assert "reef_config_output_verbatim" in env
        assert "dotenv_reported" in env

    def test_the_blinding_verifier_is_executable_and_detects_a_leak(self, tmp_path: Path) -> None:
        script = COLD_REVIEW / "verify_blinding.sh"
        assert script.is_file()

        # A checkout that still has the answer key must fail.
        leaky = tmp_path / "leaky"
        (leaky / "fixtures/reef-deal-room").mkdir(parents=True)
        (leaky / "fixtures/reef-deal-room/ground-truth.json").write_text("{}")
        (leaky / "fixtures/reef-deal-room/01_Corporate").mkdir()
        (leaky / "reef").mkdir()
        (leaky / "reef/README.md").write_text("x")
        result = subprocess.run(
            ["bash", str(script), str(leaky)], capture_output=True, text=True, check=False
        )
        assert result.returncode != 0
        assert "LEAK" in result.stdout

        # A correctly blinded checkout must pass.
        clean = tmp_path / "clean"
        (clean / "fixtures/reef-deal-room/01_Corporate").mkdir(parents=True)
        (clean / "reef").mkdir()
        (clean / "reef/README.md").write_text("x")
        result = subprocess.run(
            ["bash", str(script), str(clean)], capture_output=True, text=True, check=False
        )
        assert result.returncode == 0, result.stdout

    def test_the_verifier_catches_over_removal(self, tmp_path: Path) -> None:
        """Deleting the room too would leave the reviewer nothing to read."""
        script = COLD_REVIEW / "verify_blinding.sh"
        empty = tmp_path / "empty"
        empty.mkdir()
        result = subprocess.run(
            ["bash", str(script), str(empty)], capture_output=True, text=True, check=False
        )
        assert result.returncode != 0
        assert "OVER-REMOVED" in result.stdout
