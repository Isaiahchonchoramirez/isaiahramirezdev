import { BODY_SLIDERS, HEAD_SLIDERS, defaultAppearance } from "./appearance.js";

const STORE_KEY = "unwritten-age:gm-rules";
const DEFINITIONS = [...BODY_SLIDERS, ...HEAD_SLIDERS];

export function defaultGmRules() {
  const appearance = defaultAppearance();
  return {
    version: 1,
    title: "Mortal body",
    controls: Object.fromEntries(DEFINITIONS.map((def) => [def.key, {
      min: def.min,
      max: def.max,
      step: def.step,
      default: appearance[def.key],
      playerEditable: true,
    }])),
  };
}

export function normaliseGmRules(candidate = {}) {
  const base = defaultGmRules();
  const source = candidate?.controls ?? {};
  Object.entries(base.controls).forEach(([key, fallback]) => {
    const incoming = source[key] ?? {};
    const min = Number.isFinite(Number(incoming.min)) ? Number(incoming.min) : fallback.min;
    const maxRaw = Number.isFinite(Number(incoming.max)) ? Number(incoming.max) : fallback.max;
    const max = Math.max(min, maxRaw);
    const defaultRaw = Number.isFinite(Number(incoming.default)) ? Number(incoming.default) : fallback.default;
    base.controls[key] = {
      ...fallback,
      min,
      max,
      default: Math.min(max, Math.max(min, defaultRaw)),
      playerEditable: incoming.playerEditable !== false,
    };
  });
  base.title = typeof candidate?.title === "string" ? candidate.title.slice(0, 48) : base.title;
  return base;
}

export function loadGmRules() {
  try {
    return normaliseGmRules(JSON.parse(localStorage.getItem(STORE_KEY) || "{}"));
  } catch {
    return defaultGmRules();
  }
}

export function saveGmRules(rules) {
  const clean = normaliseGmRules(rules);
  localStorage.setItem(STORE_KEY, JSON.stringify(clean));
  return clean;
}

export function clearGmRules() {
  localStorage.removeItem(STORE_KEY);
  return defaultGmRules();
}

export function playerSliders(definitions, rules = loadGmRules()) {
  return definitions
    .filter((def) => rules.controls[def.key]?.playerEditable !== false)
    .map((def) => ({ ...def, ...rules.controls[def.key] }));
}

export function applyGmRules(appearance, rules = loadGmRules()) {
  const next = { ...appearance };
  Object.entries(rules.controls).forEach(([key, control]) => {
    const raw = Number(next[key]);
    const value = Number.isFinite(raw) ? raw : control.default;
    next[key] = Math.min(control.max, Math.max(control.min, value));
  });
  return next;
}

export function appearanceFromGmDefaults(appearance = defaultAppearance(), rules = loadGmRules()) {
  const next = { ...appearance };
  Object.entries(rules.controls).forEach(([key, control]) => { next[key] = control.default; });
  return applyGmRules(next, rules);
}

