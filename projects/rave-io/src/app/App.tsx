import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Square, Zap, Music2, SlidersHorizontal, Cpu, Trash2, ChevronDown,
  Circle, Download, Upload, Piano, LayoutGrid, Menu, X, Loader2,
} from "lucide-react";

import { HeroCanvas } from "./components/HeroCanvas";
import { Knob } from "./components/Knob";
import { StepGrid } from "./components/StepGrid";
import { PianoRoll } from "./components/PianoRoll";
import { Meter } from "./components/Meter";

import { GENRES } from "./audio/instruments";
import { DEFAULT_FX, DRUM_TRACKS, FX_LABELS, type DrumId, type TrackFX } from "./audio/synth";
import {
  STEPS, emptyDrums, emptyMelody, generateDrums, generateMelody,
  type DrumPattern, type MelodyPattern,
} from "./audio/generate";
import { Engine, downloadBlob, type Song } from "./audio/engine";

type Panel = "sequencer" | "melody" | "effects" | "song";

const PANELS: { id: Panel; label: string; icon: typeof SlidersHorizontal }[] = [
  { id: "sequencer", label: "Drums", icon: SlidersHorizontal },
  { id: "melody", label: "Melody", icon: Piano },
  { id: "effects", label: "FX", icon: Zap },
  { id: "song", label: "Song", icon: LayoutGrid },
];

const initFX = (): Record<string, TrackFX> =>
  Object.fromEntries([...DRUM_TRACKS.map((t) => t.id), "melody"].map((id) => [id, { ...DEFAULT_FX }]));

