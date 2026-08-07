#!/usr/bin/env bash
# Verify that a cold-review export is genuinely blinded.
#
# Usage: bash verify_blinding.sh <export-directory>
#
# Exits 0 and prints PASS only if every check holds. Prints FAIL with reasons otherwise.
# Safe to run repeatedly; makes no changes.
#
# This is deliberately independent of the builder. The builder works from an allowlist and
# should never produce a bad export; this script assumes it might, and checks the artifact
# rather than the intent.

set -uo pipefail

ROOT="${1:-}"
if [ -z "$ROOT" ] || [ ! -d "$ROOT" ]; then
    echo "usage: bash verify_blinding.sh <export-directory>" >&2
    exit 2
fi
ROOT="$(cd "$ROOT" && pwd)"

# This script necessarily contains every string it searches for. Excluding it from the
# content scans is not a blind spot: it is copied verbatim by the builder and its own
# hash is recorded in the manifest, so tampering is detectable there rather than here.
SELF="verify_blinding.sh"
scan_files() {
    grep -rEl --binary-files=without-match "$1" "$ROOT" 2>/dev/null \
        | grep -v '/\.venv/' \
        | grep -v "/$SELF\$" \
        | grep -v '/BLINDED_EXPORT_MANIFEST\.json$'
}

FAILURES=0
note() { echo "  FAIL  $*"; FAILURES=$((FAILURES + 1)); }
ok()   { echo "  ok    $*"; }

echo "verifying blinded export: $ROOT"
echo

# ---------------------------------------------------------------- 1 · forbidden filenames
echo "[1] answer-key and scorer files"
FORBIDDEN_NAMES=(
    "ground-truth.json" "GROUND_TRUTH.md" "DOCUMENT_INVENTORY.md"
    "EXECUTIVE_FINDINGS_MEMO.md" "ISSUE_REGISTER.md" "MISSING_INFORMATION_REQUEST.md"
    "CALCULATION_LOG.md" "REVIEW_NOTES.md"
    "ridgeline-m1-baseline-v2.json" "ridgeline-m1-baseline-invalidated.json"
    "ridgeline-query-manifest-v2.json" "ridgeline-abstention-failure-analysis.md"
    "ridgeline-retrieval-failure-analysis.md" "EVALUATION_CAPABILITY_TAXONOMY.md"
    "IMPLEMENTATION_EVIDENCE_THRESHOLDS.md" "ABSTENTION_RESULT_CONTRACT.md"
    "ABSTENTION_COLD_REVIEW_PROTOCOL.md" "NEXT-EVALUATIONS.md"
    "SYNTHETIC_DEAL_ROOM_SPEC.md" "DEAL_ROOM_EVAL.md" "SCORECARD.md" "HYPOTHESES.md"
    "evaluate.py" "calibrate_floor.py"
)
hits=0
for name in "${FORBIDDEN_NAMES[@]}"; do
    found="$(find "$ROOT" -name "$name" -not -path '*/.venv/*' -not -name "$SELF" 2>/dev/null | head -3)"
    if [ -n "$found" ]; then note "forbidden file present: $name"; hits=1; fi
done
# `outputs` as a directory is the fixture's worked-answers folder.
if find "$ROOT" -type d -name outputs 2>/dev/null | grep -q .; then
    note "fixture outputs/ directory present"; hits=1
fi
[ "$hits" -eq 0 ] && ok "no answer-key or scorer files"

# ------------------------------------------------------------------ 2 · forbidden strings
echo "[2] planted identifiers and answer labels"
# Finding-id format (RDG-001 … RDG-099) and label vocabulary that only exists in the key.
STRING_PATTERNS=(
    'RDG-[0-9]{3}'
    'cross_document_contradiction'
    'deterministic_calculation'
    'unusual_revenue_recognition'
    'unresolved_ambiguity'
    'expected_conclusion'
    'supporting_excerpt'
    'negative_control'
    'planted_finding'
    'cross_document_discriminating'
    'heldout_negative'
    'calibration_negative'
    'expected_processing_status'
)
hits=0
for pat in "${STRING_PATTERNS[@]}"; do
    found="$(scan_files "$pat" | head -3)"
    if [ -n "$found" ]; then
        note "answer-key string /$pat/ appears in:"
        echo "$found" | sed "s|$ROOT/|          |"
        hits=1
    fi
