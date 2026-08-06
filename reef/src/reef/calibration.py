"""Model-bound abstention calibration.

A similarity floor is a property of an embedding model, not of Reef. `search.py` used to
hold a bare `SIMILARITY_FLOOR = 0.42` with no binding to the model that produced the
distribution it was fitted to. That constant was calibrated against
`all-MiniLM-L6-v2`; applied unchanged to `bge-small-en-v1.5` it admitted **every** negative
query, because bge scores the same corpus in a different, compressed range. Abstention went
from 100% to 0% with no code change and no error — the gate the architecture calls "the
most important component in the system" silently stopped working.

So a floor is no longer a number. It is a record that names the model it was fitted to, the
data it was fitted on, the ranges observed, and when. A model with no such record is
`UNCALIBRATED`, and that is an explicit state rather than a fallback: searching an
uncalibrated model requires `REEF_ALLOW_UNCALIBRATED_SEARCH=true`, and every result from
such a run is labelled so its abstention numbers cannot be reported as passed.

Records live in `calibration_data/` as JSON, one per model, shipped inside the package.
They are data, not code, so re-calibrating does not require a release.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import StrEnum
from functools import lru_cache
from importlib import resources
from pathlib import Path
from typing import Any

CALIBRATION_SCHEMA_VERSION = "1"

#: Where packaged calibration records live, relative to the `reef` package.
CALIBRATION_PACKAGE = "reef.calibration_data"


class CalibrationStatus(StrEnum):
    #: A record exists for this model and was fitted on named data.
    CALIBRATED = "calibrated"
    #: No record exists for this model. Not an error on its own — an explicit state that
    #: callers must decide about.
    UNCALIBRATED = "uncalibrated"
    #: Embedding is switched off entirely; there is no vector arm to gate.
    NOT_APPLICABLE = "not_applicable"


class CalibrationMissing(RuntimeError):
    """Raised when search would need a floor that has not been calibrated for this model.

    Carries the model id so the message can tell an operator exactly what to calibrate
    rather than making them infer it.
    """

    def __init__(self, model_id: str) -> None:
        self.model_id = model_id
        super().__init__(
            f"no abstention calibration for embedding model {model_id!r}. "
            "A floor fitted to a different model is not valid for this one — measured: the "
            "floor fitted to all-MiniLM-L6-v2 admitted every negative query under "
            "bge-small-en-v1.5. Calibrate the model, or set "
            "REEF_ALLOW_UNCALIBRATED_SEARCH=true to proceed with results labelled "
            "uncalibrated (abstention metrics from such a run are not reportable)."
        )


@dataclass(frozen=True, slots=True)
class ScoreRange:
    n: int
    minimum: float
    maximum: float
    mean: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "n": self.n,
            "min": round(self.minimum, 4),
            "max": round(self.maximum, 4),
            "mean": round(self.mean, 4),
        }

    @classmethod
    def of(cls, scores: list[float]) -> ScoreRange:
        if not scores:
            return cls(0, 0.0, 0.0, 0.0)
        return cls(len(scores), min(scores), max(scores), sum(scores) / len(scores))


@dataclass(frozen=True, slots=True)
class Calibration:
    """A similarity floor with the evidence that justifies it."""

    embedding_model: str
    embedding_dimension: int
    similarity_metric: str
    similarity_floor: float
    pipeline_version: str
    fixture_name: str
    fixture_version: str
    fixture_corpus_sha256: str
    calibrated_at: str
    answerable: ScoreRange
    negative: ScoreRange
    #: Negatives never used to place the floor. The honest test of whether it generalises.
    heldout_negative: ScoreRange
    #: How many held-out negatives the fitted floor fails to reject.
    heldout_leaks: int
    method: str
    limitations: list[str] = field(default_factory=list)
    schema_version: str = CALIBRATION_SCHEMA_VERSION
    status: CalibrationStatus = CalibrationStatus.CALIBRATED

    @property
    def separation(self) -> float:
        """Gap between the weakest answerable query and the strongest fitted negative.

        Positive means some floor separates the two sets on the fitting data. It says
        nothing about whether that floor generalises — `heldout_separation` does.
        """
        return self.answerable.minimum - self.negative.maximum

    @property
    def heldout_separation(self) -> float:
        """The number that actually matters.

        Negative means the held-out negatives reach into the answerable range and **no
        floor separates the two sets**. A positive fitted `separation` alongside a negative
        held-out one means the fit was an artifact of a small sample, which is precisely
        what a held-out set exists to expose.
        """
        return self.answerable.minimum - self.heldout_negative.maximum

    @property
    def generalises(self) -> bool:
        return self.heldout_leaks == 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "status": str(self.status),
            "embedding_model": self.embedding_model,
            "embedding_dimension": self.embedding_dimension,
            "similarity_metric": self.similarity_metric,
            "similarity_floor": self.similarity_floor,
            "pipeline_version": self.pipeline_version,
            "calibrated_at": self.calibrated_at,
            "fixture": {
                "name": self.fixture_name,
                "version": self.fixture_version,
                "corpus_sha256": self.fixture_corpus_sha256,
            },
            "answerable_scores": self.answerable.to_dict(),
            "negative_scores": self.negative.to_dict(),
            "heldout_negative_scores": self.heldout_negative.to_dict(),
            "heldout_leaks": self.heldout_leaks,
            "separation_fitted": round(self.separation, 4),
            "separation_heldout": round(self.heldout_separation, 4),
            "generalises": self.generalises,
            "method": self.method,
            "limitations": self.limitations,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Calibration:
        if data.get("schema_version") != CALIBRATION_SCHEMA_VERSION:
            raise ValueError(
                f"calibration schema {data.get('schema_version')!r} is not "
                f"{CALIBRATION_SCHEMA_VERSION!r}; refusing to guess its meaning"
            )
        fixture = data["fixture"]
        return cls(
            embedding_model=data["embedding_model"],
            embedding_dimension=int(data["embedding_dimension"]),
            similarity_metric=data["similarity_metric"],
            similarity_floor=float(data["similarity_floor"]),
            pipeline_version=str(data["pipeline_version"]),
            fixture_name=fixture["name"],
            fixture_version=fixture["version"],
            fixture_corpus_sha256=fixture["corpus_sha256"],
            calibrated_at=data["calibrated_at"],
            answerable=_range(data["answerable_scores"]),
            negative=_range(data["negative_scores"]),
            heldout_negative=_range(data["heldout_negative_scores"]),
            heldout_leaks=int(data["heldout_leaks"]),
            method=data["method"],
            limitations=list(data.get("limitations", [])),
        )


def _range(data: dict[str, Any]) -> ScoreRange:
    return ScoreRange(
        n=int(data["n"]),
        minimum=float(data["min"]),
        maximum=float(data["max"]),
        mean=float(data["mean"]),
    )


def model_slug(model_id: str) -> str:
    """Filesystem-safe name for a model id. `BAAI/bge-small-en-v1.5` -> `BAAI--bge-...`."""
    return model_id.replace("/", "--")


@lru_cache(maxsize=8)
def load_calibration(model_id: str) -> Calibration | None:
    """Return the calibration record for a model, or None when there is none.

    None is a legitimate answer, not an error. What to do about it is the caller's
    decision, made explicitly in `resolve_floor`.
    """
    filename = f"{model_slug(model_id)}.json"
    try:
        source = resources.files(CALIBRATION_PACKAGE).joinpath(filename)
        if not source.is_file():
            return None
        return Calibration.from_dict(json.loads(source.read_text(encoding="utf-8")))
    except (FileNotFoundError, ModuleNotFoundError):
        return None


def write_calibration(calibration: Calibration, directory: Path) -> Path:
    """Persist a record. Used by the calibration procedure, never at request time."""
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{model_slug(calibration.embedding_model)}.json"
    path.write_text(json.dumps(calibration.to_dict(), indent=2) + "\n", encoding="utf-8")
    load_calibration.cache_clear()
    return path


@dataclass(frozen=True, slots=True)
class ResolvedFloor:
    floor: float | None
    status: CalibrationStatus
    calibration: Calibration | None

    @property
    def is_reportable(self) -> bool:
        """Whether abstention numbers from a run using this floor may be reported as passed."""
        return self.status is CalibrationStatus.CALIBRATED


def resolve_floor(model_id: str, allow_uncalibrated: bool) -> ResolvedFloor:
    """Resolve the abstention floor for a model, or refuse.

    There is deliberately no default floor. A generic fallback is what turns a silent model
    swap into a silently broken gate, and the gate exists to keep unsupported answers out
    of a customer-facing evidence claim.
    """
    if model_id == "none":
        return ResolvedFloor(None, CalibrationStatus.NOT_APPLICABLE, None)

    calibration = load_calibration(model_id)
    if calibration is not None:
        return ResolvedFloor(
            calibration.similarity_floor, CalibrationStatus.CALIBRATED, calibration
        )

    if not allow_uncalibrated:
        raise CalibrationMissing(model_id)

    # Explicitly uncalibrated: no floor is applied, so the vector arm cannot abstain on
    # score. Results carry the status and callers must not report abstention as passed.
    return ResolvedFloor(None, CalibrationStatus.UNCALIBRATED, None)
