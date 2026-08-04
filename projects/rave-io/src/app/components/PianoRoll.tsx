import { Volume2, VolumeX } from "lucide-react";
import { degreeToMidi, midiToName, GENRES } from "../audio/instruments";
import { MELODY_ROWS, STEPS, type MelodyPattern } from "../audio/generate";

/**
 * The melody grid.
 *
 * Rows are scale degrees, not chromatic semitones — the grid only offers notes
 * that belong to the selected genre's scale, so there is no wrong note to
 * play. That is what makes the instrument library usable by someone who does
 * not read music, which was the whole premise of the sound library that
 * previously did nothing at all.
 */
export function PianoRoll({
  melody,
  genre,
  instrument,
  playhead,
  muted,
  color,
  onSet,
  onMute,
  onAudition,
}: {
  melody: MelodyPattern;
  genre: string;
  instrument: string;
  playhead: number;
  muted: boolean;
  color: string;
  onSet: (step: number, degree: number | null) => void;
  onMute: () => void;
  onAudition: (degree: number) => void;
}) {
  const scale = (GENRES[genre] ?? GENRES["Wet/808"]).scale;
  // Highest degree at the top, the way a piano roll reads.
  const rows = Array.from({ length: MELODY_ROWS }, (_, i) => MELODY_ROWS - 1 - i);

  return (
    <div className="min-w-[640px]" style={{ opacity: muted ? 0.45 : 1 }}>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onMute}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label={muted ? "Unmute melody" : "Mute melody"}
          aria-pressed={muted}
        >
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <span className="text-[11px] font-mono tracking-[0.18em] uppercase font-semibold" style={{ color }}>
          {instrument}
        </span>
        <span className="text-[11px] text-muted-foreground font-mono">
          {genre} · {(GENRES[genre] ?? GENRES["Wet/808"]).blurb}
        </span>
      </div>

      {rows.map((degree) => {
        const midi = degreeToMidi(genre, degree);
        const isRoot = degree % scale.length === 0;

        return (
          <div key={degree} className="flex items-center mb-[2px]">
            <button
              onClick={() => onAudition(degree)}
              className="w-[104px] flex-shrink-0 text-left pr-2 pl-2 py-[3px] text-[9px] font-mono tabular-nums rounded-l transition-colors hover:text-foreground"
              style={{
                color: isRoot ? color : "rgba(143,150,196,0.7)",
                background: isRoot ? "rgba(160,180,255,0.07)" : "transparent",
              }}
              title={`Preview ${midiToName(midi)}`}
            >
              {midiToName(midi)}
            </button>

            <div className="flex-1 flex gap-[2px]">
              {Array.from({ length: STEPS }, (_, step) => {
                const on = melody[step] === degree;
                const under = playhead === step;

                return (
                  <button
                    key={step}
                    aria-label={`${midiToName(midi)} at step ${step + 1}`}
                    aria-pressed={on}
                    className="flex-1 h-[17px] rounded-[2px] transition-[background,box-shadow] duration-75"
                    style={{
                      marginRight: step % 8 === 7 && step < STEPS - 1 ? 8 : 0,
                      background: on
                        ? color
                        : under
                          ? "rgba(160,180,255,0.14)"
                          : isRoot
                            ? "rgba(160,180,255,0.06)"
                            : step % 4 === 0
                              ? "rgba(160,180,255,0.045)"
                              : "rgba(160,180,255,0.022)",
                      boxShadow: on ? `0 0 10px ${color}55` : "none",
                    }}
                    onClick={() => {
                      // One note per step: clicking a new row moves the note
                      // rather than stacking a chord, because the melody track
                      // is monophonic.
                      onSet(step, on ? null : degree);
                      if (!on) onAudition(degree);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground font-mono mt-3">
        Rows are degrees of the {genre.toLowerCase()} scale, so every square is in key. Click a note name to preview it.
      </p>
    </div>
  );
}
