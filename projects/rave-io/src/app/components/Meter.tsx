import { useEffect, useRef } from "react";

/**
 * The master meter.
 *
 * This used to be a hardcoded array of twelve numbers that switched between
 * two states depending on whether the transport was running — it showed the
 * same "spectrum" for silence as for a full mix. It now reads the analyser on
 * the audio graph, so it responds to what is actually coming out.
 *
 * The bars are written to the DOM directly rather than through state: sixty
 * React renders a second to move twelve divs is a lot of work for a meter.
 */
export function Meter({ getLevels, running }: { getLevels: () => number[]; running: boolean }) {
  const bars = useRef<(HTMLDivElement | null)[]>([]);
  const peaks = useRef<number[]>(Array(12).fill(0));

  useEffect(() => {
    if (!running) {
      bars.current.forEach((bar) => bar && (bar.style.height = "4%"));
      peaks.current = Array(12).fill(0);
      return;
    }

    let frame = 0;
    const tick = () => {
      const levels = getLevels();
      for (let i = 0; i < bars.current.length; i++) {
        const bar = bars.current[i];
        if (!bar) continue;
        const level = levels[i] ?? 0;
        // Fast attack, slow release — a meter that falls as fast as it rises
        // is unreadable.
        peaks.current[i] = level > peaks.current[i] ? level : peaks.current[i] * 0.88 + level * 0.12;
        bar.style.height = `${Math.max(4, peaks.current[i] * 100)}%`;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, getLevels]);

  return (
    <div className="flex items-end gap-[3px] h-14" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="flex-1 flex items-end h-full">
          <div
            ref={(el) => {
              bars.current[i] = el;
            }}
            className="w-full rounded-sm"
            style={{
              height: "4%",
              // Low bands cyan, mids amber, highs magenta — so you can see
              // which part of the spectrum is loud, not just that it is.
              background: i < 7 ? "var(--primary)" : i < 10 ? "#ffd93d" : "var(--accent)",
              transition: "height 60ms linear",
            }}
          />
        </div>
      ))}
    </div>
  );
}
