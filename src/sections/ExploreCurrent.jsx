import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const currents = [
  { id: "code", label: "Code", category: "Web", symbol: "</>", copy: "Interfaces and full-stack applications", x: 16, y: 24 },
  { id: "data", label: "Data", category: "Data", symbol: "▦", copy: "Analysis, pipelines, and evidence", x: 80, y: 25 },
  { id: "design", label: "Design", category: "Design", symbol: "◇", copy: "Human-centered visual systems", x: 22, y: 76 },
  { id: "ai", label: "AI", category: "AI", symbol: "✦", copy: "Useful intelligence with visible reasoning", x: 76, y: 72 },
];

const clamp = (value) => Math.max(6, Math.min(94, value));

const JellyAvatar = () => (
  <svg viewBox="0 0 80 100" aria-hidden="true">
    <defs>
      <radialGradient id="jelly-body" cx="45%" cy="25%">
        <stop offset="0" stopColor="#e9fbff" />
        <stop offset=".38" stopColor="#77e8ff" />
        <stop offset="1" stopColor="#8656d9" />
      </radialGradient>
    </defs>
    <path fill="url(#jelly-body)" d="M12 43C12 20 24 8 40 8s28 12 28 35c0 8-4 12-11 12H23c-7 0-11-4-11-12Z" />
    <path d="M22 53c-2 15 6 18 1 34M34 54c-4 18 7 23 1 39M47 54c5 16-6 24 1 38M59 53c3 14-5 20-1 33" fill="none" stroke="#8aeaff" strokeWidth="4" strokeLinecap="round" />
    <circle cx="31" cy="36" r="2.5" fill="#06111e" /><circle cx="49" cy="36" r="2.5" fill="#06111e" />
  </svg>
);

const ExploreCurrent = () => {
  const navigate = useNavigate();
  const fieldRef = useRef(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 52 });
  const [collected, setCollected] = useState([]);
  const [latest, setLatest] = useState(null);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    setPosition({ x: 50, y: 52 });
    setCollected([]);
    setLatest(null);
  }, []);

  useEffect(() => {
    const open = () => { reset(); setActive(true); };
    window.addEventListener("open-explore-current", open);
    return () => window.removeEventListener("open-explore-current", open);
  }, [reset]);

  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") return setActive(false);
      const moves = {
        ArrowUp: [0, -4], w: [0, -4], W: [0, -4],
        ArrowDown: [0, 4], s: [0, 4], S: [0, 4],
        ArrowLeft: [-4, 0], a: [-4, 0], A: [-4, 0],
        ArrowRight: [4, 0], d: [4, 0], D: [4, 0],
      };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      setPosition((point) => ({ x: clamp(point.x + move[0]), y: clamp(point.y + move[1]) }));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  useEffect(() => {
    currents.forEach((item) => {
      const distance = Math.hypot(position.x - item.x, position.y - item.y);
      if (distance > 11 || collected.includes(item.id)) return;
      setCollected((current) => [...current, item.id]);
      setLatest(item);
    });
  }, [position, collected]);

  const moveFromPointer = (event) => {
    const box = fieldRef.current?.getBoundingClientRect();
    if (!box) return;
    setPosition({
      x: clamp((event.clientX - box.left) / box.width * 100),
      y: clamp((event.clientY - box.top) / box.height * 100),
    });
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
            <p>Guide the jellyfish through code, data, design, and AI—or skip straight to the work.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="project-pill-link" onClick={() => { reset(); setActive(true); }}>Start exploring</button>
            <button type="button" className="project-pill-link project-pill-link--quiet" onClick={() => view()}>View projects</button>
          </div>
        </div>
      </section>

      {active && (
        <div className="current-overlay" role="dialog" aria-modal="true" aria-labelledby="current-title">
          <div className="current-panel current-game-panel">
            <button type="button" className="current-close" onClick={() => setActive(false)} aria-label="Close exploration">×</button>
            <div className="current-game-head">
              <div>
                <p className="featured-project-kicker">{collected.length} / {currents.length} collected</p>
                <h2 id="current-title">Explore the current</h2>
              </div>
              <div className="current-controls" aria-label="Controls">
                <span><kbd>WASD</kbd> or arrows</span><span>Drag on touch</span>
              </div>
            </div>

            <div
              ref={fieldRef}
              className={`current-field ${dragging ? "is-dragging" : ""} ${latest ? "did-collect" : ""}`}
              onPointerDown={(event) => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); moveFromPointer(event); }}
              onPointerMove={(event) => dragging && moveFromPointer(event)}
              onPointerUp={(event) => { setDragging(false); event.currentTarget.releasePointerCapture(event.pointerId); }}
              aria-label="Underwater game area"
            >
              <div className="current-rays" aria-hidden="true" />
              <div className="current-bubbles" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              {currents.map((item) => {
                const found = collected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`current-collectible ${found ? "is-found" : ""}`}
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (found) view(item.category);
                      else setPosition({ x: item.x, y: item.y });
                    }}
                    aria-label={found ? `${item.label} collected. View projects.` : `Move to ${item.label}`}
                  >
                    <span aria-hidden="true">{item.symbol}</span><strong>{item.label}</strong>
                  </button>
                );
              })}
              <div className="current-jelly" style={{ left: `${position.x}%`, top: `${position.y}%` }}>
                <JellyAvatar /><span className="sr-only">Jellyfish position</span>
              </div>
              {latest && (
                <div className="current-discovery" role="status">
                  <strong>{latest.label} collected</strong>
                  <span>{latest.copy}</span>
                  <button type="button" onClick={() => view(latest.category)}>View {latest.label} work →</button>
                </div>
              )}
            </div>

            <div className="current-game-footer">
              {collected.length === currents.length ? (
                <div className="current-complete">
                  <strong>You explored Isaiah’s full skill set.</strong>
                  <button type="button" onClick={() => view()}>See all projects →</button>
                </div>
              ) : <p>Move into a glowing object to collect it. Collected objects open their project category.</p>}
              <div><button type="button" onClick={reset}>Reset</button><button type="button" className="current-skip" onClick={() => view()}>Skip / View projects</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExploreCurrent;
