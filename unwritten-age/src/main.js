import * as THREE from "three";
import { EffectComposer } from "../vendor/postprocessing/EffectComposer.js";
import { RenderPass } from "../vendor/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "../vendor/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../vendor/postprocessing/OutputPass.js";

import {
  ABILITIES, ASPECT_KEYS, GODS, OPENING, QUESTS, WITNESS_LINES,
  levelFromXp,
} from "./data.js";
import {
  WORLD_SIZE,
  buildAtmosphere, buildScatter, buildSettlement, buildSky, buildTemple,
  buildTerrain, buildTracks, buildWater, groundY, heightAt,
} from "./world.js";
import { GodBoss, spawnEnemies } from "./entities.js";
import { Player } from "./player.js";
import { Chronicle } from "./chronicle.js";
import { defaultAppearance, loadActive, saveActive } from "./character/appearance.js";
import { CharacterCreator } from "./character/creator.js";
import { CLASSES } from "./character/classes.js";
import { PRACTICES, newPracticeState, grantPractice, totalLevel } from "./systems/practices.js";
import { FACTIONS, newStandingState, adjustStanding } from "./world/factions.js";
import { spawnBeasts } from "./world/beasts.js";
import { ANCIENT_SITES, buildAncientSites } from "./world/sites.js";
import { UI } from "./ui.js";
import { buildWorldEnvironment } from "./render/environment.js";
import {
  equipItem, loadWorldState, makeSiteReward, saveWorldState,
} from "./systems/equipment.js";

/* ---------------------------------------------------------------- renderer */

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;

const scene = new THREE.Scene();
scene.environment = buildWorldEnvironment(renderer);
scene.fog = new THREE.FogExp2(new THREE.Color("#9aa7b4"), 0.0036);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 1400);

/* ------------------------------------------------------------------- world */

const sky = buildSky();
scene.add(sky);
scene.add(buildTerrain());

const water = buildWater();
scene.add(water);
scene.add(buildScatter());

const settlement = buildSettlement();
scene.add(settlement);

const temple = buildTemple();
scene.add(temple);

scene.add(buildTracks());
const atmosphere = buildAtmosphere();
scene.add(atmosphere);

