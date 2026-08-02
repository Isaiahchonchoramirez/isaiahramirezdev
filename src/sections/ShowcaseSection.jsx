import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import TitleHeader from "../components/TitleHeader";
import useReveal from "../hooks/useReveal";
import { designWork } from "../constants";
import { getAssetPath } from "../utils/assetPath";

/**
 * Design work, three across.
 *
 * The layout is driven by the source files rather than taste. These comps are
 * small — the Xbox page is 650px wide, Lafayette 1024, Hemingway 1073 — so a
 * full-width presentation upscaled them roughly 2x in CSS pixels and 4x on a
 * retina display, which is why they looked soft. At three columns each card is
 * about 424px, so four of the five render pixel-perfect on retina and none of
 * them upscale.
 *
 * Cards carry the summary; the full write-up sits in the lightbox beside the
 * artwork at full size, which is where someone actually wants to read it.
 */
const DesignShowcase = () => {
  const scopeRef = useReveal({ selector: ".design-card", stagger: 55 });
  const [lightbox, setLightbox] = useState(null);
  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [lightbox, close]);

  return (
    <div id="work" ref={scopeRef} className="section-padding">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">
        <TitleHeader title="Design Work" sub="🎨 Composited, drawn and set by hand" />

        <p className="text-white-50 mx-auto mt-10 max-w-3xl text-center text-lg leading-relaxed md:text-xl">
          Every piece below was built in{" "}
          <span className="text-white font-semibold">Photoshop</span>, with the wider Adobe
          toolset for type and vector work. Where a piece needed ornament or illustration I
          generated vectors with <span className="text-white font-semibold">AI</span> and then
          redrew them by hand — using the output as a starting sketch, not a finished asset, so
          the curves and weights actually fit the layout they sit in.
        </p>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {designWork.map((piece, i) => (
            <article key={piece.id} className="design-card">
              {/* Caption above the artwork, as before — just scaled to a card. */}
              <div className="design-card-head">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="design-index-sm">{String(i + 1).padStart(2, "0")}</span>
                  <span className="design-format">{piece.format}</span>
                  <span className="text-white-50 text-xs">{piece.year}</span>
                </div>
                <h3 className="mt-3 text-xl font-bold leading-tight md:text-2xl">
                  {piece.title}
                </h3>
                <p className="text-white-50 mt-2 text-sm leading-relaxed">{piece.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {piece.tools.map((tool) => (
                    <span key={tool} className="design-tool">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLightbox(piece)}
                className={`design-thumb group ${
                  piece.display === "native" ? "design-thumb--native" : ""
                }`}
                aria-label={`View ${piece.title} full size`}
              >
                <img
                  src={piece.image}
                  alt={`${piece.title} — ${piece.format}`}
                  loading="lazy"
                  decoding="async"
                />
                {piece.imageAlt && (
                  <img src={piece.imageAlt} alt="" loading="lazy" decoding="async" />
                )}
                <span className="design-zoom" aria-hidden="true">
                  View full size
                </span>
              </button>
            </article>
          ))}
        </div>

        <div className="mt-20 flex justify-center">
          <Link to="/projects" className="cta-wrapper md:w-60 md:h-14 w-48 h-12">
            <div className="cta-button group">
              <div className="bg-circle" />
              <p className="text">See More</p>
              {/* This wrapper was missing, which is why the arrow never showed. */}
              <div className="arrow-wrapper arrow-wrapper--nav">
                <img src={getAssetPath("/images/arrow-right.svg")} alt="" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {lightbox && (
        <div
          className="design-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${lightbox.title}, full size`}
          onClick={close}
        >
          <button type="button" className="design-lightbox-close" onClick={close} aria-label="Close">
            ✕
          </button>
          <div className="design-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <header className="design-lightbox-head">
              <div className="flex flex-wrap items-center gap-3">
                <span className="design-format">{lightbox.format}</span>
                <span className="text-white-50 text-sm">{lightbox.year}</span>
              </div>
              <h3 className="mt-3 text-3xl font-bold md:text-4xl">{lightbox.title}</h3>
              <p className="text-white-50 mt-3 leading-relaxed">{lightbox.detail}</p>
            </header>

            <img src={lightbox.image} alt={`${lightbox.title} — ${lightbox.format}`} />
            {lightbox.imageAlt && <img src={lightbox.imageAlt} alt="" />}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignShowcase;
