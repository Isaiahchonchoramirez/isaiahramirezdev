import * as THREE from "three";

/**
 * THE MATERIAL LIBRARY.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * Every material in this project used to be built by one local helper that set
 * `metalness: 0, roughness: 0.85` and varied only the colour. That is why the
 * character read as a single solid shape: bone, hide, wood, stone and skin all
 * returned exactly the same light, so the eye had nothing but silhouette to
 * separate them by. Two things next to each other only read as *different
 * substances* if they disagree about how they reflect.
 *
 * So substance is now the primary key, and colour is a parameter of it. Ask for
 * `bone(colour)`, not `mat(colour, 0.85)`.
 *
 * ── The numbers are not decorative ──────────────────────────────────────────
 * Roughness is the whole game here. A rough surface (1.0) scatters light evenly
 * and reads as chalky and dead — correct for ash, lichen, dry bone, worn hide.
 * A smooth one (0.15) throws a tight highlight and reads as wet or vitreous —
 * correct for eyes, fresh obsidian, polished shell. Everything interesting is
 * the contrast between two of those sitting next to each other, which is why
 * these values are spread wide rather than clustered around a safe middle.
 *
 * Metalness is nearly always 0. In a PBR renderer metalness is not "shininess",
 * it is a statement that the surface is a conductor, and getting it wrong makes
 * things look like painted tin. Only native metal and the deliberately
 * supernatural sky-iron are non-zero, which is also the historically honest
 * answer for 30,000–12,000 BCE: no smelting, so no metal except meteoric iron
 * and the odd nugget of native copper.
 *
 * ── Specular requires an environment ────────────────────────────────────────
 * None of this is visible without a scene environment map. A dielectric surface
 * (metalness 0) has no specular response to punctual lights alone in this
 * renderer's setup — it needs something to reflect. `src/render/environment.js`
 * supplies that. If a scene looks flat after this change, the env map is
 * missing, not the material.
 */

/* ------------------------------------------------------------------ helpers */

const C = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));

/**
 * Nudge a colour without leaving its family.
 * `dv` shifts value, `ds` saturation, `dh` hue (in turns, so 0.02 is subtle).
 * Used everywhere below to derive a related tone rather than hand-picking a
 * second hex that then drifts out of sync when the first one is edited.
 */
export function shift(colour, { dv = 0, ds = 0, dh = 0 } = {}) {
  const c = C(colour);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return new THREE.Color().setHSL(
    (hsl.h + dh + 1) % 1,
    THREE.MathUtils.clamp(hsl.s + ds, 0, 1),
    THREE.MathUtils.clamp(hsl.l + dv, 0, 1),
  );
}

function standard(colour, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: C(colour), metalness: 0, ...opts });
}

/**
 * `MeshPhysicalMaterial` costs more than `MeshStandardMaterial` and is only
 * worth it where a second specular lobe genuinely changes the read: cloth
 * sheen, the clearcoat on a wet eye, the waxy layer over skin.
 */
function physical(colour, opts = {}) {
  return new THREE.MeshPhysicalMaterial({ color: C(colour), metalness: 0, ...opts });
}

/* --------------------------------------------------------------------- skin */

/**
 * Skin is not one colour, and the single most common way to make a figure look
 * like a plastic mannequin is to paint it as if it were.
 *
 * Real skin varies by region for physical reasons: the parts with the thinnest
 * covering over the most capillaries run warmer and redder (cheeks, nose, ears,
 * knuckles, elbows, knees), and the parts in permanent self-shadow under thicker
 * tissue run cooler and darker (under the jaw, the eye socket, the inside of the
 * upper arm). So this returns a *set* of related materials derived from one
 * tone, and the builder assigns them by body part.
 *
 * `age` drives two things at once, because they move together on a real face:
 * roughness climbs (skin stops being taut and starts scattering light) and
 * saturation falls slightly.
 *
 * Deliberately NOT included: a specular sheen high enough to read as sweat.
 * Shiny skin is the second most common way to make a figure look like plastic.
 */