// Low, warm sun — the whole mood of the piece rests on this one light.
const sun = new THREE.DirectionalLight("#ffe9cf", 2.2);
sun.position.set(-120, 95, -80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 420;
const shadowSpan = 160;
Object.assign(sun.shadow.camera, {
  left: -shadowSpan, right: shadowSpan, top: shadowSpan, bottom: -shadowSpan,
});
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0006;
scene.add(sun);

scene.add(new THREE.HemisphereLight("#c4d8ef", "#4a4438", 1.05));
scene.add(new THREE.AmbientLight("#7b8496", 0.42));

/* ---------------------------------------------------------------- post fx */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.34, 0.72, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ state */

const savedWorld = loadWorldState();
const state = {
  player: null,
  remembrance: 40,
  remembranceRate: 1.2,
  aspects: Object.fromEntries(ASPECT_KEYS.map((k) => [k, { xp: 0, level: 1 }])),
  known: new Set(["kindle", "ward"]),
  hotbar: ["kindle", "ward", null, null, null],
  cooldowns: {},
  quests: [],
  kills: 0,
  erasureDone: false,
  practices: newPracticeState(),
  standing: newStandingState(),
  discoveredSites: new Set(savedWorld?.discoveredSites ?? []),
  inventory: savedWorld?.inventory ?? [],
  equipment: savedWorld?.equipment ?? {},
};

const chronicle = new Chronicle(state);
const ui = new UI(state, chronicle);

const appearance = loadActive() ?? defaultAppearance();
const player = new Player(camera, canvas, appearance);
state.player = player;
scene.add(player.mesh);

const enemies = spawnEnemies(scene);
const beasts = spawnBeasts(scene, groundY, WORLD_SIZE);
const ancientSiteRoots = buildAncientSites(groundY);
ancientSiteRoots.forEach((site) => scene.add(site));

const boss = new GodBoss(
  GODS.vashan,
  new THREE.Vector3(96, heightAt(96, -78) + 11, -78),
);
scene.add(boss.mesh);

/**
 * Fold the chosen archetype's abilities into the ability table and onto the
 * hotbar. Class abilities live in classes.js; ABILITIES is the runtime lookup
 * that cooldowns, costs and the cast dispatcher all read from.
 */
function equipArchetype(classId) {
  const archetype = CLASSES[classId];
  if (!archetype) return;
  [archetype.basic, archetype.godlike].forEach((ability) => {
    ABILITIES[ability.id] = ability;
    state.known.add(ability.id);
  });
  // Slot 1 basic, slot 5 godlike — the shape every player of these games expects.
  state.hotbar[0] = archetype.basic.id;
  state.hotbar[4] = archetype.godlike.id;
}

/* Start the god's quest. */
state.quests.push({ ...QUESTS.wardOfStone, step: 1, counter: "0 / 8" });

/* ------------------------------------------------------------- progression */

function grantXp(aspect, amount) {
  const record = state.aspects[aspect];
  record.xp += amount;
  const next = levelFromXp(record.xp);
  if (next > record.level) {
    record.level = next;
    ui.log(`${aspect.toUpperCase()} reaches level ${next}.`, "level");
    // The old cone avatar carried a halo mesh; the humanoid does not. Growing
    // divinity now shows as the presence the avatar casts, not as a prop.
    player.light.intensity = 2.2 + next * 0.55;
    player.light.distance = 6 + next * 0.8;
    player.maxHp += 14;
    player.hp = player.maxHp;
    // Unlock anything this level opens.
    Object.values(ABILITIES).forEach((ability) => {
      if (ability.aspect !== aspect || state.known.has(ability.id)) return;
      if (chronicle.isErased(ability.source)) return;
      if (record.level < ability.unlock) return;
      state.known.add(ability.id);
      const slot = state.hotbar.indexOf(null);
      if (slot !== -1) state.hotbar[slot] = ability.id;
      ui.log(`New miracle: ${ability.name}`, "unlock");
    });
  }
}

/* ------------------------------------------------------------------ combat */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let target = null;

function screenPos(vec3) {
  const p = vec3.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
}

function nearestEnemy(range) {
  let best = null;
  let bestDist = range;
  enemies.forEach((e) => {
    if (e.dead) return;
    const d = e.mesh.position.distanceTo(player.position);
    if (d < bestDist) { bestDist = d; best = e; }
  });
  if (boss.active && !boss.dead) {
    const d = boss.mesh.position.distanceTo(player.position);
    if (d < bestDist) best = boss;
  }
  return best;
}

/** Practice xp and faction standing, awarded where the fiction says they are. */
function reward(practiceId, xp, factionId, standing) {
  const gained = grantPractice(state.practices, practiceId, xp);
  if (gained) {
    ui.log(`${PRACTICES[practiceId].name} reaches level ${gained}. (total ${totalLevel(state.practices)})`, "level");
  }
  if (factionId) adjustStanding(state.standing, factionId, standing);
}

function hurt(entity, amount, aspect) {
  const died = entity.damage(amount);
  const sp = screenPos(entity.mesh.position);
  ui.float(`-${Math.round(amount)}`, sp.x, sp.y, "dmg");
  target = entity;

  if (!died) return;

  if (entity === boss) { onBossDefeated(); return; }

  scene.remove(entity.mesh);
  state.kills += 1;
  // The Quiet are what the Silence-touched belong to; thinning them is noticed.
  reward("tracking", 34, "emberCircle", 12);
  state.remembrance += entity.type.remembrance;
  grantXp(aspect, entity.type.xp);
  grantXp("wild", Math.round(entity.type.xp * 0.25));

  const quest = state.quests.find((q) => q.id === "wardOfStone");
  if (quest && quest.step === 1) {
    const done = Math.min(8, state.kills);
    quest.counter = `${done} / 8`;
    if (done >= 8) {
      quest.step = 2;
      quest.counter = "";
      ui.log("The ward stone has gone quiet. Something is waiting inside the temple.", "quest");
      boss.spawn();
    }
  }
}

function castAbility(index) {
  const id = state.hotbar[index];
  if (!id) {
    // Pressing a key that used to do something is part of the story.
    if (state.erasureDone) ui.log("Nothing answers. There was never anything there.", "void");
    return;
  }
  const ability = ABILITIES[id];
  if ((state.cooldowns[id] ?? 0) > 0) return;
  if (state.remembrance < ability.cost) {
    ui.log("Not enough Remembrance. You are not being spoken of.", "warn");
    return;
  }

  state.remembrance -= ability.cost;
  state.cooldowns[id] = ability.cooldown;

  if (ability.heal) {
    player.heal(ability.heal);
    if (ability.shield) player.shield += ability.shield;
    const sp = screenPos(player.position.clone().setY(player.position.y + 3));
    ui.float(`+${ability.heal}`, sp.x, sp.y, "heal");
    grantXp(ability.aspect, 26);
    spawnRing(player.position, ability.colour);
  }

  const isGodlike = Boolean(ability.shape);
  if (isGodlike) {
    const anchor = nearestEnemy(ability.range ?? 24)?.mesh.position.clone() ?? player.position.clone();
    spawnGodlike(ability, anchor);
    ui.log(`${ability.name}.`, "unlock");
    // Area damage around the anchor, whether or not anything was targeted.
    if (ability.damage) {
      enemies.forEach((e) => {
        if (e.dead) return;
        if (e.mesh.position.distanceTo(anchor) <= (ability.radius ?? 20)) {
          hurt(e, ability.damage, ability.aspect);
        }
      });
      if (boss.active && !boss.dead && boss.mesh.position.distanceTo(anchor) <= (ability.radius ?? 20)) {
        hurt(boss, ability.damage, ability.aspect);
      }
    }
    grantXp(ability.aspect, 120);
    return;
  }

  if (ability.damage) {
    const hit = nearestEnemy(ability.range);
    if (!hit) { ui.log("Nothing within reach.", "warn"); return; }
    spawnBolt(player.position, hit.mesh.position, ability.colour);
    hurt(hit, ability.damage, ability.aspect);
    if (ability.radius) {
      enemies.forEach((e) => {
        if (e.dead || e === hit) return;
        if (e.mesh.position.distanceTo(hit.mesh.position) <= ability.radius) {
          hurt(e, ability.damage * 0.55, ability.aspect);
        }
      });
    }
  }
}

/* ------------------------------------------------------------------ effects */

const effects = [];

function spawnBolt(from, to, colour) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    from.clone().setY(from.y + 2.4), to.clone(),
  ]);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 1 }),
  );
  scene.add(line);
  effects.push({ obj: line, life: 0.3, max: 0.3, kind: "fade" });
}

