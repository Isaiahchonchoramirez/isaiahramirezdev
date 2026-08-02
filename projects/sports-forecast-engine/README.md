# Sports Forecast Engine (C++20)

A dependency-free C++ model that turns historical football scores into honest probability forecasts. It estimates attack, defense, and home advantage, uses a Poisson score model, and measures itself on the final 20% of a season without looking ahead.

## Reproduce it

```bash
make
./sports-forecast data/premier-league-2015-16.csv
make case-study
```

To rebuild the normalized CSV from a downloaded StatsBomb match file:

```bash
python3 scripts/prepare_statsbomb.py matches.json data/premier-league-2015-16.csv
```

The program writes portfolio-ready JSON to standard output and diagnostic information to standard error. The implementation uses only the C++ standard library.

## Method

- Sort all 380 Premier League 2015/16 matches chronologically.
- Reserve the final 76 matches as an untouched holdout.
- Before each holdout match, refit using only results available on that date.
- Smooth each club's scoring and conceding rates toward the league average.
- Produce a 0–8 goal probability grid, expected score, likely score, and home/draw/away probabilities.
- Report accuracy, multiclass log loss, Brier score, and mean absolute goal error.

This is a transparent educational baseline, not betting advice. It deliberately does not claim “precision betting”: injuries, lineups, player availability, market odds, and many sources of uncertainty are outside the model.

## Data credit

Match data comes from [StatsBomb Open Data](https://github.com/statsbomb/open-data), Premier League 2015/16. StatsBomb asks users of this data to attribute StatsBomb and use its logo when publishing analysis. The normalized CSV remains derived from that dataset; see the upstream repository for its terms.