export function skinSet(baseColour, age = 0.35, weathering = 0.3) {
  const base = C(baseColour);
  const rough = THREE.MathUtils.lerp(0.62, 0.86, age * 0.7 + weathering * 0.3);

  const make = (colour, roughDelta = 0) =>
    physical(colour, {
      roughness: THREE.MathUtils.clamp(rough + roughDelta, 0.3, 1),
      // A thin waxy layer. Kept very low: this is the difference between skin
      // and wax, and 0.2 is already the top of the believable range.
      clearcoat: 0.14,
      clearcoatRoughness: 0.62,
      // Light bleeding through thin tissue. Subtle, but it is what stops the
      // ears and the nose from reading as painted-on cardboard.
      sheen: 0.28,
      sheenRoughness: 0.85,
      sheenColor: shift(colour, { dv: 0.06, ds: 0.22, dh: -0.01 }),
    });

  return {
    /** Torso, limbs — the default. */
    base: make(base),
    /** Cheeks, nose, ears, knuckles, elbows, knees: more blood, less cover. */
    warm: make(shift(base, { dv: 0.028, ds: 0.1, dh: -0.012 }), -0.02),
    /** Under the jaw, inside the socket, the shaded planes. */
    shade: make(shift(base, { dv: -0.055, ds: 0.02, dh: 0.008 }), 0.04),
    /** Palms and soles — paler and less saturated on every human being. */
    palm: make(shift(base, { dv: 0.05, ds: -0.08, dh: 0.004 }), 0.03),
    /** Lips: darker, more saturated, and notably smoother than facial skin. */
    lip: physical(shift(base, { dv: -0.1, ds: 0.16, dh: -0.02 }), {
      roughness: 0.44,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
    }),
    /** Old scar tissue: paler, shinier, no sheen — it has no working dermis. */
    scar: physical(shift(base, { dv: 0.08, ds: -0.14 }), {
      roughness: 0.38,
      clearcoat: 0.22,
    }),
    /** The mouth interior. Nearly black; it only exists to give depth. */
    maw: standard("#2b1a17", { roughness: 0.9 }),
    /** Teeth, on the rare occasion they show. */
    tooth: physical("#e8e2d2", { roughness: 0.32, clearcoat: 0.4 }),
  };
}

/* --------------------------------------------------------------------- hair */

/**
 * Hair reads as hair because of anisotropic highlight — a band of light running
 * *across* the strand direction. Three.js gives us `sheen` rather than true
 * anisotropy on this material, which is close enough at this fidelity: a broad
 * soft secondary highlight in a lighter tone than the base.
 *
 * The important part is that hair must NOT share roughness with skin. When both
 * sit at 0.8 the hairline vanishes and the head reads as one moulded lump,
 * which was exactly the previous behaviour.
 */
export function hair(colour, { coarse = 0 } = {}) {
  return physical(colour, {
    roughness: THREE.MathUtils.lerp(0.34, 0.62, coarse),
    sheen: 0.85,
    sheenRoughness: THREE.MathUtils.lerp(0.28, 0.55, coarse),
    // The highlight runs paler and slightly warmer than the hair itself, which
    // is true of every hair colour including black.
    sheenColor: shift(colour, { dv: 0.24, ds: -0.05, dh: 0.01 }),
  });
}

/** Brows and beard: the same substance, shorter and denser, so rougher. */
export function facialHair(colour) {
  return hair(colour, { coarse: 0.75 });
}

/* --------------------------------------------------------------------- eyes */

/**
 * The eye is three materials and all three matter.
 *
 * The sclera is NOT white. A white sclera against any skin tone reads as a
 * cartoon; the real thing is a warm off-grey that sits a little darker than the
 * lightest skin. It also needs to be smooth, because the eye is the wettest
 * thing on a face and that highlight is most of what makes a face look alive.
 */