function spawnRing(pos, colour) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.16, 6, 36),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.95 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(pos).setY(pos.y + 0.6);
  scene.add(ring);
  effects.push({ obj: ring, life: 0.85, max: 0.85, kind: "grow" });
}

/**
 * The godlike signature. Each archetype's ultimate reads differently at a
 * glance — a rising column, an expanding ring of ground, a descending strike —
 * because "which ultimate just went off" has to be legible from the silhouette
 * alone, not from the colour.
 */
function spawnGodlike(ability, at) {
  const colour = new THREE.Color(ability.colour);
  const radius = ability.radius ?? 18;

  // Ground ring: always present, sized to the actual area of effect, so the
  // player learns the real radius rather than guessing it.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.16, radius * 0.2, 48),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(at).setY(groundY(at.x, at.z) + 0.12);
  scene.add(ring);
  effects.push({ obj: ring, life: 1.5, max: 1.5, kind: "expand", to: 5.2 });

  const shapes = {
    storm: () => {
      // A column down from the sky.
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.05, radius * 0.13, 60, 7, 1, true),
        new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
      );
      bolt.position.copy(at).setY(groundY(at.x, at.z) + 30);
      scene.add(bolt);
      effects.push({ obj: bolt, life: 0.55, max: 0.55, kind: "fade" });
    },
    upheaval: () => {
      // Slabs of ground standing up.
      for (let i = 0; i < 9; i += 1) {
        const a = (i / 9) * Math.PI * 2;
        const r = radius * 0.45;
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 4.5, 0.9),
          new THREE.MeshStandardMaterial({ color: "#6d6b67", flatShading: true, transparent: true }),
        );
        const x = at.x + Math.cos(a) * r;
        const z = at.z + Math.sin(a) * r;
        slab.position.set(x, groundY(x, z) + 1.4, z);
        slab.rotation.set((Math.random() - 0.5) * 0.4, a, (Math.random() - 0.5) * 0.3);
        scene.add(slab);
        effects.push({ obj: slab, life: 2.2, max: 2.2, kind: "fade" });
      }
    },
    stampede: () => {
      // Dust and mass moving through.
      for (let i = 0; i < 16; i += 1) {
        const puff = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.9 + Math.random() * 1.5, 0),
          new THREE.MeshBasicMaterial({ color: "#9c8f76", transparent: true, opacity: 0.55 }),
        );
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        puff.position.set(at.x + Math.cos(a) * r, groundY(at.x, at.z) + 0.8 + Math.random() * 1.6, at.z + Math.sin(a) * r);
        scene.add(puff);
        effects.push({ obj: puff, life: 1.4, max: 1.4, kind: "expand", to: 2.4 });
      }
    },
    procession: () => {
      // A line of pale figures arriving.
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.3, 1.75, 6),
          new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.6 }),
        );
        const x = at.x + Math.cos(a) * radius * 0.55;
        const z = at.z + Math.sin(a) * radius * 0.55;
        shade.position.set(x, groundY(x, z) + 0.9, z);
        scene.add(shade);
        effects.push({ obj: shade, life: 2.6, max: 2.6, kind: "rise" });
      }
    },
    bulwark: () => {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
      );
      dome.position.copy(at).setY(groundY(at.x, at.z));
      scene.add(dome);
      effects.push({ obj: dome, life: 3.2, max: 3.2, kind: "fade" });
    },
    forgetting: () => {
      // The ground stops having been. Colour drains out of a sphere.
      const gap = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.42, 22, 16),
        new THREE.MeshBasicMaterial({ color: "#0a0a10", transparent: true, opacity: 0.82 }),
      );
      gap.position.copy(at).setY(groundY(at.x, at.z) + 1.5);
      scene.add(gap);
      effects.push({ obj: gap, life: 1.9, max: 1.9, kind: "expand", to: 1.9 });
    },
  };
  (shapes[ability.shape] ?? shapes.storm)();
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const fx = effects[i];
    fx.life -= dt;
    const t = Math.max(0, fx.life / fx.max);
    if (fx.kind === "grow") {
      fx.obj.scale.setScalar(1 + (1 - t) * 5.5);
    } else if (fx.kind === "expand") {
      fx.obj.scale.setScalar(1 + (1 - t) * (fx.to ?? 3));
    } else if (fx.kind === "rise") {
      fx.obj.position.y += dt * 1.1;
    }
    fx.obj.material.opacity = t;
    if (fx.life <= 0) {
      scene.remove(fx.obj);
      fx.obj.geometry.dispose();
      fx.obj.material.dispose();
      effects.splice(i, 1);
    }
  }
}

