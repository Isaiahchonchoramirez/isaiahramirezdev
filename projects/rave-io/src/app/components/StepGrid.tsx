import { useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { DRUM_TRACKS } from "../audio/synth";
import { STEPS, type DrumPattern } from "../audio/generate";

/**
 * The drum grid.
 *
 * Painting works: hold the mouse down and drag across the row to set a run of
 * steps. The first cell you touch decides whether the drag turns steps on or
 * off, which is how every sequencer behaves and what stops a drag from
 * flickering cells as it passes over them.
 */
export function StepGrid({
  drums,
  playhead,
  selected,
  muted,
  loadedSamples,
  onToggle,
  onSelect,
  onMute,
  onAudition,
}: {
  drums: DrumPattern;
  playhead: number;
  selected: string;
  muted: Record<string, boolean>;
  loadedSamples: Record<string, boolean>;
  onToggle: (track: string, step: number, value: boolean) => void;
  onSelect: (track: string) => void;
  onMute: (track: string) => void;
  onAudition: (track: string) => void;
}) {
  // null when not painting; otherwise the value every dragged cell is set to.
  const painting = useRef<boolean | null>(null);

  const endPaint = () => {
    painting.current = null;
  };

  return (
    <div
      className="min-w-[640px]"
      onMouseUp={endPaint}
      onMouseLeave={endPaint}
      onTouchEnd={endPaint}
    >
      {/* Beat ruler */}
      <div className="flex items-end mb-1.5">
        <div className="w-[104px] flex-shrink-0" />
        <div className="flex-1 flex gap-[2px]">
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className="flex-1 text-center text-[9px] font-mono tabular-nums"
              style={{
                color: playhead === i ? "var(--primary)" : i % 4 === 0 ? "rgba(238,241,255,0.5)" : "rgba(143,150,196,0.35)",
                marginRight: i % 8 === 7 && i < STEPS - 1 ? 8 : 0,
              }}
            >
              {i % 4 === 0 ? i / 4 + 1 : "·"}
            </div>
          ))}
        </div>
      </div>

      {DRUM_TRACKS.map((track) => {
        const isSelected = selected === track.id;
        const isMuted = muted[track.id];

        return (
          <div key={track.id} className="flex items-center mb-[3px]">
            <div
              className="w-[104px] flex-shrink-0 flex items-center gap-1 pr-2"
              style={{ opacity: isMuted ? 0.4 : 1 }}
            >
              <button
                onClick={() => onMute(track.id)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label={`${isMuted ? "Unmute" : "Mute"} ${track.label}`}
                aria-pressed={isMuted}
              >
                {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              </button>

              <button
                onClick={() => {
                  onSelect(track.id);
                  onAudition(track.id);
                }}
                className="flex-1 min-w-0 text-left px-2 py-2 rounded text-[10px] font-mono font-semibold tracking-[0.12em] transition-all"
                style={{
                  color: isSelected ? track.color : "rgba(238,241,255,0.72)",
                  background: isSelected ? `${track.color}1a` : "rgba(160,180,255,0.04)",
                  boxShadow: isSelected ? `inset 2px 0 0 ${track.color}` : "inset 2px 0 0 rgba(160,180,255,0.12)",
                }}
              >
                <span className="truncate block">{track.label}</span>
                {loadedSamples[track.id] && (
                  <span className="text-[8px] block" style={{ color: "var(--accent)" }}>
                    sample
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 flex gap-[2px]" style={{ opacity: isMuted ? 0.35 : 1 }}>
              {Array.from({ length: STEPS }, (_, step) => {
                const on = drums[track.id]?.[step] ?? false;
                const isBeat = step % 4 === 0;
                const under = playhead === step;

                return (
                  <button
                    key={step}
                    aria-label={`${track.label} step ${step + 1}`}
                    aria-pressed={on}
                    className="flex-1 h-9 rounded-[3px] transition-[background,box-shadow] duration-75"
                    style={{
                      marginRight: step % 8 === 7 && step < STEPS - 1 ? 8 : 0,
                      background: on
                        ? track.color
                        : under
                          ? "rgba(160,180,255,0.16)"
                          : isBeat
                            ? "rgba(160,180,255,0.075)"
                            : "rgba(160,180,255,0.035)",
                      boxShadow: on
                        ? `0 0 12px ${track.color}66`
                        : under
                          ? `inset 0 0 0 1px ${track.color}55`
                          : "none",
                    }}
                    onMouseDown={() => {
                      painting.current = !on;
                      onToggle(track.id, step, !on);
                    }}
                    onMouseEnter={() => {
                      if (painting.current !== null && painting.current !== on) {
                        onToggle(track.id, step, painting.current);
                      }
                    }}
                    onTouchStart={() => onToggle(track.id, step, !on)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