export const eyeMaterials = {
  sclera: () =>
    physical("#cfc9bf", {
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    }),

  /** The coloured ring. Slightly emissive so it holds colour in shadow. */
  iris: (colour) =>
    physical(colour, {
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: C(colour),
      emissiveIntensity: 0.12,
    }),

  /** The pupil is a hole, not a dark disc. Pure black, fully matte. */
  pupil: () => standard("#07060a", { roughness: 1 }),

  /**
   * The catchlight, as actual geometry rather than a reflection we hope for.
   *
   * This is the one place I am deliberately faking a lighting result. A real
   * catchlight is the key light reflected in the cornea, and it should fall out
   * of the env map — but it is small, it lands on a curved surface a few
   * millimetres across, and at character-creation distance it is a coin flip
   * whether it survives. A face without it looks embalmed, so it is placed
   * explicitly and made unlit so it cannot be shadowed away.
   */
  catchlight: () =>
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.92 }),
};

/* ------------------------------------------------------------------- fabric */

/**
 * Woven or twisted plant fibre — nettle, flax, bast, sinew cord.
 * Matte, and it needs sheen: cloth catches a soft rim of light at grazing
 * angles, and without that it is indistinguishable from painted stone.
 */
export function cloth(colour, { worn = 0.4 } = {}) {
  return physical(colour, {
    roughness: THREE.MathUtils.lerp(0.82, 0.98, worn),
    sheen: 0.55,
    sheenRoughness: 0.75,
    sheenColor: shift(colour, { dv: 0.16, ds: -0.1 }),
  });
}

/**
 * Tanned hide. Distinct from cloth by being smoother and slightly waxy — a
 * worked skin has a grain that cloth does not, and it takes a low broad
 * highlight along the folds.
 */
export function hide(colour, { supple = 0.5 } = {}) {
  return physical(colour, {
    roughness: THREE.MathUtils.lerp(0.72, 0.9, 1 - supple),
    clearcoat: 0.18,
    clearcoatRoughness: 0.7,
  });
}

/** Rawhide: untanned, stiff, chalkier and lighter than tanned hide. */
export function rawhide(colour) {
  return standard(shift(colour, { dv: 0.1, ds: -0.12 }), { roughness: 0.95 });
}

/**
 * Fur. Heavy sheen and high roughness: the body of the pelt swallows light
 * while the tips catch it, which is the read we want. Sheen colour is pushed
 * well lighter than the base for exactly that reason.
 */
export function fur(colour, { depth = 0.6 } = {}) {
  return physical(colour, {
    roughness: 0.95,
    sheen: 1,
    sheenRoughness: THREE.MathUtils.lerp(0.4, 0.7, depth),
    sheenColor: shift(colour, { dv: 0.26, ds: -0.06 }),
  });
}

/* ---------------------------------------------------- bone, antler, ivory */

/**
 * Bone, antler and ivory are three different materials and prehistoric people
 * absolutely treated them as such — they have different working properties and
 * different prestige. Rendering them identically throws away one of the few
 * material distinctions the period actually offers.
 */
export function bone(colour = "#ded4bd") {
  return physical(colour, { roughness: 0.55, clearcoat: 0.18, clearcoatRoughness: 0.5 });
}

/** Antler: denser, warmer, and polished at the tines by use. */
export function antler(colour = "#b09a76") {
  return physical(colour, { roughness: 0.44, clearcoat: 0.26, clearcoatRoughness: 0.36 });
}

/**
 * Mammoth ivory. The prestige material of Upper Palaeolithic Europe, and it
 * earns its own entry: it takes a genuine polish and has faint translucency,
 * so it gets a real clearcoat and a touch of transmission-like sheen.
 */
export function ivory(colour = "#eee3cb") {
  return physical(colour, {
    roughness: 0.24,
    clearcoat: 0.6,
    clearcoatRoughness: 0.16,
    sheen: 0.3,
    sheenRoughness: 0.4,
    sheenColor: C("#fff6e2"),
  });
}

/* ------------------------------------------------------------ stone, wood */