/* ------------------------------------------------------------ THE ERASURE */

/**
 * The centrepiece. This is not a cutscene: `chronicle.eraseGod` mutates real
 * game state, and everything below is the world visibly catching up to a
 * history that has already changed.
 */
async function onBossDefeated() {
  boss.dead = true;
  boss.active = false;
  target = null;
  ui.setTarget(null);
  grantXp("conqueror", 900);
  grantXp("sovereign", 420);

  scene.remove(boss.mesh);
  document.body.classList.add("unwriting");
  ui.log("Vashan falls.", "kill");

  await wait(900);

  const changes = chronicle.eraseGod("vashan");
  state.erasureDone = true;

  // 1. The temple becomes what it "always was".
  const { intact, ruined, stone, baseStone, ruinStone, wardLight } = temple.userData;
  stone.transparent = true;
  const cleanBase = new THREE.Color("#cfd6de");
  const weathered = new THREE.Color("#6a6863");
  await tween(2.2, (t) => {
    stone.opacity = 1 - t;
    ruinStone.opacity = t;
    // The plinth stays — it only ages into the thing it always was.
    baseStone.color.copy(cleanBase).lerp(weathered, t);
    wardLight.intensity = 60 * (1 - t);
    intact.scale.setScalar(1 - t * 0.04);
  });
  intact.visible = false;

  // 2. The ability leaves the bar, slot by slot, leaving a hole behind.
  changes.abilities.forEach(({ slot }) => {
    const el = ui.hotbarEls[slot];
    el.classList.add("erasing");
    setTimeout(() => el.classList.remove("erasing"), 1600);
  });

  // 3. The quest unwrites itself.
  changes.quests.forEach(() => {
    const node = document.querySelector(".quest");
    if (node) node.classList.add("erasing");
  });

  await wait(1400);
  ui.update();
  document.body.classList.remove("unwriting");

  // 4. Your own people, sincerely.
  ui.log(GODS.vashan.afterLine, "npc");

  await wait(700);
  await ui.banner(WITNESS_LINES, { duration: 6200, className: "witness" });

  // 5. The journal only you can read.
  renderJournal();
  ui.log("Your journal remembers. Press J.", "void");
}

