"""The embedding contract: configuration, compatibility, and model-bound calibration.

Each test here corresponds to a way the engine previously produced a confident, wrong, or
silently empty answer. They are regression tests for a real incident, not hypotheticals.
"""

from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

import pytest
from sqlalchemy import select, text

from reef import db
from reef.calibration import (
    CalibrationMissing,
    CalibrationStatus,
    load_calibration,
    model_slug,
    resolve_floor,
)
from reef.config import (
    CANONICAL_EMBEDDING_DIM,
    CANONICAL_EMBEDDING_MAX_TOKENS,
    CANONICAL_EMBEDDING_MODEL,
    IDENTITY_FIELDS,
    Settings,
    configuration_sources,
)
from reef.corpus import (
    CorpusEmbedding,
    CorpusState,
    EmbeddingIncompatible,
    classify,
    inspect_corpus,
    require_compatible,
)
from reef.ingest.intake import Intake
from reef.ingest.pipeline import Pipeline
from reef.models import Chunk, Document
from reef.models_gateway import NullEmbedder
from reef.storage import FilesystemStore

REEF_ROOT = Path(__file__).resolve().parents[1]

OTHER_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


# --------------------------------------------------------------------------- D3
class TestConfigurationSourceOfTruth:
    """`.env.example` and `config.py` disagreed silently, and a benchmark was published
    attributing its numbers to a model it never ran."""

    def test_env_example_matches_the_code_default_for_every_identity_field(self) -> None:
        text_ = (REEF_ROOT / ".env.example").read_text(encoding="utf-8")
        declared: dict[str, str] = {}
        for line in text_.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            declared[key.strip()] = value.strip()

        settings = Settings()
        mismatches: list[str] = []
        for field in IDENTITY_FIELDS:
            key = f"REEF_{field.upper()}"
            if key not in declared:
                mismatches.append(f"{key} is absent from .env.example")
                continue
            expected = str(getattr(settings, field))
            actual = declared[key]
            if actual.lower() != expected.lower():
                mismatches.append(f"{key}: .env.example={actual!r} but code default={expected!r}")

        assert not mismatches, "\n".join(mismatches)

    def test_the_canonical_model_is_referenced_not_duplicated(self) -> None:
        settings = Settings()
        assert settings.embedding_model == CANONICAL_EMBEDDING_MODEL
        assert settings.embedding_dim == CANONICAL_EMBEDDING_DIM
        assert settings.embedding_max_tokens == CANONICAL_EMBEDDING_MAX_TOKENS

    def test_chunk_ceiling_fits_the_canonical_encoder_window(self) -> None:
        """The reason this model is canonical. A chunk larger than the window is truncated
        while still claiming provenance over the text that never reached the model."""
        settings = Settings()
        assert settings.chunk_max_tokens <= settings.embedding_max_tokens

    def test_configuration_sources_reports_defaults(self) -> None:
        sources = {s.field: s for s in configuration_sources(Settings())}
        assert set(sources) == set(IDENTITY_FIELDS)
        assert sources["embedding_model"].origin == "default"
        assert not sources["embedding_model"].is_override

    def test_an_environment_override_is_reported_as_an_override(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("REEF_EMBEDDING_MODEL", OTHER_MODEL)
        settings = Settings()
        source = next(s for s in configuration_sources(settings) if s.field == "embedding_model")
        assert source.origin == "environment"
        assert source.is_override
        assert source.value == OTHER_MODEL
        assert "REEF_EMBEDDING_MODEL" in source.detail


# --------------------------------------------------------------------------- D2
class TestModelBoundCalibration:
    def test_the_canonical_model_has_a_calibration_record(self) -> None:
        calibration = load_calibration(CANONICAL_EMBEDDING_MODEL)
        assert calibration is not None
        assert calibration.embedding_model == CANONICAL_EMBEDDING_MODEL
        assert calibration.embedding_dimension == CANONICAL_EMBEDDING_DIM
        assert calibration.similarity_metric == "cosine"
        assert calibration.fixture_corpus_sha256

    def test_the_record_preserves_the_evidence_behind_the_floor(self) -> None:
        """A floor without its derivation is a magic number with better documentation."""
        calibration = load_calibration(CANONICAL_EMBEDDING_MODEL)
        assert calibration is not None
        assert calibration.answerable.n > 0
        assert calibration.negative.n > 0
        assert calibration.heldout_negative.n > 0
        assert calibration.method
        assert calibration.limitations

    def test_a_calibration_that_does_not_generalise_says_so(self) -> None:
        """The held-out set exists to catch a floor fitted to a small sample. When it does,
        the record must carry the finding rather than only the flattering number."""
        calibration = load_calibration(CANONICAL_EMBEDDING_MODEL)
        assert calibration is not None
        if not calibration.generalises:
            assert calibration.heldout_leaks > 0
            assert any("GENERALISE" in limit.upper() for limit in calibration.limitations)

    def test_an_uncalibrated_model_raises_by_default(self) -> None:
        """No generic fallback. A default floor is what let a MiniLM number govern bge."""
        with pytest.raises(CalibrationMissing) as exc:
            resolve_floor("some/never-calibrated-model", allow_uncalibrated=False)
        assert "never-calibrated-model" in str(exc.value)

    def test_an_uncalibrated_model_may_be_permitted_but_is_labelled(self) -> None:
        resolved = resolve_floor("some/never-calibrated-model", allow_uncalibrated=True)
        assert resolved.status is CalibrationStatus.UNCALIBRATED
        assert resolved.floor is None
        assert not resolved.is_reportable

    def test_a_calibrated_model_resolves_to_its_own_floor(self) -> None:
        resolved = resolve_floor(CANONICAL_EMBEDDING_MODEL, allow_uncalibrated=False)
        assert resolved.status is CalibrationStatus.CALIBRATED
        assert resolved.floor is not None
        assert resolved.is_reportable

    def test_disabled_embedding_is_not_applicable_rather_than_uncalibrated(self) -> None:
        resolved = resolve_floor("none", allow_uncalibrated=False)
        assert resolved.status is CalibrationStatus.NOT_APPLICABLE
        assert resolved.floor is None

    def test_the_minilm_floor_is_not_reused_for_bge(self) -> None:
        """The actual incident: 0.42 was fitted to MiniLM and silently governed bge, taking
        abstention from 100% to 0%."""
        bge = load_calibration(CANONICAL_EMBEDDING_MODEL)
        assert bge is not None
        assert bge.similarity_floor != 0.42, (
            "the bge floor equals the old MiniLM constant; the calibration is not model-specific"
        )

    def test_a_record_with_an_unknown_schema_version_is_refused(self, tmp_path: Path) -> None:
        from reef.calibration import Calibration

        with pytest.raises(ValueError, match="schema"):
            Calibration.from_dict({"schema_version": "99"})

    def test_model_slug_is_filesystem_safe(self) -> None:
        assert model_slug("BAAI/bge-small-en-v1.5") == "BAAI--bge-small-en-v1.5"
        assert "/" not in model_slug(CANONICAL_EMBEDDING_MODEL)


# --------------------------------------------------------------------------- D1
def _seed_chunk(
    session: object, room: uuid.UUID, document_id: uuid.UUID, model: str | None
) -> None:
    """Insert one chunk with a chosen embed_model, bypassing the pipeline."""
    from sqlalchemy.orm import Session

    assert isinstance(session, Session)
    vector = "[" + ",".join(["0.1"] * CANONICAL_EMBEDDING_DIM) + "]"
    session.execute(
        text(
            "INSERT INTO chunk (id, room_id, document_id, span_ids, breadcrumb, text, "
            "token_count, embedding, embed_model, granularity, ordinal) VALUES "
            "(:id, :room, :doc, '{}', '', 'seeded chunk text', 3, CAST(:v AS vector), "
            ":model, 'section', :ord)"
        ),
        {
            "id": str(uuid.uuid4()),
            "room": str(room),
            "doc": str(document_id),
            "v": vector,
            "model": model,
            "ord": 0,
        },
    )


@pytest.fixture
def seeded_room(room: uuid.UUID, tmp_path: Path) -> uuid.UUID:
    """A room with one real document and no vectors, ready for hand-seeded chunks."""
    source = tmp_path / "room"
    source.mkdir()
    (source / "a.txt").write_text("Ridgeline Industrial Services operating summary.\n")
    settings = Settings(
        storage_backend="filesystem",
        storage_root=tmp_path / "store",
        embedding_provider="none",
    )
    store = FilesystemStore(tmp_path / "store")
    Intake(settings=settings, store=store).ingest_directory(room, source)
    Pipeline(settings=settings, store=store, embedder=NullEmbedder()).process_room(room)
    with db.room_session(room) as session:
        session.execute(text("DELETE FROM chunk"))
    return room


@pytest.mark.integration
class TestEmbeddingCompatibility:
    def test_a_room_with_no_vectors_is_unindexed_not_incompatible(
        self, seeded_room: uuid.UUID
    ) -> None:
        """Lexical-only search over an unembedded room is honest, not an error."""
        with db.room_session(seeded_room) as session:
            corpus = require_compatible(session, CANONICAL_EMBEDDING_MODEL)
        assert corpus.state is CorpusState.UNINDEXED
        assert corpus.embedded_chunks == 0

    def test_equal_dimension_but_different_model_is_rejected(self, seeded_room: uuid.UUID) -> None:
        """The whole incident in one assertion. MiniLM and bge are both 384-dimensional, so
        pgvector compares them without complaint and every similarity is meaningless."""
        with db.room_session(seeded_room) as session:
            doc_id = session.execute(select(Document.id)).scalars().first()
            _seed_chunk(session, seeded_room, doc_id, OTHER_MODEL)

        with db.room_session(seeded_room) as session:
            corpus = inspect_corpus(session, CANONICAL_EMBEDDING_MODEL)
            assert corpus.state is CorpusState.MODEL_MISMATCH
            assert corpus.stored_model == OTHER_MODEL

            with pytest.raises(EmbeddingIncompatible) as exc:
                require_compatible(session, CANONICAL_EMBEDDING_MODEL)

        assert exc.value.stored_models == (OTHER_MODEL,)
        assert exc.value.query_model == CANONICAL_EMBEDDING_MODEL
        assert "Re-index" in exc.value.remediation_text
        # The message must name both models; "incompatible" alone is not actionable.
        assert OTHER_MODEL in str(exc.value)
        assert CANONICAL_EMBEDDING_MODEL in str(exc.value)

    def test_matching_model_is_compatible(self, seeded_room: uuid.UUID) -> None:
        with db.room_session(seeded_room) as session:
            doc_id = session.execute(select(Document.id)).scalars().first()
            _seed_chunk(session, seeded_room, doc_id, CANONICAL_EMBEDDING_MODEL)

        with db.room_session(seeded_room) as session:
            corpus = require_compatible(session, CANONICAL_EMBEDDING_MODEL)
        assert corpus.state is CorpusState.COMPATIBLE
        assert corpus.is_searchable_by_vector

    def test_a_mixed_model_room_is_rejected(self, seeded_room: uuid.UUID) -> None:
        """An interrupted re-index. The room is not even internally comparable."""
        with db.room_session(seeded_room) as session:
            doc_id = session.execute(select(Document.id)).scalars().first()
            _seed_chunk(session, seeded_room, doc_id, CANONICAL_EMBEDDING_MODEL)
            _seed_chunk(session, seeded_room, doc_id, OTHER_MODEL)

        with db.room_session(seeded_room) as session:
            corpus = inspect_corpus(session, CANONICAL_EMBEDDING_MODEL)
            assert corpus.state is CorpusState.MIXED_MODELS
            assert len(corpus.stored_models) == 2
            with pytest.raises(EmbeddingIncompatible):
                require_compatible(session, CANONICAL_EMBEDDING_MODEL)

    def test_querying_mid_reindex_is_rejected_rather_than_half_answered(
        self, seeded_room: uuid.UUID
    ) -> None:
        """Half the room re-embedded is a mixed room; answering from half of it silently
        drops the other half."""
        with db.room_session(seeded_room) as session:
            doc_id = session.execute(select(Document.id)).scalars().first()
            for model in (OTHER_MODEL, OTHER_MODEL, CANONICAL_EMBEDDING_MODEL):
                _seed_chunk(session, seeded_room, doc_id, model)

        with db.room_session(seeded_room) as session:
            with pytest.raises(EmbeddingIncompatible) as exc:
                require_compatible(session, CANONICAL_EMBEDDING_MODEL)
        assert exc.value.state is CorpusState.MIXED_MODELS

    def test_search_refuses_a_mismatched_room(self, seeded_room: uuid.UUID) -> None:
        """End to end: the refusal reaches the caller rather than becoming an empty result.

        A silently empty result is indistinguishable from a corpus that genuinely lacks the
        answer, which is why this is an exception and not an outcome.
        """
        from reef.search import search

        with db.room_session(seeded_room) as session:
            doc_id = session.execute(select(Document.id)).scalars().first()
            _seed_chunk(session, seeded_room, doc_id, OTHER_MODEL)

        with pytest.raises(EmbeddingIncompatible):
            search(seeded_room, "operating summary")

    def test_search_does_not_re_embed_the_room(self, seeded_room: uuid.UUID) -> None:
        """Re-indexing is an explicit operation, never a side effect of a query."""
        from reef.search import search

        with db.room_session(seeded_room) as session:
            doc_id = session.execute(select(Document.id)).scalars().first()
            _seed_chunk(session, seeded_room, doc_id, OTHER_MODEL)

        with pytest.raises(EmbeddingIncompatible):
            search(seeded_room, "operating summary")

        with db.room_session(seeded_room) as session:
            models = session.execute(text("SELECT DISTINCT embed_model FROM chunk")).scalars().all()
        assert models == [OTHER_MODEL], "search mutated the corpus"


@pytest.mark.integration
class TestModelIdentityIsPersisted:
    def test_every_indexed_chunk_records_the_model_that_produced_it(
        self, room: uuid.UUID, tmp_path: Path
    ) -> None:
        source = tmp_path / "room"
        source.mkdir()
        (source / "a.csv").write_text("id,name\n000418,Lakeside\n000742,Consolidated\n")

        settings = Settings(storage_backend="filesystem", storage_root=tmp_path / "store")
        store = FilesystemStore(tmp_path / "store")
        Intake(settings=settings, store=store).ingest_directory(room, source)
        Pipeline(settings=settings, store=store).process_room(room)

        with db.room_session(room) as session:
            rows = (
                session.execute(select(Chunk.embed_model).where(Chunk.embedding.is_not(None)))
                .scalars()
                .all()
            )

        assert rows, "nothing was embedded, so the test proved nothing"
        assert set(rows) == {settings.embedding_model}


class TestCorpusStateClassification:
    """Pure classification, including the branch the schema makes unreachable."""

    def test_unattributed_vectors_are_rejected(self) -> None:
        """A vector whose producing model was never recorded cannot be compared to
        anything. A check constraint blocks this for new rows, so it can only arrive as
        legacy data — the guard exists for that case and is tested here directly rather
        than by dropping the constraint at runtime."""
        state = classify(
            embedded_chunks=5,
            unattributed_chunks=1,
            stored_models=(CANONICAL_EMBEDDING_MODEL,),
            query_model=CANONICAL_EMBEDDING_MODEL,
        )
        assert state is CorpusState.UNATTRIBUTED_VECTORS

    def test_unattributed_outranks_every_other_signal(self) -> None:
        assert (
            classify(
                embedded_chunks=5,
                unattributed_chunks=2,
                stored_models=(OTHER_MODEL,),
                query_model=CANONICAL_EMBEDDING_MODEL,
            )
            is CorpusState.UNATTRIBUTED_VECTORS
        )

    def test_every_state_is_reachable(self) -> None:
        cases = {
            CorpusState.UNINDEXED: (0, 0, ()),
            CorpusState.COMPATIBLE: (3, 0, (CANONICAL_EMBEDDING_MODEL,)),
            CorpusState.MODEL_MISMATCH: (3, 0, (OTHER_MODEL,)),
            CorpusState.MIXED_MODELS: (3, 0, (CANONICAL_EMBEDDING_MODEL, OTHER_MODEL)),
            CorpusState.UNATTRIBUTED_VECTORS: (3, 1, (CANONICAL_EMBEDDING_MODEL,)),
        }
        for expected, (embedded, unattributed, models) in cases.items():
            assert (
                classify(
                    embedded_chunks=embedded,
                    unattributed_chunks=unattributed,
                    stored_models=models,
                    query_model=CANONICAL_EMBEDDING_MODEL,
                )
                is expected
            )

    def test_remediation_names_an_action_for_every_failing_state(self) -> None:
        """ "Incompatible" alone is not actionable. Each failure must say what to do."""
        for state in (
            CorpusState.MODEL_MISMATCH,
            CorpusState.MIXED_MODELS,
            CorpusState.UNATTRIBUTED_VECTORS,
            CorpusState.UNINDEXED,
        ):
            corpus = CorpusEmbedding(
                state=state,
                stored_models=(OTHER_MODEL,),
                embedded_chunks=1,
                total_chunks=1,
                unattributed_chunks=1 if state is CorpusState.UNATTRIBUTED_VECTORS else 0,
                query_model=CANONICAL_EMBEDDING_MODEL,
            )
            assert corpus.remediation(), f"{state} has no remediation text"


class TestCalibrationDataShipsWithThePackage:
    def test_the_record_is_inside_the_package_not_beside_it(self) -> None:
        """It must survive `pip install`; a calibration that only exists in the source
        checkout would leave an installed engine silently uncalibrated."""
        packaged = REEF_ROOT / "src" / "reef" / "calibration_data"
        assert packaged.is_dir()
        records = list(packaged.glob("*.json"))
        assert records, "no calibration records are packaged"
        for record in records:
            data = json.loads(record.read_text(encoding="utf-8"))
            assert data["embedding_model"].replace("/", "--") == record.stem
            assert re.match(r"^\d+$", str(data["pipeline_version"]))
