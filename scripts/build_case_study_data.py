"""Build privacy-safe, web-sized summaries from Isaiah's analysis projects.

The source notebooks and datasets stay outside the portfolio. Only aggregate
values needed by the published charts are written to public/data/case-studies.
Run this script again whenever the underlying analyses change.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pandas as pd


HOME = Path("/Users/irmac/Developer/Python")
OUTPUT = Path(__file__).resolve().parents[1] / "public/data/case-studies"


def write(name: str, payload: dict) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / f"{name}.json").write_text(json.dumps(payload, indent=2))


def lead_risk() -> None:
    frame = pd.read_csv(HOME / "SI_305/Final/mi_lead_risk_county_level.csv")
    top = frame.nlargest(10, "combined_risk_index")
    correlations = frame[
        ["num_pre1950_2020", "mean_lead90th_ppb", "ebll_rate_pct"]
    ].corr()
    write("michigan-lead-risk", {
        "source": "Michigan public health, housing, and public-water datasets; county-level aggregation",
        "sample": f"{len(frame)} Michigan counties",
        "updated": "2025 analysis",
        "metrics": [
            {"label": "Counties joined", "value": str(len(frame))},
            {"label": "Median EBLL rate", "value": f"{frame.ebll_rate_pct.median():.2f}%"},
            {"label": "Median water lead", "value": f"{frame.mean_lead90th_ppb.median():.2f} ppb"},
        ],
        "charts": [{
            "type": "bar",
            "title": "Highest combined lead-risk index",
            "subtitle": "Mean of standardized pre-1950 housing, water-lead, and childhood EBLL indicators",
            "xLabel": "Combined risk index (z-score average)",
            "yLabel": "County",
            "series": [{"name": "Risk index", "values": [
                {"label": row.County, "value": round(row.combined_risk_index, 2)}
                for row in top.itertuples()
            ]}],
        }],
        "findings": [
            f"Pre-1950 housing and childhood EBLL rate correlation: r = {correlations.loc['num_pre1950_2020', 'ebll_rate_pct']:.2f}.",
            f"Mean water lead and childhood EBLL rate correlation: r = {correlations.loc['mean_lead90th_ppb', 'ebll_rate_pct']:.2f}.",
            "County-level relationships are descriptive and do not establish individual exposure or causation.",
        ],
    })


def crop_yield() -> None:
    frame = pd.read_csv(HOME / "SI201/Projects/fall25-project1-Isaiahchonchoramirez/crop_yield.csv")
    grouped = (
        frame.groupby(["Irrigation_Used", "Fertilizer_Used"], observed=True)
        .Yield_tons_per_hectare.mean()
    )
    values = []
    for (irrigation, fertilizer), value in grouped.items():
        label = f"{'Irrigation' if irrigation else 'No irrigation'} + {'fertilizer' if fertilizer else 'no fertilizer'}"
        values.append({"label": label, "value": round(float(value), 2)})
    efficiency = frame.assign(yield_per_mm=frame.Yield_tons_per_hectare / frame.Rainfall_mm)
    region = efficiency.groupby("Region", observed=True).yield_per_mm.mean().sort_values(ascending=False)
    write("crop-yield", {
        "source": "Synthetic agricultural crop-yield dataset analyzed in SI 201",
        "sample": f"{len(frame):,} observations",
        "updated": "2025 analysis",
        "metrics": [
            {"label": "Rows analyzed", "value": f"{len(frame)/1_000_000:.1f}M"},
            {"label": "Crops", "value": str(frame.Crop.nunique())},
            {"label": "Tests passed", "value": "10/10"},
        ],
        "charts": [{
            "type": "bar",
            "title": "Average yield by treatment combination",
            "subtitle": "Irrigation and fertilizer are compared across the complete dataset",
            "xLabel": "Mean yield (tons per hectare)",
            "yLabel": "Treatment",
            "series": [{"name": "Mean yield", "values": values}],
        }, {
            "type": "bar",
            "title": "Regional rainfall efficiency",
            "subtitle": "Yield divided by rainfall for every observation, then averaged by region",
            "xLabel": "Mean tons per hectare per mm rainfall",
            "yLabel": "Region",
            "series": [{"name": "Yield per mm", "values": [
                {"label": label, "value": round(float(value), 6)} for label, value in region.items()
            ]}],
        }],
        "findings": [
            "Using irrigation and fertilizer together produced the highest mean yield: about 6.00 tons per hectare.",
            f"The {region.index[0]} region had the highest mean yield per millimeter of rainfall in this dataset.",
            "The dataset is synthetic, so findings demonstrate analytical technique rather than agricultural policy evidence.",
        ],
    })


def occupy_space() -> None:
    database = HOME / "SI201/Projects/COPY_Occupy_Space/space_data.db"
    with sqlite3.connect(database) as connection:
        approaches = pd.read_sql_query("""
            SELECT a.rel_vel_km_h, a.miss_distance_km,
                   s.estimated_diameter_max, s.is_potentially_hazardous
            FROM approaches a JOIN asteroids s ON s.id = a.asteroid_id
        """, connection)
        apod_count = pd.read_sql_query("SELECT COUNT(*) n FROM apod_images", connection).iloc[0, 0]
    correlation = approaches.rel_vel_km_h.corr(approaches.miss_distance_km)
    buckets = pd.cut(
        approaches.estimated_diameter_max,
        bins=[0, .1, .5, 1, float("inf")],
        labels=["Tiny (<0.1 km)", "Small (0.1-0.5 km)", "Medium (0.5-1 km)", "Large (>1 km)"],
    )
    size = approaches.assign(size=buckets).groupby("size", observed=True).agg(
        approaches=("size", "size"), hazardous=("is_potentially_hazardous", "sum")
    )
    write("occupy-space", {
        "source": "NASA NeoWs and Astronomy Picture of the Day APIs",
        "sample": f"{len(approaches)} NEO approaches and {apod_count} APOD entries",
        "updated": "2025 collaborative analysis",
        "metrics": [
            {"label": "NEO approaches", "value": str(len(approaches))},
            {"label": "Potentially hazardous", "value": str(int(approaches.is_potentially_hazardous.sum()))},
            {"label": "Velocity-distance r", "value": f"{correlation:.3f}"},
        ],
        "charts": [{
            "type": "groupedBar",
            "title": "Asteroid size and hazard classification",
            "subtitle": "NASA hazard flag counts within maximum estimated-diameter categories",
            "xLabel": "Number of approaches",
            "yLabel": "Maximum estimated diameter",
            "series": [
                {"name": "All approaches", "values": [{"label": i, "value": int(r.approaches)} for i, r in size.iterrows()]},
                {"name": "Potentially hazardous", "values": [{"label": i, "value": int(r.hazardous)} for i, r in size.iterrows()]},
            ],
        }],
        "findings": [
            f"NASA classified {int(approaches.is_potentially_hazardous.sum())} of {len(approaches)} sampled approaches as potentially hazardous.",
            f"Velocity and miss distance had a modest positive sample correlation (r = {correlation:.3f}).",
            "Potentially hazardous is a NASA classification based on orbital criteria; it does not mean an impact is predicted.",
        ],
    })


def network_homophily() -> None:
    root = HOME / "SI_315/Final"
    output = []
    for name, label in [("email", "Department email"), ("wikipedia", "Political Wikipedia"), ("congress", "Congress Twitter")]:
        edges = pd.read_csv(root / f"{name}_edgelist.csv")
        types = pd.read_csv(root / f"{name}_type.csv").set_index("node")["type"]
        valid = edges[edges.source.isin(types.index) & edges.target.isin(types.index)]
        cross = (valid.source.map(types) != valid.target.map(types)).mean()
        p = (types == 0).mean()
        expected = 2 * p * (1 - p)
        output.append({"label": label, "value": round(float(expected - cross), 3)})
    write("network-polarization", {
        "source": "Real-world email, Wikipedia, and Congress networks supplied for SI 315",
        "sample": "Three networks; 2,173 typed nodes and 8,987 listed edges",
        "updated": "2026 analysis",
        "metrics": [
            {"label": "Networks", "value": "3"},
            {"label": "Typed nodes", "value": "2,173"},
            {"label": "Simulation size", "value": "1,000 nodes"},
        ],
        "charts": [{
            "type": "bar",
            "title": "Observed homophily by network",
            "subtitle": "Expected minus observed cross-type edge fraction; positive values indicate homophily",
            "xLabel": "Homophily score (2pq - cross-type edge fraction)",
            "yLabel": "Network",
            "series": [{"name": "Homophily score", "values": output}],
        }],
        "findings": [
            "Congress showed the strongest homophily of the three networks.",
            "The department email network showed inverse homophily: more cross-type edges than its group proportions predict.",
            "The follow-up simulation tested how focal, triadic, and membership closure can change polarization over 750 steps.",
        ],
    })


def lansing_redlining() -> None:
    import geopandas as gpd

    source = HOME / "Red_lining/mappinginequality.gpkg"
    frame = gpd.read_file(source)
    lansing = frame[(frame.city == "Lansing") & (frame.state == "MI")].copy()
    projected = lansing.to_crs(lansing.estimate_utm_crs())
    projected["area_sq_km"] = projected.geometry.area / 1_000_000
    grade = projected.groupby("grade", observed=True).area_sq_km.sum().reindex(["A", "B", "C", "D"]).dropna()
    share = grade / grade.sum() * 100
    write("lansing-redlining", {
        "source": "Mapping Inequality historical HOLC neighborhood polygons",
        "sample": f"{len(lansing)} Lansing graded areas",
        "updated": "Historical spatial-data audit",
        "metrics": [
            {"label": "Graded areas", "value": str(len(lansing))},
            {"label": "HOLC grades", "value": str(lansing.grade.nunique())},
            {"label": "Mapped area", "value": f"{grade.sum():.1f} km²"},
        ],
        "charts": [{
            "type": "bar",
            "title": "Share of mapped Lansing area by HOLC grade",
            "subtitle": "Polygon area calculated after projecting the historical boundaries into a local metric CRS",
            "xLabel": "Percent of total graded area",
            "yLabel": "HOLC grade",
            "series": [{"name": "Mapped area share", "values": [
                {"label": f"Grade {label}", "value": round(float(value), 1)} for label, value in share.items()
            ]}],
        }],
        "findings": [
            f"Grade D polygons account for {share.get('D', 0):.1f}% of the historical graded area in this file.",
            f"Grades A and B together account for {(share.get('A', 0) + share.get('B', 0)):.1f}% of mapped area.",
            "The chart describes historical HOLC classifications; it does not by itself measure present-day outcomes.",
        ],
    })


if __name__ == "__main__":
    lead_risk()
    crop_yield()
    occupy_space()
    network_homophily()
    lansing_redlining()
    print(f"Wrote case-study data to {OUTPUT}")
