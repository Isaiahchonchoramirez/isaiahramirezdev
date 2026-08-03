// The entity-component world.
//
// Components are struct-of-arrays: one typed array per field, indexed by entity
// id. The obvious alternative — an object per entity — is far friendlier to
// read, and it is what most browser ECS libraries do, but it puts each agent's
// fields on a separate heap allocation. A boids pass over 50,000 of those
// spends most of its time waiting on cache misses. Here, reading every agent's
// x coordinate is a linear walk through one contiguous Float64Array.
//
// The layout also makes save states nearly free: a component's entire history
// is a handful of typed arrays that can be sliced, copied, or handed to a
// worker without touching the garbage collector.

const TYPES = {
  f64: Float64Array,
  f32: Float32Array,
  i32: Int32Array,
  u32: Uint32Array,
  u8: Uint8Array,
  i8: Int8Array,
};

let nextComponentBit = 0;

export class Component {
  constructor(name, schema, capacity) {
    this.name = name;
    this.schema = schema;
    this.fields = Object.keys(schema);
    this.capacity = capacity;

    // Each component gets one bit in the entity's signature word. 32 is the
    // ceiling per world; a simulation needing more should compose plugins
    // rather than grow one flat namespace.
    if (nextComponentBit >= 32) {
      throw new Error('Tesseraxis supports at most 32 component types per build');
    }
    this.bit = 1 << nextComponentBit++;

    for (const field of this.fields) {
      const Type = TYPES[schema[field]];
      if (!Type) {
        throw new Error(`Unknown field type "${schema[field]}" on ${name}.${field}`);
      }
      this[field] = new Type(capacity);
    }
  }

  // Copies one entity's fields onto another — the basis of spawning from a
  // template and of the recorder's snapshot restore.
  copyRow(from, to) {
    for (const field of this.fields) this[field][to] = this[field][from];
  }

  zeroRow(index) {
    for (const field of this.fields) this[field][index] = 0;
  }
}

// Components whose payload is not numeric — a mesh handle, a controller
// instance, a config blob. Kept out of the typed-array path on purpose: they
// are per-object, they are rare, and pretending otherwise would mean
// serialising things that cannot be serialised.
export class ObjectComponent {
  constructor(name) {
    this.name = name;
    this.isObject = true;
    if (nextComponentBit >= 32) {
      throw new Error('Tesseraxis supports at most 32 component types per build');
    }
    this.bit = 1 << nextComponentBit++;
    this.data = new Map();
  }

  get(entity) {
    return this.data.get(entity);
  }

  set(entity, value) {
    this.data.set(entity, value);
    return value;
  }

  zeroRow(entity) {
    this.data.delete(entity);
  }

  copyRow(from, to) {
    const value = this.data.get(from);
    if (value !== undefined) this.data.set(to, value);
  }
}

export class World {
  constructor({ capacity = 4096 } = {}) {
    this.capacity = capacity;
    this.components = new Map();

    // signature[e] is the OR of the bits of every component e currently has.
    this.signature = new Uint32Array(capacity);
    this.alive = new Uint8Array(capacity);
    this.names = new Array(capacity).fill(null);

    // `count` is the high-water mark, not the population. Queries scan
    // [0, count) and skip dead slots, which keeps iteration a flat array walk
    // instead of a pointer chase through a live list.
    this.count = 0;
    this.free = [];
    this.population = 0;
  }

  defineComponent(name, schema) {
    if (this.components.has(name)) return this.components.get(name);
    const component = new Component(name, schema, this.capacity);
    this.components.set(name, component);
    return component;
  }

  defineObjectComponent(name) {
    if (this.components.has(name)) return this.components.get(name);
    const component = new ObjectComponent(name);
    this.components.set(name, component);
    return component;
  }

  createEntity(name = null) {
    let entity;
    if (this.free.length > 0) {
      entity = this.free.pop();
    } else {
      if (this.count >= this.capacity) {
        throw new Error(
          `World capacity of ${this.capacity} entities exhausted — raise it when creating the World`,
        );
      }
      entity = this.count++;
    }
    this.alive[entity] = 1;
    this.signature[entity] = 0;
    this.names[entity] = name;
    this.population++;
    return entity;
  }