export default function App() {
  const [genre, setGenre] = useState("Wet/808");
  const [instrument, setInstrument] = useState(GENRES["Wet/808"].instruments[0]);
  const [drums, setDrums] = useState<DrumPattern>(() => generateDrums("Wet/808", 7));
  const [melody, setMelody] = useState<MelodyPattern>(() => generateMelody(7));
  const [fx, setFX] = useState<Record<string, TrackFX>>(initFX);
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [arrangement, setArrangement] = useState<boolean[]>(() =>
    Array.from({ length: 16 }, (_, i) => i < 4),
  );

  const [bpm, setBpm] = useState(140);
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<Panel>("sequencer");
  const [selectedTrack, setSelectedTrack] = useState<string>("kick");
  const [position, setPosition] = useState({ step: -1, bar: -1 });

  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sampleNames, setSampleNames] = useState<Record<string, string>>({});
  const [libraryOpen, setLibraryOpen] = useState(false);

  const samples = useRef<Record<string, AudioBuffer | undefined>>({});
  const importInput = useRef<HTMLInputElement>(null);

  // A ref mirror of everything the scheduler reads. The audio thread runs
  // ahead of render, so it must never read through a stale closure.
  const songRef = useRef<Song>(null as unknown as Song);
  songRef.current = useMemo<Song>(
    () => ({
      bpm,
      drums,
      melody,
      genre,
      instrument,
      drumFX: fx,
      melodyFX: fx.melody,
      arrangement,
      muted,
      samples: samples.current,
    }),
    [bpm, drums, melody, genre, instrument, fx, arrangement, muted],
  );

  const engine = useRef<Engine>(null as unknown as Engine);
  if (!engine.current) engine.current = new Engine(() => songRef.current);

  useEffect(() => () => engine.current.dispose(), []);

  // Transport
  useEffect(() => {
    if (!playing) {
      engine.current.stop();
      setPosition({ step: -1, bar: -1 });
      return;
    }

    engine.current.start();

    let frame = 0;
    const follow = () => {
      const at = engine.current.position();
      if (at) setPosition((prev) => (prev.step === at.step && prev.bar === at.bar ? prev : at));
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);

    return () => {
      cancelAnimationFrame(frame);
      engine.current.stop();
    };
  }, [playing]);

  // Space bar is the transport, as in every DAW — but not while typing in the
  // BPM field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.code !== "Space" || target.tagName === "INPUT" || target.isContentEditable) return;
      event.preventDefault();
      setPlaying((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const accent = GENRES[genre]?.color ?? "#2ff5d8";
  const activeTrack = DRUM_TRACKS.find((t) => t.id === selectedTrack);
  const fxTarget = panel === "melody" ? "melody" : selectedTrack;
  const fxColor = fxTarget === "melody" ? accent : (activeTrack?.color ?? accent);

  const selectGenre = useCallback((next: string) => {
    setGenre(next);
    setInstrument(GENRES[next].instruments[0]);
    setBpm(GENRES[next].bpm);
    setLibraryOpen(false);
  }, []);

  const generate = useCallback(() => {
    setGenerating(true);
    // A beat that appears the instant you click reads as a canned response;
    // the pause is the only honest thing about calling this "AI".
    setTimeout(() => {
      const seed = Date.now();
      setDrums(generateDrums(genre, seed));
      setMelody(generateMelody(seed));
      setGenerating(false);
    }, 700);
  }, [genre]);

  const toggleStep = useCallback((track: string, step: number, value: boolean) => {
    setDrums((prev) => {
      const row = [...(prev[track] ?? [])];
      row[step] = value;
      return { ...prev, [track]: row };
    });
  }, []);

  const setNote = useCallback((step: number, degree: number | null) => {
    setMelody((prev) => {
      const next = [...prev];
      next[step] = degree;
      return next;
    });
  }, []);

  const updateFX = useCallback((target: string, field: keyof TrackFX, value: number) => {
    setFX((prev) => ({ ...prev, [target]: { ...prev[target], [field]: value } }));
  }, []);

  const toggleMute = useCallback((id: string) => {
    setMuted((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const clearAll = useCallback(() => {
    setDrums(emptyDrums());
    setMelody(emptyMelody());
    setPlaying(false);
  }, []);

  const importSample = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      samples.current[selectedTrack] = await engine.current.decodeSample(file);
      setSampleNames((prev) => ({ ...prev, [selectedTrack]: file.name }));
    } catch {
      // A file the browser cannot decode is not an error worth a dialog; the
      // track simply keeps its synthesised voice.
      setSampleNames((prev) => ({ ...prev, [selectedTrack]: "" }));
    }
  };

  const exportWAV = async () => {
    setExporting(true);
    try {
      downloadBlob(await engine.current.export(songRef.current), `rave-io-${genre.replace(/\W+/g, "-").toLowerCase()}.wav`);
    } finally {
      setExporting(false);
    }
  };

  const toggleRecording = () => {
    if (recording) {
      engine.current.stopRecording();
      setRecording(false);
    } else {
      engine.current.startRecording((blob) => downloadBlob(blob, "rave-io-performance.webm"));
      setRecording(true);
      if (!playing) setPlaying(true);
    }
  };

  const getLevels = useCallback(() => engine.current.levels(), []);
  const activeBars = arrangement.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" style={{ fontFamily: "'Rajdhani', system-ui, sans-serif" }}>
      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
        <HeroCanvas accent={accent} />

        <nav className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: accent, boxShadow: `0 0 22px ${accent}` }}
            >
              <Music2 size={15} className="text-background" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-[0.35em]" style={{ color: accent, textShadow: `0 0 22px ${accent}80` }}>
              RAVE.IO
            </span>
          </div>

          <a
            href="#studio"
            className="px-4 sm:px-5 py-2 rounded text-[11px] tracking-[0.2em] font-semibold transition-colors"
            style={{ border: `1px solid ${accent}`, color: accent }}
          >
            OPEN STUDIO
          </a>
        </nav>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 pb-16">
          {/* A soft scrim under the copy. The lasers sweep behind the text and
              without this they read as strikethrough across the paragraph. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 46% 42% at 50% 48%, rgba(6,7,13,0.86) 0%, rgba(6,7,13,0.55) 45%, transparent 78%)" }}
            aria-hidden="true"
          />

          <div className="relative text-[10px] sm:text-[11px] tracking-[0.55em] mb-5 font-mono" style={{ color: "var(--accent)" }}>
            BROWSER-NATIVE BEAT MACHINE
          </div>

          <h1 className="relative font-bold tracking-tight mb-5 leading-[0.9]" style={{ fontSize: "clamp(2.75rem, 12vw, 7rem)" }}>
            <span className="block">CREATE</span>
            <span className="block" style={{ color: accent, textShadow: `0 0 55px ${accent}90` }}>
              THE DRIP
            </span>
          </h1>

          <p className="relative text-muted-foreground max-w-xl mb-9 text-base sm:text-lg leading-relaxed">
            Fifty-six synthesised instruments across seven genres, a 32-step drum grid, a melody roll locked to the
            scale you picked, and a WAV on the other end. No plugins, no account, no upload.
          </p>

          <div className="relative flex flex-col sm:flex-row items-center gap-3.5">
            <a
              href="#studio"
              className="px-8 py-3.5 rounded font-bold tracking-[0.22em] text-sm transition-transform hover:scale-[1.03]"
              style={{ background: accent, color: "var(--background)", boxShadow: `0 0 40px ${accent}70` }}
            >
              OPEN STUDIO
            </a>
            <button
              onClick={() => {
                generate();
                document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" });
                setPlaying(true);
              }}
              className="px-8 py-3.5 rounded font-bold tracking-[0.22em] text-sm transition-colors"
              style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
            >
              GENERATE A BEAT
            </button>
          </div>

          <div className="relative flex flex-wrap justify-center gap-x-6 gap-y-2 mt-12 text-[11px] font-mono tracking-widest text-muted-foreground">
            <span>56 INSTRUMENTS</span>
            <span>7 GENRES</span>
            <span>32 STEPS</span>
            <span>WAV EXPORT</span>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      </section>

      {/* ══ STUDIO ═════════════════════════════════════════════════════════ */}
      <section id="studio" className="scroll-mt-0">
        {/* Transport */}
        <div
          className="sticky top-0 z-40 flex items-center gap-2 px-3 sm:px-5 py-2.5 overflow-x-auto"
          style={{ background: "rgba(6,7,13,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setLibraryOpen((v) => !v)}
            className="lg:hidden p-2 rounded text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Sound library"
          >
            {libraryOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <span className="hidden sm:inline font-bold tracking-[0.28em] text-sm flex-shrink-0" style={{ color: accent }}>
            RAVE.IO
          </span>

          <button
            onClick={() => setPlaying((v) => !v)}
            className="w-10 h-10 rounded flex items-center justify-center transition-all flex-shrink-0"
            style={{
              background: playing ? accent : "transparent",
              border: `1px solid ${playing ? accent : "var(--border)"}`,
              color: playing ? "var(--background)" : accent,
              boxShadow: playing ? `0 0 20px ${accent}70` : "none",
            }}
            aria-label={playing ? "Stop" : "Play"}
          >
            {playing ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          </button>

          <button
            onClick={toggleRecording}
            className="w-10 h-10 rounded flex items-center justify-center transition-all flex-shrink-0"
            style={{
              border: `1px solid ${recording ? "var(--destructive)" : "var(--border)"}`,
              background: recording ? "rgba(255,77,94,0.14)" : "transparent",
            }}
            aria-label={recording ? "Stop recording" : "Record the live output"}
            title={recording ? "Stop recording and download" : "Record the live output, tweaks and all"}
          >
            <Circle
              size={11}
              fill="var(--destructive)"
              className={recording ? "animate-pulse" : ""}
              style={{ color: "var(--destructive)" }}
            />
          </button>

          <label className="flex items-center gap-2 px-3 py-1.5 rounded flex-shrink-0" style={{ border: "1px solid var(--border)" }}>
            <span className="text-[9px] text-muted-foreground tracking-[0.22em] font-mono">BPM</span>
            <input
              type="number"
              min={40}
              max={300}
              value={bpm}
              onChange={(e) => setBpm(Math.max(40, Math.min(300, Number(e.target.value) || 40)))}
              className="w-12 bg-transparent text-center font-mono text-sm focus:outline-none tabular-nums"
              style={{ color: accent }}
            />
          </label>

          {/* Bar position, so the arrangement is legible while it runs. */}
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background: playing && Math.floor(position.step / 4) === i ? accent : "rgba(160,180,255,0.18)",
                  boxShadow: playing && Math.floor(position.step / 4) === i ? `0 0 6px ${accent}` : "none",
                }}
              />
            ))}
          </div>

          <div className="flex-1 min-w-2" />

          <div className="flex items-center rounded overflow-hidden flex-shrink-0" style={{ border: "1px solid var(--border)" }}>
            {PANELS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPanel(id)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-[10px] tracking-[0.14em] font-mono uppercase font-semibold transition-colors"
                style={{
                  background: panel === id ? `${accent}1f` : "transparent",
                  color: panel === id ? accent : "var(--muted-foreground)",
                }}
              >
                <Icon size={11} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-[10px] tracking-[0.14em] font-mono uppercase font-semibold transition-all disabled:opacity-50 flex-shrink-0"
            style={{ border: "1px solid rgba(139,92,255,0.5)", color: "#b388ff", background: "rgba(139,92,255,0.12)" }}
          >
            <Cpu size={11} className={generating ? "animate-spin" : ""} />
            <span className="hidden md:inline">{generating ? "WRITING…" : "GENERATE"}</span>
          </button>

          <input ref={importInput} type="file" accept="audio/*" className="hidden" onChange={importSample} />
          <button
            onClick={() => importInput.current?.click()}
            className="p-2 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            style={{ border: "1px solid var(--border)" }}
            title={`Load a sample for ${activeTrack?.label ?? "the selected track"}`}
            aria-label="Import sample"
          >
            <Upload size={13} />
          </button>

          <button
            onClick={exportWAV}
            disabled={exporting}
            className="p-2 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex-shrink-0"
            style={{ border: "1px solid var(--border)" }}
            title="Render the arrangement to WAV"
            aria-label="Export WAV"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          </button>

          <button
            onClick={clearAll}
            className="p-2 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            aria-label="Clear everything"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex" style={{ minHeight: "calc(100svh - 58px)" }}>
          {/* ── Sound library ── */}
          <aside
            className={`${libraryOpen ? "fixed inset-y-0 left-0 z-50 w-64" : "hidden"} lg:relative lg:flex lg:w-56 flex-col flex-shrink-0 overflow-hidden`}
            style={{ background: "var(--sidebar)", borderRight: "1px solid var(--border)" }}
          >
            <div className="px-4 py-3.5 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <Music2 size={12} style={{ color: accent }} />
              <span className="text-[10px] tracking-[0.2em] font-mono uppercase font-semibold" style={{ color: accent }}>
                Sound Library
              </span>
              <div className="flex-1" />
              <button onClick={() => setLibraryOpen(false)} className="lg:hidden text-muted-foreground" aria-label="Close">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {Object.entries(GENRES).map(([name, config]) => {
                const open = genre === name;
                return (
                  <div key={name}>
                    <button
                      onClick={() => selectGenre(name)}
                      className="w-full flex items-center justify-between px-4 py-3 text-[11px] tracking-[0.12em] font-mono uppercase font-semibold transition-colors hover:bg-muted"
                      style={{
                        color: open ? config.color : "var(--muted-foreground)",
                        boxShadow: open ? `inset 3px 0 0 ${config.color}` : "none",
                        background: open ? `${config.color}12` : "transparent",
                      }}
                    >
                      <span>{name}</span>
                      <ChevronDown
                        size={11}
                        style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: config.color }}
                      />
                    </button>

                    {open && (
                      <div className="pb-2">
                        {config.instruments.map((name) => {
                          const selected = instrument === name;
                          return (
                            <button
                              key={name}
                              onClick={() => {
                                setInstrument(name);
                                // Hearing it is the point of picking it.
                                engine.current.audition(name);
                                setPanel("melody");
                              }}
                              className="w-full text-left pl-7 pr-3 py-2 text-[11px] font-mono font-medium transition-colors"
                              style={{
                                color: selected ? config.color : "var(--muted-foreground)",
                                background: selected ? `${config.color}18` : "transparent",
                                boxShadow: selected ? `inset 3px 0 0 ${config.color}` : "none",
                              }}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="text-[8px] tracking-[0.25em] text-muted-foreground font-mono mb-1">LOADED</div>
              <div className="text-sm font-mono font-semibold truncate" style={{ color: accent }}>
                {instrument}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{genre}</div>
            </div>
          </aside>

          {libraryOpen && (
            <button
              className="lg:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setLibraryOpen(false)}
              aria-label="Close library"
            />
          )}

          {/* ── Stage ── */}
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 overflow-x-auto p-4 sm:p-5">
              {panel === "sequencer" && (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-[11px] font-mono tracking-[0.2em] font-semibold uppercase">32-Step Sequencer</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Click, or drag across a row to paint
                    </span>
                  </div>
                  <StepGrid
                    drums={drums}
                    playhead={playing ? position.step : -1}
                    selected={selectedTrack}
                    muted={muted}
                    loadedSamples={Object.fromEntries(Object.entries(sampleNames).map(([k, v]) => [k, Boolean(v)]))}
                    onToggle={toggleStep}
                    onSelect={setSelectedTrack}
                    onMute={toggleMute}
                    onAudition={(id) => !playing && engine.current.auditionDrum(id as DrumId)}
                  />
                </>
              )}

              {panel === "melody" && (
                <PianoRoll
                  melody={melody}
                  genre={genre}
                  instrument={instrument}
                  playhead={playing ? position.step : -1}
                  muted={Boolean(muted.melody)}
                  color={accent}
                  onSet={setNote}
                  onMute={() => toggleMute("melody")}
                  onAudition={(degree) => engine.current.audition(instrument, degree)}
                />
              )}

              {panel === "effects" && (
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="w-3 h-3 rounded-full" style={{ background: fxColor, boxShadow: `0 0 10px ${fxColor}` }} />
                    <span className="font-mono tracking-[0.16em] font-semibold" style={{ color: fxColor }}>
                      {fxTarget === "melody" ? instrument.toUpperCase() : activeTrack?.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      — channel effects{fxTarget === "melody" ? " · melody" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 sm:gap-6 mb-8">
                    {(Object.keys(FX_LABELS) as (keyof TrackFX)[]).map((field) => (
                      <Knob
                        key={field}
                        value={fx[fxTarget][field]}
                        onChange={(value) => updateFX(fxTarget, field, value)}
                        label={FX_LABELS[field]}
                        color={fxColor}
                      />
                    ))}
                  </div>

                  <div className="rounded-lg p-4" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                    <div className="text-[10px] font-mono tracking-[0.2em] font-semibold mb-3 uppercase" style={{ color: fxColor }}>
                      Filter &amp; tone response
                    </div>
                    <svg viewBox="0 0 400 76" className="w-full h-20" role="img" aria-label="Frequency response curve">
                      {[19, 38, 57].map((y) => (
                        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(160,180,255,0.1)" strokeWidth="0.5" />
                      ))}
                      <path d={responseCurve(fx[fxTarget])} fill="none" stroke={fxColor} strokeWidth="2.2" style={{ filter: `drop-shadow(0 0 5px ${fxColor})` }} />
                      <path d={`${responseCurve(fx[fxTarget])} L 400 76 L 0 76 Z`} fill={`${fxColor}18`} />
                    </svg>
                    <div className="flex justify-between text-[9px] font-mono mt-1.5 text-muted-foreground">
                      {["20Hz", "100Hz", "500Hz", "2kHz", "8kHz", "20kHz"].map((f) => (
                        <span key={f}>{f}</span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground font-mono mt-4">
                    Drag a knob, or focus it and use the arrow keys. Double-click resets to centre.
                    {fxTarget !== "melody" && " Pick a drum row in the Drums panel to edit a different channel."}
                  </p>
                </div>
              )}

              {panel === "song" && (
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                      <div className="text-sm font-mono font-semibold tracking-[0.16em] uppercase">Song Arrangement</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-1">
                        {activeBars} of 16 bars active · {((activeBars * STEPS * (60 / bpm)) / 4).toFixed(1)}s at {bpm} BPM
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setArrangement(Array.from({ length: 16 }, (_, i) => i < 4))}
                        className="text-[10px] font-mono tracking-widest rounded px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        RESET
                      </button>
                      <button
                        onClick={() => setArrangement(Array(16).fill(true))}
                        className="text-[10px] font-mono tracking-widest rounded px-3 py-1.5 transition-colors"
                        style={{ border: `1px solid ${accent}80`, color: accent }}
                      >
                        ALL 16
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
                    {arrangement.map((active, i) => {
                      const isCurrent = playing && position.bar === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setArrangement((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                          className="flex flex-col items-center justify-between p-2.5 rounded-md transition-all aspect-square"
                          style={{
                            background: active ? `${accent}14` : "rgba(160,180,255,0.04)",
                            border: `1px solid ${isCurrent ? accent : active ? `${accent}70` : "var(--border)"}`,
                            boxShadow: isCurrent ? `0 0 16px ${accent}60` : "none",
                          }}
                          aria-pressed={active}
                          aria-label={`Bar ${i + 1}`}
                        >
                          <span className="text-[10px] font-mono font-semibold" style={{ color: active ? accent : "var(--muted-foreground)" }}>
                            {i + 1}
                          </span>
                          {active && (
                            <span className="flex gap-0.5 w-full">
                              {DRUM_TRACKS.slice(0, 4).map((t) => (
                                <span
                                  key={t.id}
                                  className="flex-1 h-1.5 rounded-sm"
                                  style={{ background: drums[t.id]?.some(Boolean) ? t.color : "rgba(160,180,255,0.16)" }}
                                />
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-muted-foreground font-mono mb-6">
                    Active bars play in order and loop. Export renders exactly this arrangement.
                  </p>

                  <div className="rounded-lg p-4" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                    <div className="text-[10px] font-mono tracking-[0.2em] font-semibold text-muted-foreground mb-4 uppercase">
                      Track overview
                    </div>
                    {[...DRUM_TRACKS.map((t) => ({ id: t.id, label: t.label, color: t.color })), { id: "melody", label: "MELODY", color: accent }].map(
                      (track) => {
                        const pattern =
                          track.id === "melody"
                            ? melody.map((n) => n !== null)
                            : (drums[track.id] ?? Array<boolean>(STEPS).fill(false));
                        return (
                          <div key={track.id} className="flex items-center gap-3 mb-1.5">
                            <span className="w-16 text-[10px] font-mono font-semibold flex-shrink-0" style={{ color: track.color, opacity: muted[track.id] ? 0.4 : 1 }}>
                              {track.label}
                            </span>
                            <span className="flex-1 flex gap-[2px]">
                              {pattern.map((on, i) => (
                                <span
                                  key={i}
                                  className="flex-1 h-3 rounded-sm"
                                  style={{ background: on ? track.color : "rgba(160,180,255,0.07)", opacity: muted[track.id] ? 0.3 : 1 }}
                                />
                              ))}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* ── Channel rail ── */}
          <aside
            className="hidden xl:flex w-48 flex-col flex-shrink-0 overflow-hidden"
            style={{ background: "var(--sidebar)", borderLeft: "1px solid var(--border)" }}
          >
            <div className="px-3 py-3.5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-[10px] font-mono font-semibold tracking-[0.2em] uppercase" style={{ color: accent }}>
                Channels
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
              {[...DRUM_TRACKS.map((t) => ({ id: t.id as string, label: t.label as string, color: t.color as string })), { id: "melody", label: instrument.toUpperCase(), color: accent }].map(
                (track) => {
                  const trackFX = fx[track.id];
                  const selected = track.id === "melody" ? panel === "melody" : selectedTrack === track.id && panel !== "melody";
                  const isMuted = muted[track.id];

                  return (
                    <button
                      key={track.id}
                      onClick={() => {
                        if (track.id === "melody") setPanel("melody");
                        else {
                          setSelectedTrack(track.id);
                          setPanel("effects");
                        }
                      }}
                      className="flex items-center gap-2 p-2 rounded text-left transition-all"
                      style={{
                        background: selected ? `${track.color}16` : "transparent",
                        border: `1px solid ${selected ? `${track.color}60` : "var(--border)"}`,
                        opacity: isMuted ? 0.45 : 1,
                      }}
                    >
                      <span className="w-6 h-14 relative overflow-hidden rounded-sm flex-shrink-0" style={{ background: "rgba(160,180,255,0.07)" }}>
                        <span
                          className="absolute bottom-0 inset-x-0 transition-[height] duration-200"
                          style={{
                            height: `${trackFX.volume}%`,
                            background: `linear-gradient(to top, ${track.color}, ${track.color}70)`,
                          }}
                        />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-[10px] font-mono font-semibold tracking-[0.1em] truncate" style={{ color: track.color }}>
                          {track.label}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono tabular-nums mt-0.5">
                          {Math.round(trackFX.volume)}%
                        </span>
                        {sampleNames[track.id] && (
                          <span className="text-[8px] font-mono truncate" style={{ color: "var(--accent)" }}>
                            {sampleNames[track.id]}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                },
              )}
            </div>

            <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="text-[9px] font-mono font-semibold tracking-[0.2em] mb-2 uppercase" style={{ color: accent }}>
                Master
              </div>
              <Meter getLevels={getLevels} running={playing} />
              <div className="text-[9px] font-mono font-semibold text-center mt-2 tracking-widest" style={{ color: playing ? accent : "var(--muted-foreground)" }}>
                {recording ? "● RECORDING" : playing ? "● LIVE" : "○ IDLE"}
              </div>
            </div>
          </aside>
        </div>

        <footer className="px-5 py-6 text-center text-[11px] font-mono text-muted-foreground" style={{ borderTop: "1px solid var(--border)" }}>
          RAVE.IO — every sound on this page is synthesised in the browser from an oscillator up. Built by Isaiah Ramirez.
        </footer>
      </section>
    </div>
  );
}

/**
 * Draw the tone stack the knobs describe: a low shelf from BASS and a
 * low-pass corner from FLT, over a log frequency axis.
 */
function responseCurve(fx: TrackFX): string {
  const points: string[] = [];
  // 20 Hz to 20 kHz across 400 px.
  const cutoff = 120 * 2 ** ((fx.filter / 100) * 7.2);
  const shelfGain = (fx.bass - 60) * 0.32;

  for (let x = 0; x <= 400; x += 8) {
    const hz = 20 * (20000 / 20) ** (x / 400);
    // First-order roll-off above the corner, in dB.
    const lowpass = -10 * Math.log10(1 + (hz / cutoff) ** 2);
    const shelf = shelfGain / (1 + (hz / 180) ** 2);
    const db = Math.max(-30, Math.min(18, lowpass + shelf));
    // 0 dB sits at y = 46; +18 dB at the top, −30 dB at the bottom.
    const y = 46 - db * 1.25;
    points.push(`${x === 0 ? "M" : "L"} ${x} ${Math.max(2, Math.min(74, y)).toFixed(1)}`);
  }

  return points.join(" ");
}
