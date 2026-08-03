// Synchronous event bus.
//
// Simulation events are ordered facts about a run — a stage separated at t=142.3,
// a leg contacted the pad at 6.2 m/s. They are recorded, replayed, and shown on
// the timeline, so delivery has to be synchronous and in emit order. Anything
// queued to a microtask would land in a different tick than the physics that
// caused it and quietly break replay alignment.

export class EventBus {
  constructor() {
    this.handlers = new Map();
    // Emitting while a handler is running is normal — a collision handler
    // triggering a destruction event — so the depth guard catches the case
    // where that recurses without bound instead of hanging the tab.
    this.depth = 0;
    this.maxDepth = 32;
  }

  on(type, handler) {
    let list = this.handlers.get(type);
    if (!list) this.handlers.set(type, (list = []));
    list.push(handler);
    // Returning the unsubscribe closure means callers never have to keep a
    // reference to the handler just to be able to detach it.
    return () => this.off(type, handler);
  }

  once(type, handler) {
    const off = this.on(type, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(type, handler) {
    const list = this.handlers.get(type);
    if (!list) return;
    const i = list.indexOf(handler);
    if (i >= 0) list.splice(i, 1);
  }

  emit(type, payload = null) {
    const list = this.handlers.get(type);
    if (!list || list.length === 0) return;
    if (this.depth >= this.maxDepth) {
      console.warn(`[tesseraxis] event "${type}" exceeded depth ${this.maxDepth}; dropped`);
      return;
    }
    this.depth++;
    // Iterating a copy so a handler that unsubscribes itself — or subscribes
    // a new one — does not shift the list out from under this loop.
    const snapshot = list.slice();
    for (const handler of snapshot) {
      try {
        handler(payload);
      } catch (error) {
        // One broken listener must not stop the tick. The console panel picks
        // this up and shows it against the current sim time.
        console.error(`[tesseraxis] handler for "${type}" threw`, error);
      }
    }
    this.depth--;
  }

  clear() {
    this.handlers.clear();
  }
}

export default EventBus;
