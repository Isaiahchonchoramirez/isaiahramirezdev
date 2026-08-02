import { useEffect, useState } from "react";

/**
 * A rendered animation, played only when the visitor asks for it.
 *
 * Deliberately not autoplaying and not looping: the file is a couple of
 * megabytes and motion is the whole point of the clip, so it stays parked on
 * its poster until someone presses play. Native <video controls> is used
 * rather than a custom control bar because it is already keyboard operable
 * and speaks the right things to a screen reader.
 *
 * Under prefers-reduced-motion we also drop preload to "none", so a visitor
 * who has asked the system for less movement does not even pay to buffer it.
 */
const ProjectVideo = ({ src, poster, width, height, label, caption }) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <figure className="rounded-2xl overflow-hidden border border-black-50 bg-black-100 shadow-2xl shadow-black/60">
      <video
        className="w-full h-auto bg-black"
        src={src}
        poster={poster}
        width={width}
        height={height}
        controls
        playsInline
        preload={reduceMotion ? "none" : "metadata"}
        aria-label={label}
      >
        {/* Shown only if the browser cannot play H.264 at all. */}
        <a href={src}>Download the animation</a>
      </video>
      <figcaption className="text-white-50 border-t border-black-50 px-5 py-4 text-sm leading-relaxed">
        {caption}
      </figcaption>
    </figure>
  );
};

export default ProjectVideo;