/** Unworked rock, granite erratics, limestone. Dead matte. */
export function stone(colour = "#6b6862", { lichen = 0 } = {}) {
  return standard(lichen > 0 ? shift(colour, { dv: 0.02, ds: 0.1, dh: 0.18 }) : colour, {
    roughness: THREE.MathUtils.lerp(0.92, 1, lichen),
    flatShading: true,
  });
}

/**
 * Struck flint. The reason this is not just `stone`: a fresh conchoidal
 * fracture is markedly glossier than a weathered cortex, which is precisely
 * what makes a knapped edge visible. Roughness 0.35 is doing real work.
 */
export function flint(colour = "#3f4348") {
  return physical(colour, { roughness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.22 });
}

/**
 * Obsidian: volcanic glass. Near-mirror, very dark, and the single shiniest
 * thing available in this period. It should read as *startling* next to bone.
 */
export function obsidian(colour = "#17151c") {
  return physical(colour, {
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    // Glass is a dielectric, so still metalness 0 — the gloss is all clearcoat.
    sheen: 0.2,
    sheenColor: C("#6a5f88"),
  });
}

/** Greenstone / nephrite: worked to a soft waxy polish, never mirror-bright. */
export function greenstone(colour = "#4e6b52") {
  return physical(colour, { roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.3 });
}

/** Shell and mother-of-pearl. Iridescent, so a coloured sheen off the hue. */
export function shell(colour = "#e3d9c8") {
  return physical(colour, {
    roughness: 0.18,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    iridescence: 0.6,
    iridescenceIOR: 1.35,
    sheen: 0.5,
    sheenColor: C("#cfe0e8"),
  });
}

/** Timber, hafts, poles. Rough, but with a little polish where hands go. */
export function wood(colour = "#4a3a28", { handled = 0 } = {}) {
  return physical(colour, {
    roughness: THREE.MathUtils.lerp(0.95, 0.6, handled),
    clearcoat: handled * 0.4,
    clearcoatRoughness: 0.45,
    flatShading: true,
  });
}

/** Charcoal, soot, ash — pigment as a surface, not a colour. Utterly flat. */
export function pigment(colour) {
  return standard(colour, { roughness: 1 });
}

/** Ground ochre bound in fat: slightly less dead than dry pigment. */
export function ochre(colour = "#a8442a") {
  return standard(colour, { roughness: 0.88 });
}

/**
 * Metal. Historically this is meteoric iron or native copper and nothing else —
 * there is no smelting in this period, so any smelted-looking metal in this
 * world is a deliberate supernatural signal rather than an oversight.
 * This is the only function here that sets metalness above zero.
 */
export function metal(colour = "#8d8579", { polish = 0.6, supernatural = false } = {}) {
  return physical(colour, {
    metalness: 1,
    roughness: THREE.MathUtils.lerp(0.7, 0.18, polish),
    ...(supernatural
      ? { emissive: shift(colour, { dv: -0.2 }), emissiveIntensity: 0.35 }
      : {}),
  });
}

/**
 * Named lookup, so data files can specify a substance as a string.
 * `items.js` and the site builder both drive material choice from data records,
 * and a string key is the only way to keep that data engine-agnostic.
 */
export const SUBSTANCES = {
  bone, antler, ivory, stone, flint, obsidian, greenstone, shell, wood,
  cloth, hide, rawhide, fur, ochre, pigment, metal,
};

export function substance(name, colour, opts) {
  const fn = SUBSTANCES[name];
  if (!fn) return standard(colour ?? "#8a8378", { roughness: 0.85 });
  return colour === undefined ? fn(undefined, opts) : fn(colour, opts);
}

/** Free every material in a map/array. Builders churn these on every rebuild. */
export function disposeAll(materials) {
  const list = Array.isArray(materials) ? materials : Object.values(materials ?? {});
  list.forEach((m) => {
    if (m && typeof m.dispose === "function") m.dispose();
    else if (m && typeof m === "object") disposeAll(m);
  });
}
