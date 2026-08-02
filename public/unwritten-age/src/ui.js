import { ABILITIES, ASPECTS, ASPECT_KEYS, xpForLevel } from "./data.js";
import {
  PRACTICES, PRACTICE_IDS, PRACTICE_GROUPS, xpForPracticeLevel, totalLevel,
} from "./systems/practices.js";
import { FACTIONS, FACTION_IDS, rankFor } from "./world/factions.js";
import { ANCIENT_SITES } from "./world/sites.js";
import { SLOTS } from "./systems/equipment.js";

/**
 * The interface.
 *
 * Every label is rendered through `chronicle.rewrite()`, so the UI physically
 * cannot display the name of an erased god — not because we censor it at the
 * point of drawing, but because by then the string no longer contains it.
 */

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(state, chronicle) {
    this.state = state;
    this.chronicle = chronicle;
    this.hotbarEls = [];
    this.buildHotbar();
    this.buildAspects();
    this.buildPractices();
    this.renderCodex();
    this.renderEquipment();
  }

  renderCodex() {
    const body = $("codexBody");
    if (!body) return;
    body.innerHTML = ANCIENT_SITES.map((site) => {
      const found = this.state.discoveredSites?.has(site.id);
      if (!found) return `<article class="codex-entry is-unknown"><h3>Undiscovered place</h3><p>Follow unfamiliar silhouettes and rings in the landscape.</p></article>`;
      return `<article class="codex-entry">
        <header><div><h3>${site.name}</h3><p>${site.inspiration}</p></div><time>${site.dates}</time></header>
        <p>${site.codex}</p>
        <dl><div><dt>Evidence</dt><dd>${site.features.join(" · ")}</dd></div>
        <div><dt>Materials</dt><dd>${site.materials.join(" · ")}</dd></div>
        <div><dt>Remembered myth</dt><dd>${site.myth}</dd></div></dl>
        <p class="accuracy-note"><b>Accuracy note:</b> ${site.confidence}</p>
      </article>`;
    }).join("");
  }

  renderEquipment() {
    const equipped = $("equipmentBody");
    const inventory = $("inventoryBody");
    if (!equipped || !inventory) return;
    equipped.innerHTML = `<h3>Worn</h3><div class="equipment-grid">${SLOTS.map((slot) => {
      const item = this.state.inventory?.find((candidate) => candidate.uid === this.state.equipment?.[slot]);
      return `<div><span>${slot}</span><b>${item?.name ?? "Empty"}</b>${item ? `<em>Power ${item.power}</em>` : ""}</div>`;
    }).join("")}</div>`;
    inventory.innerHTML = `<h3>Recovered</h3>${this.state.inventory?.length ? this.state.inventory.map((item) => `
      <article class="inventory-item"><div><b>${item.name}</b><span>${item.material} · ${item.provenance}</span></div>
      <strong>${item.slot} · ${item.power}</strong><button type="button" data-equip="${item.uid}">Equip</button></article>`).join("")
      : `<p class="inventory-empty">Discover an ancient site to recover equipment.</p>`}`;
  }

  buildHotbar() {
    const bar = $("hotbar");
    bar.innerHTML = "";
    this.hotbarEls = [];
    for (let i = 0; i < 5; i += 1) {
      const slot = document.createElement("button");
      slot.className = "slot";
      slot.type = "button";
      slot.dataset.slot = String(i);
      slot.innerHTML = `
        <span class="key">${i + 1}</span>
        <span class="glyph"></span>
        <span class="cd"></span>
        <span class="slot-name"></span>`;
      bar.appendChild(slot);
      this.hotbarEls.push(slot);
    }
  }

  buildAspects() {
    const wrap = $("aspects");
    wrap.innerHTML = "";
    this.aspectEls = {};
    ASPECT_KEYS.forEach((key) => {
      const aspect = ASPECTS[key];
      const row = document.createElement("div");
      row.className = "aspect";
      row.innerHTML = `
        <span class="aspect-name" style="color:${aspect.colour}">${aspect.name}</span>
        <span class="aspect-lvl">1</span>
        <span class="aspect-bar"><i style="background:${aspect.colour}"></i></span>`;
      wrap.appendChild(row);
      this.aspectEls[key] = {
        lvl: row.querySelector(".aspect-lvl"),
        bar: row.querySelector(".aspect-bar i"),
      };
    });
  }

  /** One row per practice, grouped, plus faction standing beneath. */
  buildPractices() {
    const list = $("practiceList");
    if (!list) return;
    this.practiceEls = {};
    list.innerHTML = PRACTICE_GROUPS.map((group) => {
      const rows = PRACTICE_IDS.filter((id) => PRACTICES[id].group === group).map((id) => `
        <div class="pr-row" title="${PRACTICES[id].blurb}">
          <span class="pr-name">${PRACTICES[id].name}</span>
          <span class="pr-lvl" data-pr-lvl="${id}">1</span>
          <span class="pr-bar"><i data-pr-bar="${id}"></i></span>
        </div>`).join("");
      return `<div class="pr-group">${group}</div>${rows}`;
    }).join("");

    PRACTICE_IDS.forEach((id) => {
      this.practiceEls[id] = {
        lvl: list.querySelector(`[data-pr-lvl="${id}"]`),
        bar: list.querySelector(`[data-pr-bar="${id}"]`),
      };
    });

    const standing = $("standingList");
    if (standing) {
      standing.innerHTML = `<div class="pr-group">Standing</div>` + FACTION_IDS.map((id) => `
        <div class="st-row ${FACTIONS[id].hostile ? "is-hostile" : ""}" title="${FACTIONS[id].wants}">
          <span class="st-name">${FACTIONS[id].name}</span>
          <span class="st-rank" data-st="${id}">Unknown</span>
        </div>`).join("");
    }
  }

  updatePractices() {
    if (!this.practiceEls) return;
    const s = this.state;
    PRACTICE_IDS.forEach((id) => {
      const rec = s.practices?.[id];
      const el = this.practiceEls[id];
      if (!rec || !el) return;
      el.lvl.textContent = String(rec.level);
      const prev = xpForPracticeLevel(rec.level);
      const next = xpForPracticeLevel(rec.level + 1);
      const pct = next > prev ? ((rec.xp - prev) / (next - prev)) * 100 : 100;
      el.bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    });
    const total = $("practiceTotal");
    if (total && s.practices) total.textContent = String(totalLevel(s.practices));

    FACTION_IDS.forEach((id) => {
      const el = document.querySelector(`[data-st="${id}"]`);
      if (el && s.standing) el.textContent = rankFor(s.standing[id] ?? 0);
    });
  }

  update() {
    const s = this.state;
    this.updatePractices();

    // Vitals.
    $("hpFill").style.width = `${(s.player.hp / s.player.maxHp) * 100}%`;
    $("hpText").textContent = `${Math.ceil(s.player.hp)} / ${s.player.maxHp}`;
    const shieldPct = Math.min(100, (s.player.shield / s.player.maxHp) * 100);
    $("shieldFill").style.width = `${shieldPct}%`;

    $("remValue").textContent = Math.floor(s.remembrance);
    $("remRate").textContent = `+${s.remembranceRate.toFixed(1)}/s`;

    // Aspects.
    ASPECT_KEYS.forEach((key) => {
      const el = this.aspectEls[key];
      const lvl = s.aspects[key].level;
      const xp = s.aspects[key].xp;
      const prev = lvl > 1 ? xpForLevel(lvl - 1) : 0;
      const next = xpForLevel(lvl);
      el.lvl.textContent = String(lvl);
      el.bar.style.width = `${Math.max(0, Math.min(100, ((xp - prev) / (next - prev)) * 100))}%`;
    });

    // Hotbar. A null slot is a hole, not a missing element — the frame stays.
    this.hotbarEls.forEach((el, i) => {
      const id = s.hotbar[i];
      const ability = id ? ABILITIES[id] : null;
      const glyph = el.querySelector(".glyph");
      const name = el.querySelector(".slot-name");
      const cd = el.querySelector(".cd");

      if (!ability) {
        el.classList.add("empty");
        el.classList.remove("ready", "cooling");
        glyph.textContent = "";
        name.textContent = "";
        cd.style.height = "0%";
        el.title = "";
        return;
      }

      el.classList.remove("empty");
      glyph.textContent = ability.glyph;
      glyph.style.color = ability.colour;
      name.textContent = this.chronicle.rewrite(ability.name);
      el.title = this.chronicle.rewrite(`${ability.name} — ${ability.desc}`);

      const remaining = s.cooldowns[ability.id] ?? 0;
      const affordable = s.remembrance >= ability.cost;
      cd.style.height = `${(remaining / ability.cooldown) * 100}%`;
      el.classList.toggle("cooling", remaining > 0);
      el.classList.toggle("ready", remaining <= 0 && affordable);
      el.classList.toggle("poor", !affordable && remaining <= 0);
    });

    // Quest log.
    const log = $("questList");
    const quests = s.quests;
    if (!quests.length) {
      log.innerHTML = `<li class="quest-empty">No burdens. For now.</li>`;
    } else {
      log.innerHTML = quests
        .map((q) => {
          const steps = q.steps
            .map((step, i) => {
              const done = i < q.step;
              const current = i === q.step;
              return `<li class="${done ? "done" : ""}${current ? " current" : ""}">
                ${this.chronicle.rewrite(step)}${current && q.counter ? ` <b>${q.counter}</b>` : ""}
              </li>`;
            })
            .join("");
          return `<li class="quest" data-quest="${q.id}">
            <h4>${this.chronicle.rewrite(q.title)}</h4><ul>${steps}</ul></li>`;
        })
        .join("");
    }
  }

  /** Rolling combat/narrative feed. */
  log(text, kind = "") {
    const feed = $("feed");
    const line = document.createElement("div");
    line.className = `feed-line ${kind}`;
    line.textContent = this.chronicle.rewrite(text);
    feed.appendChild(line);
    while (feed.children.length > 9) feed.removeChild(feed.firstChild);
    requestAnimationFrame(() => line.classList.add("in"));
  }

  /** Floating combat number at a screen position. */
  float(text, x, y, kind = "") {
    const el = document.createElement("div");
    el.className = `floater ${kind}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    $("floaters").appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  banner(lines, { duration = 4200, className = "" } = {}) {
    return new Promise((resolve) => {
      const el = $("banner");
      el.className = `banner ${className}`;
      el.innerHTML = lines
        .map((l, i) => `<p style="animation-delay:${i * 0.75}s">${this.chronicle.rewrite(l)}</p>`)
        .join("");
      el.classList.add("show");
      setTimeout(() => {
        el.classList.remove("show");
        setTimeout(resolve, 700);
      }, duration);
    });
  }

  setTarget(entity) {
    const el = $("target");
    if (!entity || entity.dead) {
      el.classList.remove("show");
      return;
    }
    const name = entity.god ? `${entity.god.name}, ${entity.god.epithet}` : entity.type.name;
    el.classList.add("show");
    el.querySelector(".target-name").textContent = this.chronicle.rewrite(name);
    const pct = (entity.hp / entity.maxHp) * 100;
    el.querySelector(".target-fill").style.width = `${pct}%`;
    el.querySelector(".target-hp").textContent = `${Math.ceil(entity.hp)} / ${entity.maxHp}`;
    el.classList.toggle("boss", Boolean(entity.god));
  }
}
