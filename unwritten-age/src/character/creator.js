import * as THREE from "three";
import { RiggedHumanoid } from "./rigged-humanoid.js";
import { CULTURES, CULTURE_IDS } from "./cultures.js";
import { CLASSES, CLASS_IDS } from "./classes.js";
import {
  BODY_SLIDERS, HEAD_SLIDERS, SKIN_TONES, HAIR_COLOURS, EYE_COLOURS,
  HAIR_STYLES, VOICES, MARKINGS, SCARS, BODY_SEXES,
  TORSO_GARMENTS, LOWER_GARMENTS, MANTLES, FOOTWEAR,
  defaultAppearance, randomAppearance, savePreset, loadPresets, deletePreset,
} from "./appearance.js";
import { buildStudioEnvironment } from "../render/environment.js";
import {
  applyGmRules, appearanceFromGmDefaults, clearGmRules,
  loadGmRules, normaliseGmRules, playerSliders, saveGmRules,
} from "./gm-rules.js";
import { OUTFIT_PRESETS, applyOutfitPresetToAppearance } from "./wardrobe-catalog.js";

/**
 * Character creation.
 *
 * Runs its own small renderer against its own scene, so it neither disturbs
 * nor is disturbed by the world renderer. It edits one plain object (the
 * appearance record) and pushes it into a `RiggedHumanoid` — the same class the
 * player controller uses — so the figure on the turntable is literally the body
 * that walks into the valley, not a stand-in that resembles it.
 *
 * Because the avatar is a shared glTF rather than a pile of primitives, it is
 * updated in place rather than rebuilt: the model is downloaded once, cached at
 * module level, and reused by both this preview and the world.
 *
 * Controls whose `affects` is "deferred" are rendered in a separate, clearly
 * labelled group. They save and load, but they will not move the mesh until a
 * morph-target rig exists. Showing them as working sliders would be a lie.
 */
export class CharacterCreator {
  constructor(container, onConfirm) {
    this.container = container;
    this.onConfirm = onConfirm;
    this.gmRules = loadGmRules();
    this.appearance = appearanceFromGmDefaults(defaultAppearance(), this.gmRules);
    this.orbit = 0.0;
    // Framed head-to-toe on a 1.74 m body. The View slider walks up to the face.
    this.camDistance = 3.2;
    this.camHeight = 0.5;    // 0..1 up the body
    this.lightAngle = 0.7;
    this.dragging = false;

    this.buildDom();
    this.buildScene();
    this.rebuild();
    this.renderLoop();
  }

  /* ------------------------------------------------------------------- DOM */

  buildDom() {
    this.container.innerHTML = `
      <div class="cc-grid">
        <aside class="cc-col cc-left">
          <h2 class="cc-title">Who you were</h2>

          <section class="cc-block">
            <h3>Lineage</h3>
            <div class="cc-choices" id="ccCultures"></div>
            <p class="cc-lore" id="ccCultureLore"></p>
            <div class="cc-future" id="ccCultureFuture"></div>
          </section>

          <section class="cc-block">
            <h3>Calling</h3>
            <div class="cc-choices cc-choices--grid" id="ccClasses"></div>
            <p class="cc-lore" id="ccClassLore"></p>
            <dl class="cc-abilities" id="ccClassAbilities"></dl>
          </section>
        </aside>

        <div class="cc-stage">
          <canvas id="ccCanvas"></canvas>
          <div class="cc-stage-controls">
            <label>Turn<input type="range" id="ccOrbit" min="0" max="6.28" step="0.01" value="0"></label>
            <label>Zoom<input type="range" id="ccZoom" min="1.1" max="6" step="0.02" value="3.2"></label>
            <label>View<input type="range" id="ccHeight" min="0.15" max="1" step="0.01" value="0.5"></label>
            <label>Light<input type="range" id="ccLight" min="0" max="6.28" step="0.01" value="0.7"></label>
          </div>
          <p class="cc-hint">Drag the figure to turn · scroll to zoom</p>
          <p class="cc-body-status" id="ccBodyStatus" hidden></p>
        </div>

        <aside class="cc-col cc-right">
          <h2 class="cc-title">What they looked like</h2>
          <div class="cc-scroll" id="ccControls"></div>
        </aside>
      </div>

      <footer class="cc-footer">
        <input type="text" id="ccName" maxlength="24" placeholder="Name" autocomplete="off" />
        <div class="cc-actions">
          <button type="button" id="ccRandom">Randomise</button>
          <button type="button" id="ccReset">Reset</button>
          <button type="button" id="ccSave">Save preset</button>
          <select id="ccPresets"><option value="">Load preset…</option></select>
          <button type="button" id="ccGm" class="cc-gm" hidden>Game Master</button>
          <button type="button" id="ccConfirm" class="cc-primary">Enter the valley</button>
        </div>
        <p class="cc-note" id="ccNote"></p>
      </footer>`;

    this.$ = (id) => this.container.querySelector(`#${id}`);
    this.buildCultureChoices();
    this.buildClassChoices();
    this.buildControls();
    this.bindFooter();
    this.bindStage();
  }

