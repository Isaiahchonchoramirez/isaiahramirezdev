# Unwritten Age modular wardrobe pipeline

The canonical standard is `unwritten_humanoid_v1`: metres, Blender Z-up while authoring, glTF Y-up on export, origin on the ground between the feet, forward along Blender -Y, and one MPFB game-engine armature. Garments use the body's bind pose and must not carry a second armature.

## Add a shirt, pants, robe, or hairstyle

1. Model around the matching canonical MPFB reference body in `art/characters`. Do not apply an object-wide scale to compensate for a bad fit.
2. Bind to the existing game-engine rig. Preserve these bone names: `pelvis`, `spine_01..03`, `neck_01`, `head`, paired arm/hand/thigh/calf/foot bones. Tight pieces use skinning; only hems, mantles, ties, and braids may receive restrained secondary motion.
3. Name the object `<culture>-<item-id>`. Add Blender custom properties `role`, `slot`, and `variant`. All pieces belonging to one item use the same slot/variant pair.
4. Use metre scale, applied rotation/scale, opaque PBR materials, smooth normals, four weights per vertex maximum, and the canonical bind pose. Export GLB with skins, morphs, extras, Y-up, no animations, and `export_apply=False` so morph targets survive.
5. Add shared morph targets where the art supports them: `bodyMass`, `muscularity`, `chest`, `waist`, `hipWidth`, `shoulderWidth`, `armSize`, and `legSize`. Otherwise declare the supported body profiles and rely on shared-bone proportions.
6. Register one record in `wardrobe-catalog.js`: stable ID, label, claimed slots, explicit node binding, skeleton standard, body profiles, covered body regions, morph support, incompatibilities, and physics profile.
7. Add the item to a preset only if its slots do not conflict. A full-body garment claims both `torsoInner` and `lowerBody`. Long robes suppress calf wraps when necessary.
8. Run `npm run validate:wardrobe`, then `npm run build:github`.
9. Inspect short/slender, average, tall/broad, wide-hip, and muscular bodies from front, back, sides, and three-quarter views in idle and walk. Also check raised arms and a deep leg bend when the rig supports them.

Hair is always exclusive. New styles must be attached to `head` (with restrained neck/spine weighting only for long sections), fit all major head profiles, expose hair-color-compatible material, and declare headwear compatibility. Broad ribbon cards, floating roots, eye-covering shapes, and unlicensed downloads are not production options.

Append `?wardrobeDebug=1` to the game URL to print the development wardrobe inspector table containing node, type, parent, skeleton, visibility, slot, catalog item, asset source, body mask, and active state.
