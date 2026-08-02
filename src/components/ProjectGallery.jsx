import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Grouped still gallery for a project, with a keyboard-driven lightbox.
 *
 * Groups exist because the work in them is not the same claim: the renders
 * from the final build and the earlier class studies sit in separate sections
 * with their own heading, so nothing implies the studies are finished pieces.
 *
 * Every thumbnail is a real <button>, so tab/enter work without help. Inside
 * the lightbox, arrow keys move between images within the group the user
 * opened, Escape closes, and focus returns to the thumbnail that opened it.
 */
const ProjectGallery = ({ groups }) => {
  // { groupIndex, itemIndex } or null
  const [open, setOpen] = useState(null);
  const openerRef = useRef(null);
  const closeRef = useRef(null);

  const close = useCallback(() => setOpen(null), []);

  const step = useCallback(
    (delta) =>
      setOpen((current) => {
        if (!current) return current;
        const items = groups[current.groupIndex].items;
        const next = (current.itemIndex + delta + items.length) % items.length;
        return { ...current, itemIndex: next };
      }),
    [groups],
  );

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      // Send focus back where it came from, so keyboard users are not
      // dumped at the top of the document.
      openerRef.current?.focus();
    };
  }, [open, close, step]);

  const active = open ? groups[open.groupIndex].items[open.itemIndex] : null;
  const activeGroup = open ? groups[open.groupIndex] : null;

  return (
    <div className="mt-14">
      {/* section-inline is load-bearing — see the note beside the global
          `section { width: 100dvw }` rule in index.css. */}
      {groups.map((group, groupIndex) => (
        <section key={group.id} className="section-inline mt-12 first:mt-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="text-2xl font-semibold md:text-3xl">{group.title}</h3>
            <p className="text-white-50 text-sm">{group.blurb}</p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item, itemIndex) => (
              <figure key={item.src} className="design-card">
                <button
                  type="button"
                  className="design-thumb group"
                  aria-label={`View ${item.title} full size`}
                  onClick={(e) => {
                    openerRef.current = e.currentTarget;
                    setOpen({ groupIndex, itemIndex });
                  }}
                >
                  <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
                  <span className="design-zoom" aria-hidden="true">
                    View full size
                  </span>
                </button>
                <figcaption className="px-5 py-4">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-white-50 mt-1 text-sm leading-relaxed">{item.caption}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}

      {active && (
        <div
          className="design-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title}, full size`}
          onClick={close}
        >
          <button
            type="button"
            ref={closeRef}
            className="design-lightbox-close"
            onClick={close}
            aria-label="Close"
          >
            ✕
          </button>
          <div className="design-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <header className="design-lightbox-head">
              <span className="design-format">{activeGroup.title}</span>
              <h3 className="mt-3 text-3xl font-bold md:text-4xl">{active.title}</h3>
              <p className="text-white-50 mt-3 leading-relaxed">{active.caption}</p>
              {groups[open.groupIndex].items.length > 1 && (
                <p className="text-white-50 mt-3 text-xs uppercase tracking-wide">
                  {open.itemIndex + 1} / {groups[open.groupIndex].items.length} — use ← → to
                  browse
                </p>
              )}
            </header>
            <img src={active.src} alt={active.alt} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectGallery;
