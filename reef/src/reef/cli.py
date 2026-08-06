"""Command line for the engine.

ADR-003 §4's deliverable: "two HTTP APIs — search and evidence — plus a CLI that ingests a
directory and reports a coverage statement."
"""

from __future__ import annotations

import logging
import sys
import uuid
from pathlib import Path
from typing import Annotated

import structlog
import typer
from rich.console import Console
from rich.table import Table
from sqlalchemy import func, select, text

from reef import db
from reef.config import get_settings
from reef.ingest.intake import Intake
from reef.ingest.pipeline import Pipeline
from reef.models import Document, ProcessingState, Room
from reef.search import Outcome, search

app = typer.Typer(
    add_completion=False,
    help="Reef ingestion and evidence engine. Fixture data only — see ADR-003.",
)
console = Console()

#: The answer key must never reach the system under test (DEAL_ROOM_EVAL.md step 1).
DEFAULT_EXCLUDE = frozenset({"ground-truth.json", "GROUND_TRUTH.md", "README.md", "outputs"})


def _configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else getattr(logging, get_settings().log_level, logging.INFO)
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(level),
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="%H:%M:%S"),
            structlog.dev.ConsoleRenderer(),
        ],
    )


def _resolve_room(name_or_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(name_or_id)
    except ValueError:
        pass
    with db.admin_session() as session:
        room = session.execute(select(Room).where(Room.name == name_or_id)).scalar_one_or_none()
        if room is None:
            console.print(f"[red]no room named {name_or_id!r}[/red]")
            raise typer.Exit(1)
        return room.id


@app.command()
def init() -> None:
    """Check the database is reachable and migrated."""
    try:
        with db.get_engine().connect() as conn:
            version = conn.execute(text("SELECT current_setting('server_version')")).scalar_one()
            has_vector = conn.execute(
                text("SELECT count(*) FROM pg_extension WHERE extname='vector'")
            ).scalar_one()
            tables = conn.execute(
                text(
                    "SELECT count(*) FROM information_schema.tables "
                    "WHERE table_schema='public' AND table_name IN "
                    "('document','span','chunk','claim','support')"
                )
            ).scalar_one()
    except Exception as exc:
        console.print(f"[red]database unreachable:[/red] {exc}")
        console.print(
            "run [bold]ops/bootstrap-local-db.sh[/bold] then [bold]alembic upgrade head[/bold]"
        )
        raise typer.Exit(1) from exc

    console.print(f"postgres [green]{version}[/green]")
    console.print(f"pgvector {'[green]present[/green]' if has_vector else '[red]missing[/red]'}")
    console.print(f"evidence tables: [green]{tables}/5[/green]")
    if tables < 5:
        console.print("run [bold]alembic upgrade head[/bold]")
        raise typer.Exit(1)


@app.command()
def ingest(
    source: Annotated[Path, typer.Argument(help="Directory to ingest")],
    room: Annotated[str, typer.Option(help="Room name to create or reuse")] = "default",
    render: Annotated[bool, typer.Option(help="Render PDF page images")] = False,
    verbose: Annotated[bool, typer.Option("--verbose", "-v")] = False,
) -> None:
    """Ingest a directory and report a coverage statement."""
    _configure_logging(verbose)

    if not source.is_dir():
        console.print(f"[red]not a directory:[/red] {source}")
        raise typer.Exit(1)

    with db.admin_session() as session:
        existing = session.execute(select(Room).where(Room.name == room)).scalar_one_or_none()
        if existing is None:
            room_id = uuid.uuid4()
            session.add(Room(id=room_id, name=room))
        else:
            room_id = existing.id

    console.print(f"room [bold]{room}[/bold] ({room_id})")

    intake_result = Intake().ingest_directory(room_id, source.resolve(), exclude=DEFAULT_EXCLUDE)
    console.print(f"registered [bold]{intake_result.total}[/bold] files")

    pipeline_result = Pipeline().process_room(room_id, render_pages=render)
    console.print(
        f"processed [bold]{pipeline_result.processed}[/bold] documents, "
        f"{pipeline_result.chunks} chunks, {pipeline_result.embedded} embedded"
    )
    if pipeline_result.failures:
        console.print("[yellow]failures:[/yellow]")
        for name, reason in pipeline_result.failures:
            console.print(f"  {name}: {reason}")

    coverage(room)


@app.command()
def coverage(
    room: Annotated[str, typer.Argument(help="Room name or id")] = "default",
) -> None:
    """Print the coverage statement: every file and its processing state.

    Derived from the document rows rather than from a cached counter, because a counter
    that disagrees with the rows is how a silent omission looks from the outside.
    """
    room_id = _resolve_room(room)

    with db.room_session(room_id) as session:
        rows = session.execute(
            select(Document.processing_state, func.count())
            .group_by(Document.processing_state)
            .order_by(func.count().desc())
        ).all()
        total = session.execute(select(func.count()).select_from(Document)).scalar_one()
        problems = session.execute(
            select(
                Document.filename,
                Document.folder_path,
                Document.processing_state,
                Document.state_detail,
            )
            .where(
                Document.processing_state.in_([ProcessingState.UNSUPPORTED, ProcessingState.FAILED])
            )
            .order_by(Document.folder_path, Document.filename)
        ).all()

    table = Table(title=f"coverage — {total} files supplied", show_header=True)
    table.add_column("state")
    table.add_column("files", justify="right")
    table.add_column("share", justify="right")
    for state, count in rows:
        table.add_row(state, str(count), f"{100 * count / total:.1f}%" if total else "—")
    console.print(table)

    if problems:
        detail = Table(title="not processed", show_header=True)
        detail.add_column("file")
        detail.add_column("state")
        detail.add_column("reason")
        for filename, folder, state, reason in problems:
            path = f"{folder}/{filename}" if folder else filename
            detail.add_row(path, state, reason or "")
        console.print(detail)


@app.command()
def query(
    question: Annotated[str, typer.Argument(help="What to search for")],
    room: Annotated[str, typer.Option(help="Room name or id")] = "default",
    limit: Annotated[int, typer.Option(help="Results to return")] = 8,
) -> None:
    """Search a room. Abstains rather than guessing when nothing scores above the floor."""
    room_id = _resolve_room(room)
    result = search(room_id, question, limit=limit)

    if result.outcome is Outcome.NOT_FOUND:
        console.print(f"[yellow]not found in this corpus[/yellow] — {result.detail}")
        return

    for index, hit in enumerate(result.hits, start=1):
        path = f"{hit.folder_path}/{hit.filename}" if hit.folder_path else hit.filename
        anchor = ", ".join(dict.fromkeys(hit.locators)) or "—"
        console.print(
            f"[bold]{index}.[/bold] {path}  [dim]{anchor}[/dim]  [dim]{hit.score:.4f}[/dim]"
        )
        snippet = hit.text.replace("\n", " ").replace("\t", " │ ")
        console.print(f"   {snippet[:220]}")


@app.command()
def rooms() -> None:
    """List rooms."""
    with db.admin_session() as session:
        found = session.execute(select(Room).order_by(Room.created_at)).scalars().all()
    if not found:
        console.print("no rooms")
        return
    table = Table(show_header=True)
    table.add_column("name")
    table.add_column("id")
    table.add_column("created")
    for room in found:
        table.add_row(room.name, str(room.id), room.created_at.strftime("%Y-%m-%d %H:%M"))
    console.print(table)


@app.command()
def drop(
    room: Annotated[str, typer.Argument(help="Room name or id")],
    yes: Annotated[bool, typer.Option("--yes", help="Skip confirmation")] = False,
) -> None:
    """Delete a room and everything derived from it.

    Deletion is real: documents, spans, chunks, embeddings and claims all cascade. A
    delete that leaves vectors behind is a lie with legal consequences.
    """
    room_id = _resolve_room(room)
    if not yes and not typer.confirm(f"delete room {room} and all its documents?"):
        raise typer.Abort()

    with db.admin_session() as session:
        session.execute(text("DELETE FROM room WHERE id = :id"), {"id": str(room_id)})
    console.print(f"deleted room [bold]{room}[/bold]")


def main() -> None:  # pragma: no cover
    try:
        app()
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":  # pragma: no cover
    main()


@app.command()
def evaluate(
    fixture: Annotated[Path, typer.Option(help="Fixture root")] = Path(
        "../fixtures/reef-deal-room"
    ),
    r2: Annotated[bool, typer.Option(help="Include the 11_Update_R2 delta")] = False,
    json_out: Annotated[
        Path | None, typer.Option("--json", help="Write the report as JSON")
    ] = None,
    verbose: Annotated[bool, typer.Option("--verbose", "-v")] = False,
) -> None:
    """Score the engine against the deal-room fixture.

    The answer key is withheld from the engine; the harness reads it only after ingestion.
    """
    import json as json_module

    from reef.evaluate import run_evaluation

    _configure_logging(verbose)

    if not (fixture / "ground-truth.json").is_file():
        console.print(f"[red]no ground-truth.json under[/red] {fixture}")
        raise typer.Exit(1)

    report = run_evaluation(fixture.resolve(), include_r2=r2)

    table = Table(
        title=f"deal-room eval — fixture {report.fixture_version} — run {report.run_label}"
    )
    table.add_column("gate")
    table.add_column("measure")
    table.add_column("value", justify="right")
    table.add_column("bar", justify="right")
    table.add_column("", justify="center")
    for gate in report.gates:
        mark = "[green]pass[/green]" if gate.passed else "[red]FAIL[/red]"
        comparator = "≥" if gate.higher_is_better else "≤"
        table.add_row(
            gate.gate,
            gate.description,
            f"{gate.value:.2%}" if gate.higher_is_better else f"{gate.value:.0f}",
            f"{comparator}{gate.threshold:.0%}"
            if gate.higher_is_better
            else f"≤{gate.threshold:.0f}",
            mark,
        )
    console.print(table)

    for gate in report.gates:
        if gate.detail:
            console.print(f"  [dim]{gate.gate}: {gate.detail}[/dim]")

    diagnostics = report.diagnostics
    console.print()
    console.print("[bold]diagnostics[/bold]")
    table_diag = diagnostics["table_extraction"]
    console.print(
        f"  zero-padded values preserved: {table_diag['zero_padded_values_preserved']} "
        f"across {table_diag['cells_sampled']} sampled cells "
        f"(e.g. {', '.join(table_diag['examples'][:3]) or '—'})"
    )
    retrieval = diagnostics["retrieval"]
    console.print(
        f"  retrieval recall: {len(retrieval['recalled'])}/{retrieval['findings_scored']} findings"
    )
    for miss in retrieval["missed"][:8]:
        console.print(f"    [yellow]miss[/yellow] {miss['id']} {miss['title'][:56]}")
    console.print(
        f"  not scored (finding layer, not built): {', '.join(diagnostics['not_scored']['gates'])}"
    )

    if json_out is not None:
        json_out.write_text(json_module.dumps(report.to_dict(), indent=2))
        console.print(f"\nwrote {json_out}")

    console.print()
    if report.passed:
        console.print("[green]all scored gates pass[/green]")
    else:
        console.print("[red]one or more gates failed[/red]")
        raise typer.Exit(1)