  buildCultureChoices() {
    const wrap = this.$("ccCultures");
    wrap.innerHTML = CULTURE_IDS.map((id) => `
      <button type="button" class="cc-choice" data-culture="${id}">
        <span class="cc-choice-name">${CULTURES[id].name}</span>
        <span class="cc-choice-sub">${CULTURES[id].informedBy}</span>
      </button>`).join("");
    wrap.querySelectorAll("[data-culture]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.appearance.culture = btn.dataset.culture;
        this.rebuild();
      });
    });
  }

  buildClassChoices() {
    const wrap = this.$("ccClasses");
    wrap.innerHTML = CLASS_IDS.map((id) => `
      <button type="button" class="cc-choice cc-choice--sm" data-class="${id}">
        <span class="cc-choice-name">${CLASSES[id].name}</span>
        <span class="cc-choice-sub">${CLASSES[id].tagline}</span>
      </button>`).join("");
    wrap.querySelectorAll("[data-class]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.appearance.archetype = btn.dataset.class;
        this.rebuild();
      });
    });
  }

  /* Build a labelled slider bound to an appearance key. */
  slider(def) {
    const value = this.appearance[def.key];
    const readout = def.unit === "m" ? `${value.toFixed(2)} m` : "";
    return `
      <label class="cc-slider" data-affects="${def.affects}">
        <span class="cc-slider-name">${def.name}</span>
        <span class="cc-slider-value" data-readout="${def.key}">${readout}</span>
        <input type="range" data-key="${def.key}"
               min="${def.min}" max="${def.max}" step="${def.step}" value="${value}">
      </label>`;
  }

  swatches(key, colours) {
    return `<div class="cc-swatches" data-swatch="${key}">${
      colours.map((c, i) => `<button type="button" style="--c:${c}" data-index="${i}"
        class="${this.appearance[key] === i ? "is-on" : ""}" aria-label="Option ${i + 1}"></button>`).join("")
    }</div>`;
  }

  options(key, list) {
    return `<select data-select="${key}">${
      list.map((o) => `<option value="${o.id}" ${this.appearance[key] === o.id ? "selected" : ""}>${o.name}</option>`).join("")
    }</select>`;
  }

  buildControls() {
    const bodyLive = playerSliders(BODY_SLIDERS, this.gmRules).filter((s) => s.affects !== "deferred");
    const headLive = playerSliders(HEAD_SLIDERS, this.gmRules).filter((s) => s.affects !== "deferred");
    // Anything the builder cannot honour would land here and render disabled.
    const deferred = playerSliders([...BODY_SLIDERS, ...HEAD_SLIDERS], this.gmRules)
      .filter((s) => s.affects === "deferred");

    const shapeNote = `<p class="cc-disclosure">Every listed style is a real
      fitted MPFB hair mesh. Bald removes the hair mesh completely.</p>`;

    this.$("ccControls").innerHTML = `
      <section class="cc-block">
        <h3>Frame</h3>
        <label class="cc-row"><span>Body sex</span>${this.options("bodySex", BODY_SEXES)}</label>
        ${bodyLive.map((s) => this.slider(s)).join("")}
      </section>

      ${headLive.length ? `
      <section class="cc-block">
        <h3>Face</h3>
        ${headLive.map((s) => this.slider(s)).join("")}
      </section>` : ""}

      <section class="cc-block">
        <h3>Skin</h3>
        ${this.swatches("skinTone", SKIN_TONES)}
      </section>

      <section class="cc-block">
        <h3>Hair</h3>
        ${this.swatches("hairColour", HAIR_COLOURS)}
        ${shapeNote}
        <label class="cc-row"><span>Style</span>${this.options("hairStyle", HAIR_STYLES)}</label>
      </section>

      <section class="cc-block">
        <h3>Eyes</h3>
        ${this.swatches("eyeColour", EYE_COLOURS)}
      </section>

      <section class="cc-block">
        <h3>Clothing</h3>
        <p class="cc-disclosure">Each piece is a separate rigged equipment slot.
          Loose layers carry restrained wind and movement response.</p>
        <label class="cc-row"><span>Outfit preset</span><select data-select="outfitPreset">
          <option value="custom" ${this.appearance.outfitPreset === "custom" ? "selected" : ""}>Custom</option>
          ${OUTFIT_PRESETS.map((preset) => `<option value="${preset.id}" ${this.appearance.outfitPreset === preset.id ? "selected" : ""}>${preset.label}</option>`).join("")}
        </select></label>
        <label class="cc-row"><span>Torso</span>${this.options("torsoGarment", TORSO_GARMENTS)}</label>
        <label class="cc-row"><span>Lower body</span>${this.options("lowerGarment", LOWER_GARMENTS)}</label>
        <label class="cc-row"><span>Mantle</span>${this.options("mantle", MANTLES)}</label>
        <label class="cc-row"><span>Feet</span>${this.options("footwear", FOOTWEAR)}</label>
      </section>

      <section class="cc-block cc-block--future">
        <h3>Markings</h3>
        <p class="cc-disclosure">Saved with your character. These are painted on
          in the export, so they are not swappable here yet.</p>
        <label class="cc-row"><span>Paint / ash / ochre</span>${this.options("marking", MARKINGS)}</label>
        <label class="cc-row"><span>Scars</span>${this.options("scar", SCARS)}</label>
      </section>

      <section class="cc-block">
        <h3>Voice</h3>
        <label class="cc-row"><span>Register</span>${this.options("voice", VOICES)}</label>
      </section>

      ${deferred.length ? `
      <section class="cc-block cc-block--future">
        <h3>Stored, not yet shown</h3>
        <p class="cc-disclosure">
          These save and load with your character, and the Game Master can still
          bound them. They will not move the body until morph targets are
          exported from its .blend source.
        </p>
        ${deferred.map((s) => this.slider(s)).join("")}
      </section>` : ""}`;

    this.bindControls();
  }

  bindControls() {
    const root = this.$("ccControls");

    root.querySelectorAll("input[type=range][data-key]").forEach((input) => {
      input.addEventListener("input", () => {
        this.appearance[input.dataset.key] = parseFloat(input.value);
        const readout = root.querySelector(`[data-readout="${input.dataset.key}"]`);
        if (readout && input.dataset.key === "height") {
          readout.textContent = `${parseFloat(input.value).toFixed(2)} m`;
        }
        this.rebuildBodyOnly();
      });
    });

    root.querySelectorAll("[data-swatch]").forEach((group) => {
      const key = group.dataset.swatch;
      group.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.appearance[key] = Number(btn.dataset.index);
          group.querySelectorAll("button").forEach((b) => b.classList.remove("is-on"));
          btn.classList.add("is-on");
          this.rebuildBodyOnly();
        });
      });
    });

    root.querySelectorAll("[data-select]").forEach((sel) => {
      sel.addEventListener("change", () => {
        const key = sel.dataset.select;
        if (key === "outfitPreset") {
          this.appearance = applyOutfitPresetToAppearance(this.appearance, sel.value);
          this.buildControls();
          this.rebuildBodyOnly();
          return;
        }
        this.appearance[key] = sel.value;
        if (["torsoGarment", "lowerGarment", "mantle", "footwear"].includes(key)) {
          this.appearance.outfitPreset = "custom";
        }
        // Keep the legacy bodyBase field synchronized for the world/player
        // path and older saved presets. bodySex remains the readable setting;
        // bodyBase is the concrete GLB identity every consumer can understand.
        if (key === "bodySex") {
          this.appearance.bodyBase = {
            male: "veyr-hunter",
            female: "aurean-keeper",
            androgynous: "ember-elder",
          }[sel.value];
        }
        this.rebuildBodyOnly();
      });
    });
  }

  bindFooter() {
    this.$("ccName").addEventListener("input", (e) => {
      this.appearance.name = e.target.value;
    });

    this.$("ccRandom").addEventListener("click", () => {
      const name = this.appearance.name;
      const archetype = this.appearance.archetype;
      this.appearance = applyGmRules(randomAppearance(this.appearance.culture, CULTURES), this.gmRules);
      this.appearance.name = name;
      this.appearance.archetype = archetype;
      this.buildControls();
      this.rebuild();
    });

    this.$("ccReset").addEventListener("click", () => {
      const { culture, archetype, name } = this.appearance;
      this.appearance = appearanceFromGmDefaults({ ...defaultAppearance(), culture, archetype, name }, this.gmRules);
      this.buildControls();
      this.rebuild();
    });

    this.$("ccSave").addEventListener("click", () => {
      if (!this.appearance.name?.trim()) {
        this.note("Give them a name first.");
        return;
      }
      this.note(savePreset(this.appearance)
        ? `Saved “${this.appearance.name}”.`
        : "Could not save — storage is unavailable in this browser.");
      this.refreshPresets();
    });

    this.$("ccPresets").addEventListener("change", (e) => {
      const all = loadPresets();
      const preset = all[e.target.value];
      if (!preset) return;
      this.appearance = applyGmRules({ ...defaultAppearance(), ...preset }, this.gmRules);
      this.$("ccName").value = this.appearance.name ?? "";
      this.buildControls();
      this.rebuild();
      this.note(`Loaded “${e.target.value}”.`);
    });

    this.$("ccConfirm").addEventListener("click", () => {
      if (!this.appearance.name?.trim()) {
        this.appearance.name = this.appearance.culture === "aurean" ? "Nameless" : "Unspoken";
      }
      this.onConfirm(applyGmRules(this.appearance, this.gmRules));
    });

    const gmButton = this.$("ccGm");
    const gmRequested = new URLSearchParams(location.search).get("gm") === "1";
    gmButton.hidden = !gmRequested;
    gmButton.addEventListener("click", () => this.openGmStudio());

    this.refreshPresets();
  }

  refreshPresets() {
    const sel = this.$("ccPresets");
    const all = loadPresets();
    const keys = Object.keys(all);
    sel.innerHTML = `<option value="">${keys.length ? "Load preset…" : "No saved presets"}</option>`
      + keys.map((k) => `<option value="${k}">${k}</option>`).join("");
  }

  note(text) {
    const el = this.$("ccNote");
    el.textContent = text;
    clearTimeout(this._noteTimer);
    this._noteTimer = setTimeout(() => { el.textContent = ""; }, 3200);
  }

  openGmStudio() {
    const existing = this.container.querySelector(".gm-studio");
    existing?.remove();
    const studio = document.createElement("div");
    studio.className = "gm-studio";
    studio.innerHTML = `
      <div class="gm-panel" role="dialog" aria-modal="true" aria-labelledby="gmTitle">
        <header><div><p>Private authoring surface</p><h2 id="gmTitle">Game Master Studio</h2></div>
          <button type="button" data-gm-close aria-label="Close">×</button></header>
        <div class="gm-copy">Set the body players begin with, the safe extremes they can reach, and which controls they are allowed to touch. Changes preview immediately and stay only in this browser until exported.</div>
        <label class="gm-title-field">Ruleset name <input data-gm-title maxlength="48"></label>
        <div class="gm-rule-head"><span>Parameter</span><span>Player</span><span>Minimum</span><span>Default</span><span>Maximum</span></div>
        <div class="gm-rules"></div>
        <footer>
          <button type="button" data-gm-reset>Factory rules</button>
          <button type="button" data-gm-import>Import JSON</button>
          <button type="button" data-gm-export>Export JSON</button>
          <button type="button" data-gm-save class="cc-primary">Save rules</button>
          <input type="file" data-gm-file accept="application/json,.json" hidden>
          <span data-gm-note></span>
        </footer>
      </div>`;
    this.container.appendChild(studio);
    studio.querySelector("[data-gm-title]").value = this.gmRules.title;

    const definitions = [...BODY_SLIDERS, ...HEAD_SLIDERS];
    const rows = studio.querySelector(".gm-rules");
    rows.innerHTML = definitions.map((def) => {
      const rule = this.gmRules.controls[def.key];
      return `<label class="gm-rule" data-gm-key="${def.key}">
        <span><strong>${def.name}</strong><small>${def.key}</small></span>
        <input type="checkbox" data-field="playerEditable" ${rule.playerEditable ? "checked" : ""} aria-label="Players may edit ${def.name}">
        <input type="number" data-field="min" value="${rule.min}" step="${def.step}" aria-label="${def.name} minimum">
        <input type="number" data-field="default" value="${rule.default}" step="${def.step}" aria-label="${def.name} default">
        <input type="number" data-field="max" value="${rule.max}" step="${def.step}" aria-label="${def.name} maximum">
      </label>`;
    }).join("");

    const readRules = () => {
      const candidate = { version: 1, title: studio.querySelector("[data-gm-title]").value, controls: {} };
      rows.querySelectorAll("[data-gm-key]").forEach((row) => {
        candidate.controls[row.dataset.gmKey] = {
          playerEditable: row.querySelector('[data-field="playerEditable"]').checked,
          min: Number(row.querySelector('[data-field="min"]').value),
          default: Number(row.querySelector('[data-field="default"]').value),
          max: Number(row.querySelector('[data-field="max"]').value),
        };
      });
      return normaliseGmRules(candidate);
    };
    const preview = () => {
      this.gmRules = readRules();
      this.appearance = appearanceFromGmDefaults(this.appearance, this.gmRules);
      this.rebuildBodyOnly();
    };
    let previewTimer;
    rows.addEventListener("input", () => {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(preview, 80);
    });
    studio.querySelector("[data-gm-close]").addEventListener("click", () => {
      this.gmRules = loadGmRules();
      this.appearance = applyGmRules(this.appearance, this.gmRules);
      this.buildControls(); this.rebuild(); studio.remove();
    });
    studio.querySelector("[data-gm-save]").addEventListener("click", () => {
      this.gmRules = saveGmRules(readRules());
      this.appearance = appearanceFromGmDefaults(this.appearance, this.gmRules);
      this.buildControls(); this.rebuild();
      studio.querySelector("[data-gm-note]").textContent = "Saved locally";
    });
    studio.querySelector("[data-gm-reset]").addEventListener("click", () => {
      this.gmRules = clearGmRules(); studio.remove(); this.openGmStudio(); this.rebuildBodyOnly();
    });
    studio.querySelector("[data-gm-export]").addEventListener("click", () => {
      const rules = readRules();
      const blob = new Blob([JSON.stringify(rules, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob); link.download = "unwritten-age-gm-rules.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
    });
    const file = studio.querySelector("[data-gm-file]");
    studio.querySelector("[data-gm-import]").addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      try {
        this.gmRules = normaliseGmRules(JSON.parse(await file.files[0].text()));
        studio.remove(); this.openGmStudio(); this.rebuildBodyOnly();
      } catch { studio.querySelector("[data-gm-note]").textContent = "That JSON is not a valid ruleset"; }
    });
  }

  bindStage() {
    const canvas = this.$("ccCanvas");
    canvas.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointerup", (e) => {
      this.dragging = false;
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      this.orbit -= e.movementX * 0.008;
      this.$("ccOrbit").value = ((this.orbit % 6.28) + 6.28) % 6.28;
    });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.camDistance = THREE.MathUtils.clamp(this.camDistance + e.deltaY * 0.003, 1.1, 6);
      this.$("ccZoom").value = this.camDistance;
    }, { passive: false });

    this.$("ccOrbit").addEventListener("input", (e) => { this.orbit = parseFloat(e.target.value); });
    this.$("ccZoom").addEventListener("input", (e) => { this.camDistance = parseFloat(e.target.value); });
    this.$("ccHeight").addEventListener("input", (e) => { this.camHeight = parseFloat(e.target.value); });
    this.$("ccLight").addEventListener("input", (e) => {
      this.lightAngle = parseFloat(e.target.value);
      this.placeKeyLight();
    });
  }

  /* ----------------------------------------------------------------- scene */

  buildScene() {
    const canvas = this.$("ccCanvas");
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#4a4b50");
    this.scene.environment = buildStudioEnvironment(this.renderer);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);

    // Three-point lighting: a warm key (firelight), a cold rim (ice sky), and
    // a low fill so the underside of the jaw is not a black hole.
    this.key = new THREE.DirectionalLight("#ffe0bd", 3.0);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.near = 0.5;
    this.key.shadow.camera.far = 14;
    Object.assign(this.key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 });
    this.key.shadow.camera.updateProjectionMatrix();
    this.scene.add(this.key);

    // Soft frontal fill: without it the eye sockets read as empty holes.
    this.fill = new THREE.DirectionalLight("#fff2e2", 1.1);
    this.scene.add(this.fill);

    this.rim = new THREE.DirectionalLight("#9fc4e8", 1.5);
    this.rim.position.set(-2.4, 2.2, -3);
    this.scene.add(this.rim);

    this.scene.add(new THREE.HemisphereLight("#b9cde0", "#443a2c", 1.15));
    this.placeKeyLight();

    // A plinth of packed earth, so the figure is standing on something.
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.3, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: "#3a352c", roughness: 1 }),
    );
    plinth.position.y = -0.06;
    plinth.receiveShadow = true;
    this.scene.add(plinth);

    this.avatarHolder = new THREE.Group();
    this.scene.add(this.avatarHolder);
  }

  placeKeyLight() {
    const r = 4;
    this.key.position.set(
      Math.sin(this.lightAngle) * r,
      1.9,
      Math.cos(this.lightAngle) * r,
    );
    if (this.fill) {
      this.fill.position.set(
        Math.sin(this.lightAngle + 1.5) * 3,
        1.5,
        Math.cos(this.lightAngle + 1.5) * 3,
      );
    }
  }

  /** Full rebuild: body plus every panel that depends on culture or class. */
  rebuild() {
    this.rebuildBodyOnly();
    this.syncChoices();
  }

  /**
   * Push the current appearance into the avatar. The rigged body is created
   * once and updated in place — recreating it per slider tick would clone a
   * skinned mesh on every frame of a drag.
   */
  rebuildBodyOnly() {
    if (!this.humanoid) {
      this.humanoid = new RiggedHumanoid(this.appearance, {
        onModelChange: () => this.bodyStatus(""),
      });
      // The stand-in shown while the glTF downloads is built from primitives
      // and has no shadow flags of its own.
      this.humanoid.fallback.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.avatarHolder.add(this.humanoid.root);
      this.bodyStatus("Waking the body…");
      return;
    }
    const previousBody = this.humanoid.currentModel;
    this.humanoid.setAppearance(this.appearance);
    if (this.humanoid.currentModel !== previousBody) this.bodyStatus("Waking the body…");
  }

  /** Say plainly that the figure on the plinth is still the stand-in. */
  bodyStatus(text) {
    const el = this.$("ccBodyStatus");
    el.textContent = text;
    el.hidden = !text;
  }

  syncChoices() {
    const culture = CULTURES[this.appearance.culture];
    const archetype = CLASSES[this.appearance.archetype];

    this.container.querySelectorAll("[data-culture]").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.culture === this.appearance.culture));
    this.container.querySelectorAll("[data-class]").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.class === this.appearance.archetype));

    this.$("ccCultureLore").textContent = culture.lore;
    this.$("ccCultureFuture").innerHTML = `
      <span class="cc-future-label">What they may become</span>
      <p>${culture.mythicFuture}</p>`;

    this.$("ccClassLore").innerHTML = `${archetype.description}
      <em class="cc-readas">Among the ${culture.name.replace("The ", "")}: ${archetype.readAs[this.appearance.culture]}</em>`;

    this.$("ccClassAbilities").innerHTML = `
      <dt class="cc-ab cc-ab--passive">${archetype.passive.name}<span>passive</span></dt>
      <dd>${archetype.passive.description}</dd>
      <dt class="cc-ab">${archetype.basic.glyph} ${archetype.basic.name}<span>basic</span></dt>
      <dd>${archetype.basic.desc}</dd>
      <dt class="cc-ab cc-ab--godlike">${archetype.godlike.glyph} ${archetype.godlike.name}<span>godlike</span></dt>
      <dd>${archetype.godlike.desc}</dd>`;
  }

  /* ------------------------------------------------------------------ loop */

  resize() {
    const canvas = this.$("ccCanvas");
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    if (canvas.width !== w * devicePixelRatio || canvas.height !== h * devicePixelRatio) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  renderLoop() {
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      if (!this.container.classList.contains("show")) return;

      this.resize();
      const H = this.humanoid?.totalHeight ?? 1.74;
      // The body declares which way it is built; see RiggedHumanoid.previewFacing.
      this.avatarHolder.rotation.y = this.orbit + (this.humanoid?.previewFacing ?? Math.PI);
      this.humanoid?.poseForPreview();

      // Keep the tilt shallow: the steeper the camera looks down, the sooner the
      // feet leave the bottom of the frame.
      const focusY = H * this.camHeight;
      this.camera.position.set(0, focusY + this.camDistance * 0.10, this.camDistance);
      this.camera.lookAt(0, focusY, 0);

      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  show() {
    this.container.classList.add("show");
    this.syncChoices();
  }

  hide() {
    this.container.classList.remove("show");
  }
}