done
[ "$hits" -eq 0 ] && ok "no planted identifiers or answer labels"

# ------------------------------------------------------------- 3 · version-control storage
#
# The point of this check is that history inherited from the source repository can be read
# back, whatever was deleted from the working tree. A repository the *reviewer* created
# after the export was built carries no such history — it holds only what they committed.
#
# Earlier versions of this script could not tell the two apart and failed both, which made
# the export trip its own check whenever a reviewer froze their questions with `git init`.
# The freeze mechanism is now a detached SHA-256 file (REVIEWER_INSTRUCTIONS.md, Phase 2),
# but a reviewer who reaches for git anyway should not be punished for it.
echo "[3] version-control history"
hits=0
for vc in ".hg" ".svn" ".jj"; do
    if find "$ROOT" -maxdepth 3 -name "$vc" 2>/dev/null | grep -q .; then
        note "$vc present — history is recoverable"; hits=1
    fi
done

# Only the export root may hold a reviewer-created repository. One nested inside deal-room/
# or engine/ was never created by following these instructions.
nested="$(find "$ROOT" -mindepth 2 -maxdepth 4 -name ".git" 2>/dev/null)"
if [ -n "$nested" ]; then
    note "nested .git — history is recoverable:"
    echo "$nested" | sed "s|$ROOT/|          |"
    hits=1
fi

#: Set when a root `.git` has been shown to postdate the export; its storage is then
#: exempt from the scans below, which would otherwise flag it as inherited.
ROOT_GIT_OK=0
if [ -e "$ROOT/.git" ]; then
    built_at="$(python3 - "$ROOT/BLINDED_EXPORT_MANIFEST.json" <<'PY' 2>/dev/null
import datetime, json, sys
print(int(datetime.datetime.fromisoformat(json.load(open(sys.argv[1]))["built_at"]).timestamp()))
PY
)"
    first_commit="$(git -C "$ROOT" log --all --format=%ct --reverse 2>/dev/null | head -1)"
    remotes="$(git -C "$ROOT" remote 2>/dev/null)"
    gitdir="$(git -C "$ROOT" rev-parse --absolute-git-dir 2>/dev/null)"

    if [ ! -d "$ROOT/.git" ]; then
        # A `.git` file rather than a directory points at storage somewhere else, and that
        # storage is not covered by any check here.
        note ".git is a link to an external git directory"; hits=1
    elif [ "$gitdir" != "$ROOT/.git" ]; then
        # Either git cannot read it — in which case nothing below can classify it — or it
        # resolves somewhere this script does not inspect. Both are disqualifying: the
        # exemption exists for a repository whose contents are demonstrably the reviewer's,
        # and this is not one.
        note ".git is not a readable repository rooted here${gitdir:+ (resolves to $gitdir)}"
        hits=1
    elif [ -z "$built_at" ]; then
        note ".git present and the manifest has no build time to compare it against"; hits=1
    elif [ -n "$remotes" ]; then
        note ".git has remotes configured — it is connected to another repository"; hits=1
    elif [ -z "$first_commit" ]; then
        ok ".git present but empty — created here, nothing committed"
        ROOT_GIT_OK=1
    elif [ "$first_commit" -lt "$built_at" ]; then
        note ".git holds commits predating this export — history is inherited"; hits=1
    else
        ok ".git present, created after this export ($(git -C "$ROOT" rev-list --count --all) commit(s), no remotes)"
        ROOT_GIT_OK=1
    fi
fi

