#!/usr/bin/env python3
"""Normalize a StatsBomb Open Data match file for the C++ engine."""

import argparse
import csv
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="StatsBomb matches JSON")
    parser.add_argument("output", type=Path, help="Destination CSV")
    args = parser.parse_args()

    matches = json.loads(args.input.read_text(encoding="utf-8"))
    rows = sorted(matches, key=lambda match: (match["match_date"], match["match_id"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["date", "home_team", "away_team", "home_goals", "away_goals"])
        for match in rows:
            writer.writerow([
                match["match_date"],
                match["home_team"]["home_team_name"],
                match["away_team"]["away_team_name"],
                match["home_score"],
                match["away_score"],
            ])

    print(f"Wrote {len(rows)} matches to {args.output}")


if __name__ == "__main__":
    main()
