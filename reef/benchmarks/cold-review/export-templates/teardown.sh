#!/usr/bin/env bash
# Drop the database this review created. Run it when the review is over, or to start again
# from empty after a false start.
#
# The export's files are yours to keep. The database is shared infrastructure on this host
# and outlives the directory unless something removes it — which is how one review's index
# ended up visible to the next.
#
# Usage: bash teardown.sh <your-reviewer-id>
set -euo pipefail
cd "$(dirname "$0")"

REVIEWER_ID="${1:-${REEF_REVIEWER_ID:-}}"
if [ -z "$REVIEWER_ID" ] && [ -f reviewer-env.sh ]; then
    # shellcheck disable=SC1091
    . ./reviewer-env.sh
    REVIEWER_ID="${REEF_REVIEWER_ID:-}"
fi
if ! printf '%s' "${REVIEWER_ID:-}" | grep -qE '^[a-z0-9_]{2,16}$'; then
    echo "usage: bash teardown.sh <your-reviewer-id>" >&2
    exit 2
fi

DB_NAME="reef_cr_${REVIEWER_ID}"

for bin in "/opt/homebrew/opt/postgresql@17/bin" "/usr/lib/postgresql/17/bin" "/usr/local/opt/postgresql@17/bin"; do
    [ -d "$bin" ] && export PATH="$bin:$PATH" && break
done
command -v psql >/dev/null || { echo "psql not found"; exit 1; }

# Named explicitly so this can never be pointed at the host's shared `reef` database by a
# stray environment variable.
case "$DB_NAME" in
    reef_cr_*) ;;
    *) echo "refusing to drop '$DB_NAME' — teardown only removes reef_cr_* databases" >&2; exit 1 ;;
esac

echo "dropping database $DB_NAME"
psql -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);"

rm -f reviewer-env.sh run.sh
echo "done — reviewer-env.sh and run.sh removed; re-run setup.sh to start again"
