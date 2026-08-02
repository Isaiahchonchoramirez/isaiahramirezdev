const STORE_KEY = "unwritten-age:world-state";

export const SLOTS = ["tool", "neck", "cloak", "charm"];

const QUALITY = [
  { name: "Worked", multiplier: 1 },
  { name: "Fine", multiplier: 1.16 },
  { name: "Masterworked", multiplier: 1.34 },
  { name: "Remembered", multiplier: 1.58 },
];

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function makeSiteReward(site, index = 0) {
  const template = site.rewards[index % site.rewards.length];
  const roll = hash(`${site.id}:${template.id}`);
  const tier = QUALITY[Math.min(QUALITY.length - 1, roll % QUALITY.length)];
  return {
    ...template,
    uid: `${site.id}:${template.id}`,
    name: `${tier.name} ${template.name}`,
    power: Math.round(template.power * tier.multiplier),
    provenance: site.name,
    quality: tier.name,
  };
}

export function equipItem(state, item) {
  state.equipment[item.slot] = item.uid;
}

export function saveWorldState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      discoveredSites: [...state.discoveredSites],
      inventory: state.inventory,
      equipment: state.equipment,
    }));
  } catch { /* Progress remains available for this session. */ }
}

export function loadWorldState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
