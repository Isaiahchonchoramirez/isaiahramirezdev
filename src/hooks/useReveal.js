import { useEffect, useRef } from "react";

/**
 * Scroll-reveal that cannot leave content invisible.
 *
 * The sections here previously used `gsap.fromTo(..., { opacity: 0 }, { scrollTrigger })`.
 * That has two failure modes, both of which were live on the site: if the
 * ScrollTrigger plugin was never registered (TechStack never registered it),
 * or if the tween was killed before it advanced, the elements kept the
 * `opacity: 0` that GSAP had already applied — and the content was simply gone.
 *
 * This inverts the risk. Elements are visible by default in CSS; JavaScript
 * only *adds* the hidden state, and only for elements it is actively
 * observing. If the script never runs, the observer never fires, or the
 * browser lacks IntersectionObserver, the content just shows.
 */
export default function useReveal({ selector, stagger = 90, threshold = 0.15 } = {}) {
  const scopeRef = useRef(null);

  useEffect(() => {
    const root = scopeRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll(selector));
    if (!items.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    items.forEach((el, i) => {
      el.dataset.reveal = "pending";
      el.style.setProperty("--reveal-delay", `${i * stagger}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.dataset.reveal = "in";
          observer.unobserve(entry.target); // reveal once, then stop watching
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    items.forEach((el) => observer.observe(el));

    const revealAll = () => {
      items.forEach((el) => {
        el.dataset.reveal = "in";
        observer.unobserve(el);
      });
    };

    // A section already past the viewport on load never intersects, so make
    // sure anything above the fold is shown rather than left pending.
    const raf = requestAnimationFrame(() => {
      items.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.dataset.reveal = "in";
          observer.unobserve(el);
        }
      });
    });

    // Last resort. requestAnimationFrame and IntersectionObserver are both
    // throttled in a background tab, and some embedded webviews never run them
    // at all — in which case everything above would silently stay hidden.
    // Content losing its animation is fine; content never appearing is not.
    const failsafe = setTimeout(revealAll, 2000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [selector, stagger, threshold]);

  return scopeRef;
}