# Storage that belongs to an accepted root repository is excluded by path; anything else
# under that name is git-like storage the builder never put there.
git_storage() {
    if [ "$ROOT_GIT_OK" -eq 1 ]; then
        find "$ROOT" -path "$ROOT/.git" -prune -o "$@" -print 2>/dev/null
    else
        find "$ROOT" "$@" -print 2>/dev/null
    fi
}
for extra in "objects" "packed-refs" "logs/HEAD" "ORIG_HEAD" "gitdir"; do
    if git_storage -path "*$extra" | grep -q .; then
        note "git-like storage present: $extra"; hits=1
    fi
done
if git_storage \( -name "*.pack" -o -name "*.idx" \) | grep -q .; then
    note "packfiles present"; hits=1
fi
[ "$hits" -eq 0 ] && ok "no inherited repository history"

# -------------------------------------------------------------------------- 4 · symlinks
echo "[4] symlinks and external references"
links="$(find "$ROOT" -type l 2>/dev/null)"
if [ -n "$links" ]; then
    note "symlinks present (may point outside the export):"
    echo "$links" | sed "s|$ROOT/|          |" | head -5
else
    ok "no symlinks"
fi

# --------------------------------------------------------- 5 · hard links to outside files
echo "[5] hard links"
multi="$(find "$ROOT" -type f -links +1 2>/dev/null | grep -v '/\.venv/' | head -5)"
if [ -n "$multi" ]; then
    note "files with link count > 1 (may share inodes with the source):"
    echo "$multi" | sed "s|$ROOT/|          |"
else
    ok "no multiply-linked files"
fi

# ------------------------------------------------------ 6 · absolute source-repository paths
echo "[6] absolute paths back to the source machine"
hits=0
for pat in '/Users/[a-z]+/Developer' '/home/[a-z]+/Developer' 'reef-embedding-fix' \
           'isaiahramirezdev' 'reef-m1-engine' 'fixtures/reef-deal-room'; do
    found="$(scan_files "$pat" | head -3)"
    if [ -n "$found" ]; then
        note "source path /$pat/ referenced in:"
        echo "$found" | sed "s|$ROOT/|          |"
        hits=1
    fi
done
[ "$hits" -eq 0 ] && ok "no absolute source paths"

# ------------------------------------------------------------ 7 · required files present
# An over-aggressive export is as useless as a leaky one.
echo "[7] required reviewer material"
REQUIRED=(
    "README.md" "BLINDING_PROTOCOL.md" "REVIEWER_INSTRUCTIONS.md" "SCORING_PROTOCOL.md"
    "RESULT_STATES.md" "REVIEWER_OBSERVATIONS_TEMPLATE.md" "ADJUDICATION_HANDOFF.md"
    "QUERY_SUBMISSION_TEMPLATE.json" "EXPECTED_OUTPUT_SCHEMA.json"
    "BLINDED_EXPORT_MANIFEST.json" "verify_blinding.sh"
    "engine/ENGINE_USAGE.md" "engine/setup.sh" "engine/teardown.sh" "engine/alembic.ini"
    "DOCUMENT_INDEX.md"
)
hits=0
for f in "${REQUIRED[@]}"; do
    [ -e "$ROOT/$f" ] || { note "missing required file: $f"; hits=1; }
done
if ! ls "$ROOT"/engine/reef-*.whl >/dev/null 2>&1; then
    note "no engine wheel in engine/"; hits=1
fi
ROOMS="$(find "$ROOT/deal-room" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
if [ "${ROOMS:-0}" -lt 10 ]; then
    note "deal-room has only $ROOMS folders — over-removed?"; hits=1
fi
DOCS="$(find "$ROOT/deal-room" -type f 2>/dev/null | wc -l | tr -d ' ')"
if [ "${DOCS:-0}" -lt 50 ]; then
    note "deal-room has only $DOCS files — over-removed?"; hits=1
fi
[ "$hits" -eq 0 ] && ok "all required material present ($ROOMS folders, $DOCS documents)"

