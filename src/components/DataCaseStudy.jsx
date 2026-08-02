import { useEffect, useMemo, useState } from "react";

import { getAssetPath } from "../utils/assetPath";

const formatValue = (value) => {
  if (Math.abs(value) < 0.1 && value !== 0) return value.toFixed(6);
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(2);
};

const EvidenceChart = ({ chart }) => {
  const rows = useMemo(() => {
    const labels = chart.series[0].values.map((item) => item.label);
    return labels.map((label, index) => ({
      label,
      values: chart.series.map((series) => ({
        name: series.name,
        value: series.values[index].value,
      })),
    }));
  }, [chart]);
  const allValues = rows.flatMap((row) => row.values.map((item) => item.value));
  const max = Math.max(...allValues.map(Math.abs), 0.0001);
  const hasNegative = allValues.some((value) => value < 0);

  return (
    <figure className="evidence-chart">
      <figcaption>
        <h4>{chart.title}</h4>
        <p>{chart.subtitle}</p>
      </figcaption>

      <div className="evidence-legend" aria-label="Legend">
        {chart.series.map((series, index) => (
          <span key={series.name}><i className={`series-${index + 1}`} />{series.name}</span>
        ))}
      </div>

      <div className={`evidence-bars ${hasNegative ? "has-negative" : ""}`}>
        {rows.map((row) => (
          <div key={row.label} className="evidence-row">
            <div className="evidence-row-label">{row.label}</div>
            <div className="evidence-track">
              {row.values.map((item, index) => {
                const width = `${Math.abs(item.value) / max * (hasNegative ? 48 : 100)}%`;
                return (
                  <div
                    key={item.name}
                    className={`evidence-bar series-${index + 1} ${item.value < 0 ? "is-negative" : ""}`}
                    style={{ width }}
                    aria-label={`${row.label}, ${item.name}: ${formatValue(item.value)}`}
                  >
                    <span>{formatValue(item.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="evidence-axis">
        <span>{hasNegative ? `−${formatValue(max)}` : "0"}</span>
        <strong>{chart.xLabel}</strong>
        <span>{formatValue(max)}</span>
      </div>
      <p className="sr-only">Y axis: {chart.yLabel}</p>
    </figure>
  );
};

const DataCaseStudy = ({ file }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let current = true;
    fetch(getAssetPath(`/data/case-studies/${file}.json`))
      .then((response) => {
        if (!response.ok) throw new Error("Case-study data unavailable");
        return response.json();
      })
      .then((payload) => current && setData(payload))
      .catch(() => current && setError(true));
    return () => { current = false; };
  }, [file]);

  if (error) return <p className="text-white-50 mt-8">The analysis summary could not be loaded.</p>;
  if (!data) return <div className="evidence-loading" aria-label="Loading analysis" />;

  return (
    <section className="section-inline evidence-story" aria-label="Analysis findings">
      <header className="evidence-story-head">
        <div>
          <p className="featured-project-kicker">Notebook evidence</p>
          <h3>What the data actually showed</h3>
          <p>{data.source}</p>
        </div>
        <div className="evidence-sample"><span>Sample</span><strong>{data.sample}</strong></div>
      </header>

      <dl className="evidence-metrics">
        {data.metrics.map((metric) => (
          <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>
        ))}
      </dl>

      <div className="evidence-chart-grid">
        {data.charts.map((chart) => <EvidenceChart key={chart.title} chart={chart} />)}
      </div>

      <div className="evidence-findings">
        <h4>Reading the result</h4>
        <ul>{data.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul>
      </div>
      <p className="evidence-provenance">Generated from the underlying pandas analysis—not a decorative screenshot. {data.updated}.</p>
    </section>
  );
};

export default DataCaseStudy;
