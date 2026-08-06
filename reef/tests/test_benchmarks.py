"""The benchmark chain must stay auditable.

A published number that turns out to be wrong is recoverable. A published number that is
quietly replaced is not — the next reader has no way to know a correction happened. These
tests keep the invalidated record present, labelled, and linked to what superseded it.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

BENCHMARKS = Path(__file__).resolve().parents[1] / "benchmarks"
INVALIDATED = BENCHMARKS / "ridgeline-m1-baseline-invalidated.json"
CORRECTED = BENCHMARKS / "ridgeline-m1-baseline-v2.json"


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class TestInvalidatedBenchmarkIsPreserved:
    def test_it_still_exists(self) -> None:
        """History is not rewritten. The error stays legible."""
        assert INVALIDATED.is_file()

    def test_it_is_labelled_invalid_at_the_top_level(self) -> None:
        data = _load(INVALIDATED)
        assert "INVALIDATED" in data
        assert "invalid" in data["INVALIDATED"]["status"].lower()

    def test_it_names_both_the_recorded_and_the_measured_model(self) -> None:
        """The whole defect in two fields."""
        header = _load(INVALIDATED)["INVALIDATED"]
        assert header["recorded_model"] != header["actually_measured_model"]
        assert "bge" in header["recorded_model"]
        assert "MiniLM" in header["actually_measured_model"]

    def test_it_separates_affected_from_unaffected_metrics(self) -> None:
        """Invalidating a record wholesale would discard model-independent gates that were
        never in question."""
        header = _load(INVALIDATED)["INVALIDATED"]
        assert header["affected_metrics"]
        assert header["unaffected_metrics"]
        # Keys name the metric, values explain the invalidation; both are part of the claim.
        affected = " ".join(f"{k} {v}" for k, v in header["affected_metrics"].items()).lower()
        assert "retrieval" in affected or "recall" in affected
        assert "abstention" in affected
        unaffected = header["unaffected_metrics"]
        assert any(k.startswith("G10") for k in unaffected)

    def test_it_points_at_its_successor(self) -> None:
        header = _load(INVALIDATED)["INVALIDATED"]
        assert header["superseded_by"].endswith("ridgeline-m1-baseline-v2.json")
        assert CORRECTED.is_file()

    def test_the_original_content_is_kept_verbatim(self) -> None:
        data = _load(INVALIDATED)
        original = data["original_record_verbatim"]
        assert original["name"] == "ridgeline-m1-baseline"
        assert original["pipeline"]["embedding_model"] == "BAAI/bge-small-en-v1.5"


class TestCorrectedBenchmarkSchema:
    REQUIRED_TOP_LEVEL = (
        "record_version",
        "supersedes",
        "what_this_is_not",
        "why_v2_exists",
        "reproducibility",
        "fixture",
        "pipeline",
        "model_selection",
        "calibration",
        "corpus",
        "evidence_integrity_gates",
        "gates_not_scored",
        "retrieval",
        "abstention",
        "verification",
        "known_limitations",
    )

    def test_every_required_section_is_present(self) -> None:
        data = _load(CORRECTED)
        missing = [k for k in self.REQUIRED_TOP_LEVEL if k not in data]
        assert not missing, f"missing sections: {missing}"

    def test_it_records_fixture_identity_by_hash(self) -> None:
        fixture = _load(CORRECTED)["fixture"]
        assert len(fixture["corpus_sha256"]) == 64
        assert fixture["answer_key_withheld_from_engine"] is True

    def test_it_records_model_identity_and_dimension(self) -> None:
        pipeline = _load(CORRECTED)["pipeline"]
        assert pipeline["embedding_model"]
        assert pipeline["embedding_dimension"] == 384
        assert pipeline["embedding_model_verified_against_stored_vectors"] is True
        # The census is what makes the claim checkable rather than asserted.
        assert pipeline["stored_model_census"]
        assert list(pipeline["stored_model_census"]) == [pipeline["embedding_model"]]

    def test_the_recorded_model_matches_the_code_default(self) -> None:
        from reef.config import CANONICAL_EMBEDDING_MODEL

        assert _load(CORRECTED)["pipeline"]["embedding_model"] == CANONICAL_EMBEDDING_MODEL

    def test_calibration_metadata_is_carried_not_just_the_number(self) -> None:
        calibration = _load(CORRECTED)["calibration"]
        for key in (
            "similarity_floor",
            "similarity_metric",
            "method",
            "answerable_scores",
            "fitted_negative_scores",
            "heldout_negative_scores",
            "separation_heldout",
            "generalises",
        ):
            assert key in calibration, f"calibration is missing {key}"

    def test_the_recorded_floor_matches_the_shipped_calibration(self) -> None:
        from reef.calibration import load_calibration
        from reef.config import CANONICAL_EMBEDDING_MODEL

        shipped = load_calibration(CANONICAL_EMBEDDING_MODEL)
        assert shipped is not None
        assert _load(CORRECTED)["calibration"]["similarity_floor"] == shipped.similarity_floor

    def test_retrieval_is_reported_as_a_baseline_not_a_gate(self) -> None:
        retrieval = _load(CORRECTED)["retrieval"]
        assert retrieval["is_a_product_gate"] is False
        assert retrieval["threshold"] is None
        assert retrieval["reported_as"] == "baseline"

    def test_the_miss_set_is_recorded_with_reasons(self) -> None:
        misses = _load(CORRECTED)["retrieval"]["verified_miss_set"]
        assert misses
        for miss in misses:
            assert miss["id"].startswith("RDG-")
            assert miss["title"]

    def test_a_failing_gate_is_recorded_as_failing(self) -> None:
        """The abstention gate does not pass. A benchmark that rounded that away would be
        the same class of error this record exists to correct."""
        abstention = _load(CORRECTED)["abstention"]
        assert abstention["passed"] is False
        assert abstention["value"] < abstention["threshold"]
        assert abstention["leaks"]

    def test_synthetic_limitations_are_explicit(self) -> None:
        data = _load(CORRECTED)
        joined = " ".join(data["what_this_is_not"] + data["known_limitations"]).lower()
        assert "synthetic" in joined
        assert "not validated" in joined or "not production-ready" in joined
        assert "customer" in joined

    def test_it_does_not_claim_broader_model_superiority(self) -> None:
        selection = _load(CORRECTED)["model_selection"]
        assert "scope_limit" in selection
        assert "one fixture" in selection["scope_limit"].lower()


class TestNoStaleFiguresAreCited:
    """No document may quote the invalidated retrieval or abstention numbers as current."""

    STALE = ("73.7%", "73.68%", "14/19", "0.42")

    @pytest.mark.parametrize(
        "relative",
        ["README.md", "NEXT-EVALUATIONS.md", "benchmarks/ridgeline-m1-baseline-v2.json"],
    )
    def test_current_documents_do_not_present_stale_figures_as_live(self, relative: str) -> None:
        path = BENCHMARKS.parent / relative
        if not path.is_file():
            pytest.skip(f"{relative} not present")
        text = path.read_text(encoding="utf-8")
        for token in self.STALE:
            if token not in text:
                continue
            # Present is fine only where the surrounding text marks it as superseded.
            for line in text.splitlines():
                if token in line:
                    lowered = line.lower()
                    assert any(
                        marker in lowered
                        for marker in (
                            "invalid",
                            "supersede",
                            "previous",
                            "was ",
                            "no longer",
                            "corrected",
                            "minilm",
                        )
                    ), f"{relative} cites {token} without marking it superseded: {line.strip()}"
