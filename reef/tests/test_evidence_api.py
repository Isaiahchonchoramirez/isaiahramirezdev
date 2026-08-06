"""End-to-end: a real directory through the pipeline, then search and evidence over HTTP.

These run against the real database and the real extractors. Mocking either would test the
mocks — and the property under test is precisely that a fact survives the whole journey
from a file on disk to a rectangle on a page.
"""

from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from reef.api import app
from reef.config import Settings
from reef.evidence import EvidenceNotFound, EvidenceService
from reef.ingest.intake import Intake
from reef.ingest.pipeline import Pipeline
from reef.models_gateway import NullEmbedder
from reef.search import Outcome, search
from reef.storage import FilesystemStore

pytestmark = pytest.mark.integration


@pytest.fixture
def populated_room(room: uuid.UUID, tmp_path: Path) -> uuid.UUID:
    """A small room built from real files, embedding disabled for speed.

    With `NullEmbedder` the vector arm is empty, so retrieval here exercises the lexical
    path and the abstention gate's lexical branch.
    """
    source = tmp_path / "room"
    (source / "03_Customers").mkdir(parents=True)
    (source / "03_Customers" / "customer_master.csv").write_text(
        "customer_id,customer_name,status\n"
        "000418,Lakeside Steel Processing Co.,Active\n"
        "000742,Consolidated Foundry Group,Active\n"
    )
    (source / "03_Customers" / "concentration.md").write_text(
        "# Customer concentration\n\n"
        "## FY2025\n\n"
        "The largest customer represents 22.4 percent of fiscal 2025 revenue.\n"
    )

    settings = Settings(
        storage_backend="filesystem",
        storage_root=tmp_path / "store",
        embedding_provider="none",
    )
    store = FilesystemStore(tmp_path / "store")
    Intake(settings=settings, store=store).ingest_directory(room, source)
    Pipeline(settings=settings, store=store, embedder=NullEmbedder()).process_room(room)
    return room


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestEvidenceResolution:
    def test_a_search_hit_resolves_to_an_exact_source_region(
        self, populated_room: uuid.UUID, tmp_path: Path
    ) -> None:
        """The whole product claim in one assertion: a retrieved fact traces back to the
        precise place it came from, not merely to a filename."""
        result = search(
            populated_room,
            "largest customer percent of fiscal 2025 revenue",
            embedder=NullEmbedder(),
        )
        assert result.outcome is Outcome.FOUND

        hit = result.hits[0]
        assert hit.span_ids

        service = EvidenceService(
            Settings(storage_backend="filesystem", storage_root=tmp_path / "store")
        )
        regions = service.resolve_chunk(populated_room, hit.chunk_id)
        assert regions
        region = regions[0]
        assert region.filename
        assert region.locator
        assert region.page_number >= 1
        assert region.text

    def test_csv_row_anchor_points_at_the_right_row(
        self, populated_room: uuid.UUID, tmp_path: Path
    ) -> None:
        result = search(populated_room, "Lakeside Steel Processing", embedder=NullEmbedder())
        assert result.outcome is Outcome.FOUND

        service = EvidenceService(
            Settings(storage_backend="filesystem", storage_root=tmp_path / "store")
        )
        found = False
        for hit in result.hits:
            for region in service.resolve_chunk(populated_room, hit.chunk_id):
                if "000418" in region.text:
                    # Header is row 1, so Lakeside is row 2. Row index tolerance is zero.
                    assert region.locator == "row 2"
                    found = True
        assert found, "the Lakeside row was never resolved"

    def test_leading_zeros_survive_the_whole_pipeline(
        self, populated_room: uuid.UUID, tmp_path: Path
    ) -> None:
        """`000418` becoming `418` anywhere between disk and the evidence API destroys the
        join key. This asserts it at the far end, after intake, extraction, chunking and
        storage have each had a chance to break it."""
        service = EvidenceService(
            Settings(storage_backend="filesystem", storage_root=tmp_path / "store")
        )
        result = search(populated_room, "Lakeside Steel Processing", embedder=NullEmbedder())
        texts = [
            region.text
            for hit in result.hits
            for region in service.resolve_chunk(populated_room, hit.chunk_id)
        ]
        assert any("000418" in t for t in texts)

    def test_context_returns_surrounding_text(
        self, populated_room: uuid.UUID, tmp_path: Path
    ) -> None:
        service = EvidenceService(
            Settings(storage_backend="filesystem", storage_root=tmp_path / "store")
        )
        result = search(populated_room, "Consolidated Foundry Group", embedder=NullEmbedder())
        span_id = result.hits[0].span_ids[0]
        context = service.context_for_span(populated_room, span_id, neighbours=1)
        assert context.region.text
        assert context.before or context.after

    def test_an_unknown_span_is_a_lookup_error_not_an_empty_result(
        self, room: uuid.UUID, tmp_path: Path
    ) -> None:
        """A bad id and a span with no text are different problems and must look different."""
        service = EvidenceService(
            Settings(storage_backend="filesystem", storage_root=tmp_path / "store")
        )
        with pytest.raises(EvidenceNotFound):
            service.resolve_span(room, uuid.uuid4())


class TestHttpApi:
    def test_health(self, client: TestClient) -> None:
        assert client.get("/health").json() == {"status": "ok"}

    def test_search_returns_hits_with_locators(
        self, client: TestClient, populated_room: uuid.UUID
    ) -> None:
        response = client.get(
            f"/rooms/{populated_room}/search", params={"q": "Lakeside Steel Processing"}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["outcome"] == "found"
        assert body["hits"]
        assert body["hits"][0]["locators"]

    def test_abstention_is_a_result_not_an_empty_list(
        self, client: TestClient, populated_room: uuid.UUID
    ) -> None:
        response = client.get(
            f"/rooms/{populated_room}/search",
            params={"q": "cryptocurrency treasury holdings in Singapore"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["outcome"] == "not_found_in_corpus"
        assert body["detail"], "abstention must say why"
        assert body["hits"] == []

    def test_coverage_accounts_for_every_file(
        self, client: TestClient, populated_room: uuid.UUID
    ) -> None:
        response = client.get(f"/rooms/{populated_room}/coverage")
        assert response.status_code == 200
        body = response.json()
        assert body["total_files"] == 2
        assert sum(body["by_state"].values()) == body["total_files"]

    def test_unknown_room_is_404(self, client: TestClient) -> None:
        response = client.get(f"/rooms/{uuid.uuid4()}/search", params={"q": "anything"})
        assert response.status_code == 404

    def test_evidence_endpoint_resolves_a_chunk(
        self, client: TestClient, populated_room: uuid.UUID
    ) -> None:
        hits = client.get(
            f"/rooms/{populated_room}/search", params={"q": "Lakeside Steel Processing"}
        ).json()["hits"]
        chunk_id = hits[0]["chunk_id"]

        response = client.get(f"/rooms/{populated_room}/evidence/chunks/{chunk_id}")
        assert response.status_code == 200
        regions = response.json()
        assert regions
        assert regions[0]["locator"]
        assert regions[0]["page_number"] >= 1

    def test_unrendered_page_says_how_to_get_one(
        self, client: TestClient, populated_room: uuid.UUID
    ) -> None:
        hits = client.get(
            f"/rooms/{populated_room}/search", params={"q": "Lakeside Steel Processing"}
        ).json()["hits"]
        document_id = hits[0]["document_id"]
        response = client.get(f"/rooms/{populated_room}/documents/{document_id}/pages/1/image")
        assert response.status_code == 404
        assert "render" in response.json()["detail"]
