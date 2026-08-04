import { SERIES } from '../../ui/theme.js';
import { ELEMENTS } from './elements.js';

const [S1, S2, S3, S4] = SERIES;

const options = [
  { value: 'none', label: '— none —' },
  ...ELEMENTS.map((e) => ({ value: e.symbol, label: `${e.symbol} · ${e.name}` })),
];

const slot = (key, label, def) => ({
  key, type: 'select', label, group: 'Elements', default: def, rebuild: true, options,
});

export const params = [
  slot('elementA', 'Element 1', 'Na'),
  slot('elementB', 'Element 2', 'Cl'),
  slot('elementC', 'Element 3', 'O'),
  slot('elementD', 'Element 4', 'none'),

  { key: 'maxElements', label: 'Elements per compound', group: 'Search', min: 2, max: 4, step: 1, default: 3, rebuild: true,
    help: 'Binary compounds only at 2. Raising it lets the search build ternaries like CaCO₃, at the cost of many more candidates.' },
  { key: 'maxSubscript', label: 'Largest subscript', group: 'Search', min: 1, max: 6, step: 1, default: 4, rebuild: true,
    help: 'How many atoms of one element a formula may contain. Higher finds more, most of it implausible.' },
  { key: 'minStability', label: 'Plausibility floor', group: 'Search', min: 0, max: 90, step: 1, default: 45, rebuild: true,
    help: 'Charge balance says a formula is possible. This filters on how ordinary the oxidation states and ratios are.' },

  { key: 'showRejected', type: 'boolean', label: 'Explain rejections', group: 'Display', default: true },
];

export const channels = [
  { key: 'evaluated', label: 'Candidates evaluated', unit: '', group: 'Search', color: S1, precision: 0, min: 0 },
  { key: 'found', label: 'Compounds found', unit: '', group: 'Search', color: S2, precision: 0, min: 0 },
  { key: 'ionic', label: 'Ionic', unit: '', group: 'Bonding', color: S1, precision: 0, min: 0 },
  { key: 'covalent', label: 'Covalent', unit: '', group: 'Bonding', color: S2, precision: 0, min: 0 },
  { key: 'metallic', label: 'Metallic', unit: '', group: 'Bonding', color: S3, precision: 0, min: 0 },
  { key: 'progress', label: 'Search progress', unit: '%', group: 'Search', color: S4, precision: 1, min: 0, max: 100 },
  { key: 'bestStability', label: 'Best plausibility', unit: '', group: 'Search', color: S3, precision: 0, min: 0, max: 100 },
];

export const graphs = [
  { id: 'yield', title: 'Candidates vs compounds', channels: ['evaluated', 'found'], includeZero: true },
  { id: 'bonding', title: 'Bond character', channels: ['ionic', 'covalent', 'metallic'], includeZero: true },
  { id: 'progress', title: 'Search progress', channels: ['progress'], includeZero: true },
  { id: 'best', title: 'Best plausibility', channels: ['bestStability'], includeZero: true },
];

export const actions = [];

export function defaultParams(overrides = {}) {
  return Object.assign(Object.fromEntries(params.map((p) => [p.key, p.default])), overrides);
}
