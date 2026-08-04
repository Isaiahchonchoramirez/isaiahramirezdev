import * as THREE from 'three';
import { ELEMENTS, BY_SYMBOL, CATEGORY_COLOR } from './elements.js';

const TILE = 2.6;
const GAP = 0.35;

export function createChemistryView(ctx, state) {
  const { viewport } = ctx;
  const root = new THREE.Group();

  // The table itself, laid out on its real group/period grid. Seeing where the
  // chosen elements sit is most of the intuition: things that bond well tend
  // to come from opposite sides of it.
  const tiles = new Map();
  const tileGeometry = new THREE.BoxGeometry(TILE, 0.4, TILE);
  for (const element of ELEMENTS) {
    const material = new THREE.MeshStandardMaterial({
      color: CATEGORY_COLOR[element.category] ?? 0x50606f,
      metalness: 0.3, roughness: 0.65, transparent: true, opacity: 0.22,
    });
    const tile = new THREE.Mesh(tileGeometry, material);
    tile.position.set(
      (element.group - 9.5) * (TILE + GAP),
      0,
      (element.period - 4) * (TILE + GAP),
    );
    tile.receiveShadow = true;
    root.add(tile);
    tiles.set(element.symbol, tile);
  }

  // The selected elements, raised and lit, with a bond drawn between each pair
  // the search is actually considering.
  const markers = new THREE.Group();
  root.add(markers);
  const bonds = new THREE.Group();
  root.add(bonds);

  function rebuildSelection() {
    for (const [symbol, tile] of tiles) {
      const selected = state.symbols.includes(symbol);
      tile.material.opacity = selected ? 0.95 : 0.18;
      tile.scale.y = selected ? 3.2 : 1;
      tile.position.y = selected ? 0.45 : 0;
    }

    markers.clear();
    bonds.clear();
    const points = [];
    for (const symbol of state.symbols) {
      const element = BY_SYMBOL.get(symbol);
      if (!element) continue;
      const tile = tiles.get(symbol);
      // Atom radius scaled off period: a rough stand-in for atomic size, which
      // is enough to show that the big electropositive ones sit bottom-left.
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + element.period * 0.16, 20, 16),
        new THREE.MeshStandardMaterial({
          color: CATEGORY_COLOR[element.category] ?? 0x8fa0b0,
          emissive: CATEGORY_COLOR[element.category] ?? 0x8fa0b0,
          emissiveIntensity: 0.25, metalness: 0.4, roughness: 0.3,
        }),
      );
      sphere.position.set(tile.position.x, 3.4, tile.position.z);
      sphere.castShadow = true;
      markers.add(sphere);
      points.push(sphere.position.clone());
    }

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([points[i], points[j]]),
          new THREE.LineBasicMaterial({ color: 0x6be5ff, transparent: true, opacity: 0.45 }),
        );
        bonds.add(line);
      }
    }
  }

  rebuildSelection();
  viewport.add(root);
  viewport.setGroundVisible?.(false);

  let lastCount = -1;

  function render() {
    // The only thing that changes during a run is how many compounds have been
    // found, so the scene is rebuilt only when that number moves.
    if (state.compounds.length !== lastCount) {
      lastCount = state.compounds.length;
      const best = state.compounds[0];
      for (const [symbol, tile] of tiles) {
        if (!state.symbols.includes(symbol)) continue;
        const inBest = best?.parts.some((p) => p.element.symbol === symbol);
        tile.material.emissive = new THREE.Color(inBest ? 0x2a4a2a : 0x000000);
      }
    }

    viewport.follow(0, 1.5, 0);
    viewport.frame(34);
  }

  return { render, dispose() { viewport.setGroundVisible?.(true); } };
}

export default createChemistryView;