function renderJournal() {
  const el = document.getElementById("journalBody");
  el.innerHTML = chronicle.witnessed
    .map(
      (w) => `<article>
        <h4>${w.name}<small>${w.epithet}</small></h4>
        <p>Their house: <b>${w.temple}</b> — the world now calls it a ruin that was never built.</p>
        <p>What they gave you: <b>${w.abilities.join(", ") || "nothing that remains"}</b></p>
        <p class="note">${w.note}</p>
      </article>`,
    )
    .join("");
  document.getElementById("journalTab").classList.add("available");
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function tween(seconds, fn) {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / (seconds * 1000));
      fn(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    step();
  });
}

/* ------------------------------------------------------------------- input */

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 5) castAbility(n - 1);
  if (e.code === "Space") {
    const hit = nearestEnemy(9);
    if (hit) {
      const amount = 9 + state.aspects.conqueror.level * 2.4;
      hurt(hit, amount, "conqueror");
      spawnBolt(player.position, hit.mesh.position, "#ffe0a8");
    }
  }
  if (e.code === "KeyJ") document.getElementById("journal").classList.toggle("show");
  if (e.code === "KeyP") document.getElementById("practicePanel").classList.toggle("show");
  if (e.code === "KeyC") document.getElementById("codex").classList.toggle("show");
  if (e.code === "KeyI") document.getElementById("inventory").classList.toggle("show");
  if (e.code === "Escape") document.querySelectorAll("#journal, .game-overlay").forEach((el) => el.classList.remove("show"));
});

canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const meshes = enemies.filter((en) => !en.dead).map((en) => en.mesh);
  if (boss.active && !boss.dead) meshes.push(boss.core);
  const hits = raycaster.intersectObjects(meshes, true);
  if (!hits.length) return;
  let obj = hits[0].object;
  while (obj && !obj.userData.entity && !obj.userData.boss) obj = obj.parent;
  target = obj?.userData.entity ?? obj?.userData.boss ?? null;
});

document.getElementById("practiceTab").addEventListener("click", () =>
  document.getElementById("practicePanel").classList.toggle("show"));
document.getElementById("journalTab").addEventListener("click", () =>
  document.getElementById("journal").classList.toggle("show"));
document.getElementById("journalClose").addEventListener("click", () =>
  document.getElementById("journal").classList.remove("show"));
document.getElementById("codexTab").addEventListener("click", () =>
  document.getElementById("codex").classList.toggle("show"));
document.getElementById("inventoryTab").addEventListener("click", () =>
  document.getElementById("inventory").classList.toggle("show"));
document.querySelectorAll(".overlay-close").forEach((button) => button.addEventListener("click", () =>
  button.closest(".game-overlay").classList.remove("show")));
document.getElementById("inventoryBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-equip]");
  if (!button) return;
  const item = state.inventory.find((candidate) => candidate.uid === button.dataset.equip);
  if (!item) return;
  equipItem(state, item);
  saveWorldState(state);
  ui.renderEquipment();
  ui.log(`${item.name} equipped in the ${item.slot} slot.`, "unlock");
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* Dev bridge, only on ?dev=1 — lets the erasure be reviewed without first
   grinding eight kills. Deliberately gated so a normal player never has it. */
if (new URLSearchParams(location.search).has("dev")) {
  window.__dev = {
    state, chronicle, player, boss, enemies, ui, scene, camera, temple, ancientSiteRoots,
    goto: (x, z) => player.position.set(x, 0, z),
    toTemple: () => player.position.set(96, 0, -52),
    toSite: (id) => {
      const site = ANCIENT_SITES.find((candidate) => candidate.id === id) ?? ANCIENT_SITES[0];
      player.position.set(site.position[0], 0, site.position[1] + 10);
    },
    summon: () => boss.spawn(),
    killBoss: () => { boss.hp = 0; boss.dead = false; onBossDefeated(); },
  };
}

/* -------------------------------------------------------------- game loop */

const clock = new THREE.Clock();
let elapsed = 0;
let siteCheckAt = 0;

