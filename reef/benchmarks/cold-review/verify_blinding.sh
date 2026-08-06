#!/usr/bin/env bash
# Fails if a blinded checkout still contains material the reviewer must not see.
# Usage: bash verify_blinding.sh <checkout-root>
set -uo pipefail
ROOT="${1:-.}"
FORBIDDEN=(
  "fixtures/reef-deal-room/ground-truth.json"
  "fixtures/reef-deal-room/GROUND_TRUTH.md"
  "fixtures/reef-deal-room/README.md"
  "fixtures/reef-deal-room/outputs"
  "docs/validation/SYNTHETIC_DEAL_ROOM_SPEC.md"
  "docs/evaluation/DEAL_ROOM_EVAL.md"
  "reef/benchmarks/ridgeline-m1-baseline-v2.json"
  "reef/benchmarks/ridgeline-m1-baseline-invalidated.json"
  "reef/benchmarks/ridgeline-query-manifest-v2.json"
  "reef/benchmarks/ridgeline-abstention-failure-analysis.md"
  "reef/benchmarks/EVALUATION_CAPABILITY_TAXONOMY.md"
  "reef/NEXT-EVALUATIONS.md"
)
fail=0
for p in "${FORBIDDEN[@]}"; do
  if [ -e "$ROOT/$p" ]; then echo "LEAK: $p is still present"; fail=1; fi
done
# The room itself must survive, or the reviewer has nothing to read.
for p in "fixtures/reef-deal-room/01_Corporate" "reef/README.md"; do
  if [ ! -e "$ROOT/$p" ]; then echo "OVER-REMOVED: $p is required but missing"; fail=1; fi
done
if [ "$fail" -eq 0 ]; then echo "blinding verified: no disqualifying material present"; fi
exit "$fail"
