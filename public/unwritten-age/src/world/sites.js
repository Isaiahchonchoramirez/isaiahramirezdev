import * as THREE from "three";
import { bone, ivory, ochre, stone } from "../render/materials.js";

export const ANCIENT_SITES = [
  {
    id: "pavlov-hearths", name: "The Hearths of Pavlov", dates: "c. 29,000–25,000 BCE",
    inspiration: "Dolní Věstonice and Pavlov, present-day Czech Republic", category: "Seasonal settlement",
    biome: "Cold loess steppe", position: [-72, 18],
    features: ["mammoth-bone structures", "hearths", "fired-clay figurines", "flint working"],
    materials: ["ivory", "bone", "hide", "ochre", "flint"],
    fauna: ["mammoth", "reindeer", "hare"], activity: "Hunting, toolmaking, firing clay, and communal living.",
    myth: "Small clay guardians wake beside the fire and mammoth ancestors keep remembered paths open.",
    codex: "Large Upper Paleolithic settlements in this region preserve mammoth remains, hearths, tools, ornaments, and some of the earliest known fired-clay objects.",
    confidence: "The archaeological features are grounded in excavated evidence; awakened figurines and ancestor paths are fictional.",
    colour: "#c26a3d",
    rewards: [{ id: "ivory-needle", name: "Ivory Sewing Needle", slot: "tool", material: "ivory", power: 8 }],
  },
  {
    id: "kostenki-circles", name: "The Buried Circles", dates: "c. 40,000–20,000 BCE",
    inspiration: "Kostenki–Borshchevo, Don River, present-day Russia", category: "River-terrace settlement",
    biome: "Open steppe above a river terrace", position: [78, 72],
    features: ["circular dwelling plan", "mammoth bone", "hearth pits", "flint production"],
    materials: ["mammoth bone", "chalk", "flint", "hide"],
    fauna: ["mammoth", "horse", "arctic fox"], activity: "Repeated occupation, hunting, dwelling construction, and stone-tool production.",
    myth: "Bone rings buried under wind-blown earth become thresholds into ancestral memory.",
    codex: "Kostenki is a complex of many Upper Paleolithic sites rather than one settlement. Occupation dates and structures vary across the region.",
    confidence: "The composite landscape is compressed from multiple sites; memory gates are fictional.",
    colour: "#d0c3a3",
    rewards: [{ id: "flint-point", name: "Pressure-Flaked Point", slot: "tool", material: "flint", power: 11 }],
  },
  {
    id: "sungir-sanctuary", name: "The Beaded Dead", dates: "c. 34,000 BCE",
    inspiration: "Sunghir, near Vladimir, present-day Russia", category: "Burial sanctuary",
    biome: "Cold open woodland", position: [112, -18],
    features: ["elaborate burials", "thousands of ivory beads", "long ivory objects", "ceremonial clothing"],
    materials: ["ivory", "ochre", "beads", "hide"],
    fauna: ["reindeer", "wolf", "mammoth"], activity: "Burial ritual, bead production, and remembrance of particular individuals.",
    myth: "The dead keep their names and lend remembered garments to those who complete their unfinished journeys.",
    codex: "Sunghir is known for richly furnished Upper Paleolithic burials. Reconstructions of clothing rely partly on bead placement around the bodies.",
    confidence: "Burial goods and bead distributions are archaeological; speaking ancestors and quests are fictional.",
    colour: "#b63f2b",
    rewards: [{ id: "beaded-mantle", name: "Ivory-Beaded Mantle", slot: "cloak", material: "hide", power: 14 }],
  },
  {
    id: "painted-depths", name: "The Painted Depths", dates: "c. 37,000–30,000 BCE",
    inspiration: "Chauvet Cave, present-day France", category: "Painted cave",
    biome: "Limestone gorge and deep cave", position: [-118, -74],
    features: ["charcoal drawings", "red ochre marks", "cave-bear remains", "dangerous chambers"],
    materials: ["charcoal", "ochre", "limestone", "animal fat"],
    fauna: ["cave bear", "lion", "rhinoceros", "horse"], activity: "Image-making and repeated movement through dark cave chambers.",
    myth: "Painted animals step away from the wall when no flame looks directly at them.",
    codex: "Chauvet preserves sophisticated animal imagery and traces of cave bears. The meaning of the images is debated and should not be presented as settled fact.",
    confidence: "Animals and pigments reflect the cave record; animation and ritual interpretation are fictional.",
    colour: "#56362e",
    rewards: [{ id: "ochre-charm", name: "Painted Limestone Charm", slot: "charm", material: "stone", power: 12 }],
  },
];

const put = (mesh, x, z, groundY, lift = 0) => {
  mesh.position.set(x, groundY(x, z) + lift, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
};

function boneCircle(site, groundY) {
  const group = new THREE.Group();
  for (let i = 0; i < 14; i += 1) {
    const a = i / 14 * Math.PI * 2;
    const x = site.position[0] + Math.cos(a) * 7;
    const z = site.position[1] + Math.sin(a) * 7;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.24, .42, 3.2, 7), bone());
    put(post, x, z, groundY, 1.5); post.rotation.z = Math.sin(a) * .16; group.add(post);
  }
  return group;
}

function burial(site, groundY) {
  const group = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(5.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), ochre("#7d3a2b"));
  put(mound, ...site.position, groundY); mound.scale.y = .28; group.add(mound);
  for (let i = 0; i < 28; i += 1) {
    const a = i * 2.4, r = 1.1 + (i % 5) * .7;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(.11, 7, 5), ivory());
    put(bead, site.position[0] + Math.cos(a) * r, site.position[1] + Math.sin(a) * r, groundY, .22); group.add(bead);
  }
  return group;
}

function paintedCave(site, groundY) {
  const group = new THREE.Group();
  for (let i = 0; i < 9; i += 1) {
    const a = i / 9 * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3 + (i % 3), 1), stone("#4a4642"));
    put(rock, site.position[0] + Math.cos(a) * 6, site.position[1] + Math.sin(a) * 4, groundY, 2.2); group.add(rock);
  }
  const painting = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.6), ochre("#a44a2e"));
  put(painting, site.position[0], site.position[1] - 4.25, groundY, 2.5); group.add(painting);
  return group;
}

export function buildAncientSites(groundY) {
  return ANCIENT_SITES.map((site, index) => {
    const root = index === 2 ? burial(site, groundY) : index === 3 ? paintedCave(site, groundY) : boneCircle(site, groundY);
    root.name = site.id; root.userData.site = site;
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(8.5, .09, 6, 48),
      new THREE.MeshBasicMaterial({ color: site.colour, transparent: true, opacity: .34 }),
    );
    marker.rotation.x = Math.PI / 2;
    put(marker, ...site.position, groundY, .18);
    root.add(marker); root.userData.marker = marker;
    return root;
  });
}
