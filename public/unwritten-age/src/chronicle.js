import { ABILITIES, GODS } from "./data.js";

/**
 * THE CHRONICLE — the erasure system.
 *
 * This is the mechanic the whole game exists for, so it is implemented as a
 * real state rewrite rather than as a cutscene. When a god is erased:
 *
 *   - their ability is deleted from the player's hotbar, mid-combat, and the
 *     slot does not shift up: there is simply a gap where something used to be
 *   - their quest is removed from the log
 *   - their name is scrubbed from every string the UI will ever render, and
 *     the strings are rewritten in place, so no interface element can quote it
 *   - their building becomes the ruin it "always was"
 *   - the NPC line changes to one that is sincere, not evasive
 *   - Remembrance income drops, because a source of stories is gone
 *
 * The player's own memory is the only copy left. We keep that copy in
 * `witnessed`, and it is deliberately NOT used to render anything except the
 * player's private journal — which is the point of the Last Witness scene.
 */

export class Chronicle {
  constructor(state) {
    this.state = state;
    this.erased = new Set();
    /** What only the player remembers. Never used to render the live world. */
    this.witnessed = [];
    this.listeners = new Set();
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event, payload) {
    this.listeners.forEach((fn) => fn(event, payload));
  }

  isErased(id) {
    return this.erased.has(id);
  }

  /**
   * Rewrite a string as the world would now have it.
   * Anything naming an erased god is not censored — censorship implies
   * something was there. It is replaced by the version that was always true.
   */
  rewrite(text) {
    if (!text) return text;
    let out = text;
    this.erased.forEach((godId) => {
      const god = GODS[godId];
      if (!god) return;
      out = out
        .replaceAll(`${god.temple}`, god.ruin)
        .replaceAll(`${god.name}'s`, "the old")
        .replaceAll(`${god.name}`, "someone")
        .replaceAll(`${god.epithet}`, "");
    });
    return out.replace(/\s{2,}/g, " ").trim();
  }

  /**
   * Erase a god from history. Returns a description of everything that
   * changed, so the UI can animate each removal individually rather than
   * just re-rendering and hoping the player notices.
   */
  eraseGod(godId) {
    const god = GODS[godId];
    if (!god || this.erased.has(godId)) return null;

    const changes = {
      god,
      abilities: [],
      quests: [],
      remembranceLost: god.remembranceIncome,
    };

    // 1. Abilities that only existed because this god was remembered.
    Object.values(ABILITIES).forEach((ability) => {
      if (ability.source !== godId) return;
      const slot = this.state.hotbar.indexOf(ability.id);
      if (slot !== -1) {
        // Leave a hole. Do not compact the bar — the gap IS the story.
        this.state.hotbar[slot] = null;
        changes.abilities.push({ ability, slot });
      }
      this.state.known.delete(ability.id);
    });

    // 2. Quests that were about this god.
    this.state.quests = this.state.quests.filter((quest) => {
      if (quest.god !== godId) return true;
      changes.quests.push(quest);
      return false;
    });

    // 3. Passive income from their worship.
    this.state.remembranceRate = Math.max(
      0,
      this.state.remembranceRate - god.remembranceIncome,
    );

    // 4. The player alone keeps the original.
    this.witnessed.push({
      name: god.name,
      epithet: god.epithet,
      temple: god.temple,
      abilities: changes.abilities.map((a) => a.ability.name),
      note: "You remember this. Nothing else does.",
    });

    this.erased.add(godId);
    this.emit("erased", changes);
    return changes;
  }
}
