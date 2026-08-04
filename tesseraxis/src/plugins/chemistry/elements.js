// The periodic table, as much of it as this lab reasons about.
//
// Each row is [symbol, name, Z, group, period, electronegativity, oxidation
// states, atomic mass, category]. Oxidation states are listed most-common
// first, which the generator relies on when scoring how ordinary a compound
// is. Electronegativity is Pauling; null means it has no meaningful value
// (the noble gases that form nothing here).

const RAW = [
  ['H', 'Hydrogen', 1, 1, 1, 2.20, [1, -1], 1.008, 'nonmetal'],
  ['He', 'Helium', 2, 18, 1, null, [], 4.003, 'noble'],
  ['Li', 'Lithium', 3, 1, 2, 0.98, [1], 6.94, 'alkali'],
  ['Be', 'Beryllium', 4, 2, 2, 1.57, [2], 9.012, 'alkaline'],
  ['B', 'Boron', 5, 13, 2, 2.04, [3], 10.81, 'metalloid'],
  ['C', 'Carbon', 6, 14, 2, 2.55, [4, -4, 2], 12.011, 'nonmetal'],
  ['N', 'Nitrogen', 7, 15, 2, 3.04, [-3, 5, 3], 14.007, 'nonmetal'],
  ['O', 'Oxygen', 8, 16, 2, 3.44, [-2], 15.999, 'nonmetal'],
  ['F', 'Fluorine', 9, 17, 2, 3.98, [-1], 18.998, 'halogen'],
  ['Ne', 'Neon', 10, 18, 2, null, [], 20.180, 'noble'],
  ['Na', 'Sodium', 11, 1, 3, 0.93, [1], 22.990, 'alkali'],
  ['Mg', 'Magnesium', 12, 2, 3, 1.31, [2], 24.305, 'alkaline'],
  ['Al', 'Aluminium', 13, 13, 3, 1.61, [3], 26.982, 'post-transition'],
  ['Si', 'Silicon', 14, 14, 3, 1.90, [4, -4], 28.085, 'metalloid'],
  ['P', 'Phosphorus', 15, 15, 3, 2.19, [5, 3, -3], 30.974, 'nonmetal'],
  ['S', 'Sulfur', 16, 16, 3, 2.58, [-2, 6, 4], 32.06, 'nonmetal'],
  ['Cl', 'Chlorine', 17, 17, 3, 3.16, [-1, 7, 5, 1], 35.45, 'halogen'],
  ['Ar', 'Argon', 18, 18, 3, null, [], 39.948, 'noble'],
  ['K', 'Potassium', 19, 1, 4, 0.82, [1], 39.098, 'alkali'],
  ['Ca', 'Calcium', 20, 2, 4, 1.00, [2], 40.078, 'alkaline'],
  ['Sc', 'Scandium', 21, 3, 4, 1.36, [3], 44.956, 'transition'],
  ['Ti', 'Titanium', 22, 4, 4, 1.54, [4, 3], 47.867, 'transition'],
  ['V', 'Vanadium', 23, 5, 4, 1.63, [5, 4, 3], 50.942, 'transition'],
  ['Cr', 'Chromium', 24, 6, 4, 1.66, [3, 6, 2], 51.996, 'transition'],
  ['Mn', 'Manganese', 25, 7, 4, 1.55, [2, 4, 7], 54.938, 'transition'],
  ['Fe', 'Iron', 26, 8, 4, 1.83, [3, 2], 55.845, 'transition'],
  ['Co', 'Cobalt', 27, 9, 4, 1.88, [2, 3], 58.933, 'transition'],
  ['Ni', 'Nickel', 28, 10, 4, 1.91, [2, 3], 58.693, 'transition'],
  ['Cu', 'Copper', 29, 11, 4, 1.90, [2, 1], 63.546, 'transition'],
  ['Zn', 'Zinc', 30, 12, 4, 1.65, [2], 65.38, 'transition'],
  ['Ga', 'Gallium', 31, 13, 4, 1.81, [3], 69.723, 'post-transition'],
  ['Ge', 'Germanium', 32, 14, 4, 2.01, [4], 72.630, 'metalloid'],
  ['As', 'Arsenic', 33, 15, 4, 2.18, [3, 5, -3], 74.922, 'metalloid'],
  ['Se', 'Selenium', 34, 16, 4, 2.55, [-2, 4, 6], 78.971, 'nonmetal'],
  ['Br', 'Bromine', 35, 17, 4, 2.96, [-1, 5], 79.904, 'halogen'],
  ['Kr', 'Krypton', 36, 18, 4, 3.00, [], 83.798, 'noble'],
  ['Rb', 'Rubidium', 37, 1, 5, 0.82, [1], 85.468, 'alkali'],
  ['Sr', 'Strontium', 38, 2, 5, 0.95, [2], 87.62, 'alkaline'],
  ['Zr', 'Zirconium', 40, 4, 5, 1.33, [4], 91.224, 'transition'],
  ['Mo', 'Molybdenum', 42, 6, 5, 2.16, [6, 4], 95.95, 'transition'],
  ['Ag', 'Silver', 47, 11, 5, 1.93, [1], 107.868, 'transition'],
  ['Cd', 'Cadmium', 48, 12, 5, 1.69, [2], 112.414, 'transition'],
  ['Sn', 'Tin', 50, 14, 5, 1.96, [4, 2], 118.710, 'post-transition'],
  ['Sb', 'Antimony', 51, 15, 5, 2.05, [3, 5], 121.760, 'metalloid'],
  ['Te', 'Tellurium', 52, 16, 5, 2.10, [-2, 4, 6], 127.60, 'metalloid'],
  ['I', 'Iodine', 53, 17, 5, 2.66, [-1, 5, 7], 126.904, 'halogen'],
  ['Xe', 'Xenon', 54, 18, 5, 2.60, [], 131.293, 'noble'],
  ['Ba', 'Barium', 56, 2, 6, 0.89, [2], 137.327, 'alkaline'],
  ['W', 'Tungsten', 74, 6, 6, 2.36, [6, 4], 183.84, 'transition'],
  ['Pt', 'Platinum', 78, 10, 6, 2.28, [2, 4], 195.084, 'transition'],
  ['Au', 'Gold', 79, 11, 6, 2.54, [3, 1], 196.967, 'transition'],
  ['Hg', 'Mercury', 80, 12, 6, 2.00, [2, 1], 200.592, 'transition'],
  ['Pb', 'Lead', 82, 14, 6, 2.33, [2, 4], 207.2, 'post-transition'],
  ['U', 'Uranium', 92, 3, 7, 1.38, [6, 4], 238.029, 'actinide'],
];

export const ELEMENTS = RAW.map(
  ([symbol, name, number, group, period, electronegativity, oxidation, mass, category]) => ({
    symbol, name, number, group, period, electronegativity, oxidation, mass, category,
  }),
);

export const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]));

const METALS = new Set(['alkali', 'alkaline', 'transition', 'post-transition', 'actinide']);
export const isMetal = (element) => METALS.has(element.category);
export const isNoble = (element) => element.category === 'noble';

export const CATEGORY_COLOR = {
  alkali: 0xff7a90,
  alkaline: 0xffa43b,
  transition: 0x6be5ff,
  'post-transition': 0x8fd4a8,
  metalloid: 0xf2c14e,
  nonmetal: 0x48ffa8,
  halogen: 0xc59bff,
  noble: 0x7d8ea3,
  actinide: 0xff5d73,
};