  destroyEntity(entity) {
    if (!this.alive[entity]) return;
    // Object components hold real references; leaving them behind would keep
    // meshes and controllers alive for the lifetime of the world.
    for (const component of this.components.values()) {
      if (component.isObject && this.signature[entity] & component.bit) {
        component.zeroRow(entity);
      }
    }
    this.alive[entity] = 0;
    this.signature[entity] = 0;
    this.names[entity] = null;
    this.free.push(entity);
    this.population--;
  }

  add(entity, component, values = null) {
    this.signature[entity] |= component.bit;
    if (values !== null) {
      if (component.isObject) {
        component.set(entity, values);
      } else {
        for (const field in values) {
          if (component[field]) component[field][entity] = values[field];
        }
      }
    }
    return entity;
  }

  remove(entity, component) {
    this.signature[entity] &= ~component.bit;
    component.zeroRow(entity);
    return entity;
  }

  has(entity, component) {
    return (this.signature[entity] & component.bit) !== 0;
  }

  // Builds the bitmask a query tests against.
  mask(components) {
    let m = 0;
    for (const c of components) m |= c.bit;
    return m;
  }

  // Calls fn(entity) for every live entity carrying all of `components`.
  //
  // The mask is computed once outside the loop and the whole thing is a linear
  // scan of two typed arrays — no closure allocation per entity, no iterator
  // protocol overhead, which matters when this runs 120 times a second over
  // tens of thousands of rows.
  each(components, fn) {
    const m = this.mask(components);
    const { signature, alive, count } = this;
    for (let e = 0; e < count; e++) {
      if (alive[e] && (signature[e] & m) === m) fn(e);
    }
  }

  // Materialises matching entity ids into an array. Use when the caller needs
  // to iterate more than once, or to sort, or to mutate the world while
  // walking the results — destroying entities inside `each` is not safe.
  collect(components, out = []) {
    out.length = 0;
    const m = this.mask(components);
    const { signature, alive, count } = this;
    for (let e = 0; e < count; e++) {
      if (alive[e] && (signature[e] & m) === m) out.push(e);
    }
    return out;
  }

  countOf(components) {
    let n = 0;
    const m = this.mask(components);
    const { signature, alive, count } = this;
    for (let e = 0; e < count; e++) {
      if (alive[e] && (signature[e] & m) === m) n++;
    }
    return n;
  }

  // ---------------------------------------------------------------------
  // Save states
  // ---------------------------------------------------------------------

  // A snapshot is a deep copy of every numeric component plus the entity
  // bookkeeping. Object components are referenced, not copied: a restored
  // state points at the same mesh it did before, which is what you want — the
  // renderer's objects are presentation, not simulation state.
  snapshot() {
    const components = {};
    for (const [name, component] of this.components) {
      if (component.isObject) continue;
      const fields = {};
      for (const field of component.fields) {
        fields[field] = component[field].slice(0, this.count);
      }
      components[name] = fields;
    }
    return {
      count: this.count,
      population: this.population,
      free: this.free.slice(),
      signature: this.signature.slice(0, this.count),
      alive: this.alive.slice(0, this.count),
      names: this.names.slice(0, this.count),
      components,
    };
  }

  restore(snapshot) {
    this.count = snapshot.count;
    this.population = snapshot.population;
    this.free = snapshot.free.slice();
    this.signature.set(snapshot.signature);
    this.alive.set(snapshot.alive);
    for (let i = 0; i < snapshot.count; i++) this.names[i] = snapshot.names[i];
    // Slots past the snapshot's high-water mark belonged to entities created
    // after it was taken; they have to read as dead, not as stale rows.
    this.alive.fill(0, snapshot.count);
    this.signature.fill(0, snapshot.count);

    for (const [name, fields] of Object.entries(snapshot.components)) {
      const component = this.components.get(name);
      if (!component) continue;
      for (const field of Object.keys(fields)) {
        if (component[field]) component[field].set(fields[field]);
      }
    }
    return this;
  }

  clear() {
    this.alive.fill(0);
    this.signature.fill(0);
    this.names.fill(null);
    for (const component of this.components.values()) {
      if (component.isObject) component.data.clear();
    }
    this.count = 0;
    this.population = 0;
    this.free.length = 0;
  }
}

// Component bits are handed out from a module-level counter, so a world torn
// down and rebuilt would otherwise exhaust the 32 available bits. Plugins call
// this when they dispose.
export function resetComponentRegistry() {
  nextComponentBit = 0;
}

export default World;
