import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const currents = [
  { id: "code", label: "Code", category: "Web", symbol: "</>", copy: "Interfaces and full-stack applications" },
  { id: "data", label: "Data", category: "Data", symbol: "▦", copy: "Analysis, pipelines, and evidence" },
  { id: "design", label: "Design", category: "UX", symbol: "◇", copy: "Human-centered visual systems" },
  { id: "ai", label: "AI", category: "AI", symbol: "✦", copy: "Useful intelligence with visible reasoning" },
];

const ExploreCurrent = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [collected, setCollected] = useState([]);

  useEffect(() => {
    const open = () => setActive(true);
    window.addEventListener("open-explore-current", open);
    return () => window.removeEventListener("open-explore-current", open);
  }, []);

  useEffect(() => {
    if (!active) return;
    const close = (event) => event.key === "Escape" && setActive(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [active]);

  const collect = (item) => {
    setCollected((current) => current.includes(item.id) ? current : [...current, item.id]);
  };

  const view = (category = "All") => {
    setActive(false);
    navigate(`/projects?category=${encodeURIComponent(category)}`);
  };

  return (
    <>
      <section id="explore" className="section-padding">
        <div className="explore-current-card">
          <div>
            <p className="featured-project-kicker">Optional interactive</p>
            <h2>Explore the current.</h2>
            <p>Follow the jellyfish through four parts of my practice—or skip straight to the work.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="project-pill-link" onClick={() => setActive(true)}>Start exploring</button>
            <button type="button" className="project-pill-link project-pill-link--quiet" onClick={() => view()}>View projects</button>
          </div>
        </div>
      </section>

      {active && (
        <div className="current-overlay" role="dialog" aria-modal="true" aria-labelledby="current-title">
          <div className="current-panel">
            <button type="button" className="current-close" onClick={() => setActive(false)} aria-label="Close exploration">×</button>
            <p className="featured-project-kicker">{collected.length} / {currents.length} collected</p>
            <h2 id="current-title">Choose a glowing current</h2>
            <p className="text-white-50 mt-3">Each one opens a different side of the portfolio. Keyboard and touch work too.</p>
            <div className="current-grid">
              {currents.map((item) => {
                const found = collected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`current-orb ${found ? "is-found" : ""}`}
                    onClick={() => found ? view(item.category) : collect(item)}
                    aria-label={found ? `View ${item.label} projects` : `Collect ${item.label}`}
                  >
                    <span className="current-symbol" aria-hidden="true">{item.symbol}</span>
                    <strong>{item.label}</strong>
                    <small>{item.copy}</small>
                    {found && <span className="current-view">View work →</span>}
                  </button>
                );
              })}
            </div>
            {collected.length === currents.length && (
              <div className="current-complete">
                <strong>You explored Isaiah’s full skill set.</strong>
                <button type="button" onClick={() => view()}>See all projects →</button>
              </div>
            )}
            <button type="button" className="current-skip" onClick={() => view()}>Skip interaction / View projects</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ExploreCurrent;