# -------------------------------------------------------------------------- 8 · manifest
echo "[8] manifest integrity"
MANIFEST="$ROOT/BLINDED_EXPORT_MANIFEST.json"
if [ -f "$MANIFEST" ]; then
    if grep -q '"manifest_sha256"' "$MANIFEST" && grep -q '"wheel_sha256"' "$MANIFEST"; then
        ok "manifest records file and wheel hashes"
    else
        note "manifest is missing required hashes"
    fi
    if grep -qE '"(expected_state|expected_disposition|answer|label)"\s*:' "$MANIFEST"; then
        note "manifest appears to contain answers or labels"
    fi
else
    note "no BLINDED_EXPORT_MANIFEST.json"
fi

# ---------------------------------------------------------------- 9 · database isolation
#
# The export is a directory. The index it produces is not: it lives in Postgres, on the
# host, and outlives the directory. Every check above passed once while a foreign
# `cold-review` room — ingested from the answer-key branch before the reviewer's session
# began — sat in the shared `reef` database, because a filesystem check cannot see it.
#
# So the boundary is a database of its own, named for the reviewer, holding exactly one
# room named for the same reviewer. Anything else in there came from somewhere this export
# cannot account for.
echo "[9] database isolation"
ENVFILE="$ROOT/engine/reviewer-env.sh"
if [ ! -f "$ENVFILE" ]; then
    ok "no reviewer database provisioned yet — run engine/setup.sh, then re-run this script"
else
    # Parsed rather than sourced. This script should not execute a file whose integrity is
    # the thing in question.
    field() { sed -n "s/^export $1=\"\(.*\)\"\$/\1/p" "$ENVFILE" | head -1; }
    DB_NAME="$(field REEF_DB_NAME)"
    ROOM_NAME="$(field REEF_ROOM)"
    DB_URL="$(field REEF_DATABASE_URL)"

    for bin in "/opt/homebrew/opt/postgresql@17/bin" "/usr/lib/postgresql/17/bin" \
               "/usr/local/opt/postgresql@17/bin"; do
        [ -d "$bin" ] && export PATH="$bin:$PATH" && break
    done

    if ! printf '%s' "$DB_NAME" | grep -qE '^reef_cr_[a-z0-9_]{2,16}$'; then
        note "database '$DB_NAME' is not a per-reviewer database (expected reef_cr_<id>)"
    elif ! printf '%s' "$ROOM_NAME" | grep -qE '^cold-review-[a-z0-9_]{2,16}$'; then
        note "room '$ROOM_NAME' is not namespaced (expected cold-review-<id>)"
    elif [ "${DB_URL##*/}" != "$DB_NAME" ]; then
        note "REEF_DATABASE_URL points at '${DB_URL##*/}', not at '$DB_NAME'"
    elif ! command -v psql >/dev/null; then
        note "psql not found — database isolation cannot be verified"
    elif ! psql -d postgres -tAc \
            "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
        ok "$DB_NAME does not exist yet — nothing can have leaked into it"
    else
        FOREIGN="$(psql -d "$DB_NAME" -tAc \
            "SELECT name FROM room WHERE name <> '$ROOM_NAME'" 2>/dev/null || true)"
        if [ -n "$FOREIGN" ]; then
            note "$DB_NAME holds room(s) that are not yours — this review is contaminated:"
            echo "$FOREIGN" | sed 's|^|          |'
        else
            OWN="$(psql -d "$DB_NAME" -tAc \
                "SELECT count(*) FROM room WHERE name = '$ROOM_NAME'" 2>/dev/null || echo 0)"
            ok "$DB_NAME holds only $ROOM_NAME (${OWN:-0} room(s))"
        fi
    fi
fi

echo
if [ "$FAILURES" -eq 0 ]; then
    echo "PASS — export is blinded and complete"
    exit 0
fi
echo "FAIL — $FAILURES problem(s) above. Do not hand this export to a reviewer."
exit 1