function discoverNearbySite() {
  for (const site of ANCIENT_SITES) {
    if (state.discoveredSites.has(site.id)) continue;
    const distance = Math.hypot(player.position.x - site.position[0], player.position.z - site.position[1]);
    if (distance > 13) continue;
    state.discoveredSites.add(site.id);
    const item = makeSiteReward(site);
    if (!state.inventory.some((owned) => owned.uid === item.uid)) state.inventory.push(item);
    saveWorldState(state);
    ui.renderCodex();
    ui.renderEquipment();
    ui.log(`Ancient site discovered: ${site.name}.`, "quest");
    ui.log(`Recovered: ${item.name}. Press I to inspect it.`, "unlock");
    ui.banner([site.name, site.myth], { duration: 4300, className: "witness" });
    const root = ancientSiteRoots.find((candidate) => candidate.name === site.id);
    if (root?.userData.marker) root.userData.marker.material.opacity = .1;
    break;
  }
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  if (elapsed >= siteCheckAt) {
    siteCheckAt = elapsed + .45;
    discoverNearbySite();
  }

  player.update(dt);

  // Remembrance accrues from being worshipped.
  state.remembrance = Math.min(999, state.remembrance + state.remembranceRate * dt);

  Object.keys(state.cooldowns).forEach((id) => {
    if (state.cooldowns[id] > 0) state.cooldowns[id] = Math.max(0, state.cooldowns[id] - dt);
  });

  enemies.forEach((e) => {
    if (e.dead) return;
    e.mesh.material.emissiveIntensity += (0.9 - e.mesh.material.emissiveIntensity) * dt * 4;
    e.update(dt, player.position, (dmg) => {
      if (player.takeDamage(dmg)) respawn();
      const sp = screenPos(player.position.clone().setY(player.position.y + 3));
      ui.float(`-${dmg}`, sp.x, sp.y, "hurt");
      document.body.classList.add("hit");
      setTimeout(() => document.body.classList.remove("hit"), 140);
    });
  });

  boss.update(dt, player.position, (dmg) => {
    if (player.takeDamage(dmg)) respawn();
    const sp = screenPos(player.position.clone().setY(player.position.y + 3));
    ui.float(`-${dmg}`, sp.x, sp.y, "hurt");
  });
  if (boss.active && !boss.dead) {
    boss.material.emissiveIntensity += (1.4 - boss.material.emissiveIntensity) * dt * 3;
  }

  beasts.forEach((b) => {
    if (b.dead) return;
    const d = b.root.position.distanceTo(player.position);
    // Only the near ones pay for animation; the rest hold their pose.
    b.animate(dt, d < 60 ? (d < 14 ? 0.75 : 0.18) : 0);
  });

  updateEffects(dt);

  // Water ripple + campfire flicker.
  const shader = water.material.userData.shader;
  if (shader) shader.uniforms.uTime.value = elapsed;
  const { fire, fireLight } = settlement.userData;
  fire.scale.setScalar(1 + Math.sin(elapsed * 7) * 0.12);
  fireLight.intensity = 100 + Math.sin(elapsed * 9) * 22;
  if (temple.userData.ward.visible) {
    temple.userData.ward.rotation.y += dt * 0.6;
  }

  sky.position.copy(camera.position);

  // Drifting snow, wrapped around the camera so the field is never exhausted.
  const drift = atmosphere.geometry.attributes.position;
  const base = atmosphere.userData.basePositions;
  for (let i = 0; i < drift.count; i += 1) {
    const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
    const y = ((by - elapsed * 1.5) % 42 + 42) % 42;
    drift.setXYZ(
      i,
      camera.position.x + bx + Math.sin(elapsed * 0.35 + by) * 2.4,
      y + 1,
      camera.position.z + bz + Math.cos(elapsed * 0.28 + bx) * 2.0,
    );
  }
  drift.needsUpdate = true;

  if (target && (target.dead || target.mesh.position.distanceTo(player.position) > 60)) target = null;
  ui.setTarget(target);
  ui.update();

  composer.render();
}

function respawn() {
  player.hp = player.maxHp;
  player.shield = 0;
  player.position.set(0, 0, 40);
  state.remembrance = Math.max(0, state.remembrance - 25);
  ui.log("You dim, and the fire calls you back.", "warn");
}

/* --------------------------------------------------------------- boot */

document.getElementById("loading").classList.add("done");
frame();

const creator = new CharacterCreator(document.getElementById("creator"), (chosen) => {
  creator.hide();
  Object.assign(appearance, chosen);
  saveActive(appearance);
  player.setAppearance(appearance);
  equipArchetype(appearance.archetype);
  ui.update();
  enterWorld();
});

if (window.__dev) window.__dev.creator = creator;

async function enterWorld() {
  await ui.banner(OPENING, { duration: 9000, className: "opening" });
  const archetype = CLASSES[appearance.archetype];
  ui.log(`${appearance.name} of ${appearance.culture === "aurean" ? "the Aureans" : "the Veyr"}.`, "quest");
  ui.log(`${archetype.basic.name} — press 1. ${archetype.godlike.name} — press 5.`, "unlock");
  ui.log(GODS.vashan.beforeLine, "npc");
}

document.getElementById("beginBtn").addEventListener("click", () => {
  document.getElementById("intro").classList.add("gone");
  creator.show();
}, { once: true });
