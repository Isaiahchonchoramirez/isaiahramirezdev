"""Generate the CC0 human bases used by The Unwritten Age.

Run with Blender, not system Python. MPFB 2.x must be installed and enabled:
  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/generate_mpfb_characters.py
"""

import importlib
import math
import os
import sys

import bpy
import bmesh
import mathutils


def mpfb_symbol(module_suffix, symbol):
    for module_name in sys.modules:
        if module_name.endswith(module_suffix):
            module = importlib.import_module(module_name)
            return getattr(module, symbol)
    raise RuntimeError(f"MPFB module {module_suffix} is not loaded")


HumanService = mpfb_symbol("mpfb.services.humanservice", "HumanService")
AssetService = mpfb_symbol("mpfb.services.assetservice", "AssetService")
TargetService = mpfb_symbol("mpfb.services.targetservice", "TargetService")

# MPFB stores the macro sliders as custom properties on the basemesh and only
# rebuilds the shape when told to. `create_human(macro_detail_dict=...)` accepts
# the dict and silently discards it — gender 0.0 and gender 1.0 came out as the
# same vertices, which is why every character was the same androgynous body no
# matter what the spec asked for.
MACRO_PROPERTY = {
    "gender": "MPFB_HUM_gender", "age": "MPFB_HUM_age", "muscle": "MPFB_HUM_muscle",
    "weight": "MPFB_HUM_weight", "proportions": "MPFB_HUM_proportions",
    "height": "MPFB_HUM_height", "cupsize": "MPFB_HUM_cupsize",
    "firmness": "MPFB_HUM_firmness",
}
RACE_PROPERTY = {"asian": "MPFB_HUM_asian", "caucasian": "MPFB_HUM_caucasian",
                 "african": "MPFB_HUM_african"}


def apply_macro_details(human, macro):
    """Write the spec's macro sliders onto the body and rebuild it."""
    for key, value in macro.items():
        if key == "race":
            for race, share in value.items():
                human[RACE_PROPERTY[race]] = share
        elif key in MACRO_PROPERTY:
            human[MACRO_PROPERTY[key]] = value
    TargetService.reapply_macro_details(human)
    # Macros arrive as shape keys layered over the base mesh. The rest-pose bake
    # later clears shape keys wholesale, which silently threw the whole macro
    # away and left every character on the same androgynous base — so bake them
    # into the vertices now, while they still exist.
    TargetService.bake_targets(human)
    height = max(v.co.z for v in human.data.vertices) - min(v.co.z for v in human.data.vertices)
    print(f"MACRO gender={macro.get('gender'):.2f} cup={macro.get('cupsize'):.2f}"
          f" -> body height {height:.3f} m")

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(PROJECT, "public", "unwritten-age", "assets", "characters")
SOURCE_OUT = os.path.join(PROJECT, "art", "characters")
os.makedirs(OUT, exist_ok=True)
os.makedirs(SOURCE_OUT, exist_ok=True)

CHARACTERS = [
    {
        "id": "veyr-hunter",
        "macro": {"gender": 0.92, "age": 0.43, "muscle": 0.72, "weight": 0.44,
                  "proportions": 0.58, "height": 0.58, "cupsize": 0.25, "firmness": 0.55,
                  "race": {"asian": 0.34, "caucasian": 0.33, "african": 0.33}},
        "skin": (0.30, 0.16, 0.095, 1.0),
        "skin_asset": "middleage_african_male.mhmat",
        "hair_asset": "short04.mhclo",
        "cloth": (0.035, 0.018, 0.008, 1.0),
    },
    {
        "id": "aurean-keeper",
        "macro": {"gender": 0.08, "age": 0.40, "muscle": 0.54, "weight": 0.53,
                  "proportions": 0.52, "height": 0.48, "cupsize": 0.48, "firmness": 0.62,
                  "race": {"asian": 0.34, "caucasian": 0.33, "african": 0.33}},
        "skin": (0.44, 0.25, 0.15, 1.0),
        "skin_asset": "young_asian_female.mhmat",
        "hair_asset": "braid01.mhclo",
        "cloth": (0.09, 0.045, 0.012, 1.0),
    },
    {
        "id": "ember-elder",
        "macro": {"gender": 0.50, "age": 0.72, "muscle": 0.42, "weight": 0.40,
                  "proportions": 0.47, "height": 0.44, "cupsize": 0.32, "firmness": 0.30,
                  "race": {"asian": 0.34, "caucasian": 0.33, "african": 0.33}},
        "skin": (0.22, 0.115, 0.072, 1.0),
        "skin_asset": "old_african_female.mhmat",
        "hair_asset": "afro01.mhclo",
        "cloth": (0.04, 0.028, 0.014, 1.0),
    },
]


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.images, bpy.data.curves):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def skin_material(name, colour):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = 0.48
    bsdf.inputs["Subsurface Weight"].default_value = 0.075
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.42, 0.22)
    return material


def shade_smooth(obj):
    """Smooth normals. Flat-shaded garments read as carved wood, not cloth."""
    obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
    obj.data.update()


def bind_to_rig(obj, rig, single_bone=None):
    """Make a garment deform with the body instead of hanging in space.

    Parenting alone only carries the object along with the armature object; the
    mesh itself stays rigid while the skinned body moves inside it. Anything
    worn has to carry an Armature modifier too. The torso wrap inherits the
    body's vertex groups because it was derived from the body mesh; the
    primitives have none, so they are rigidly weighted to one bone.
    """
    obj.parent = rig
    if single_bone:
        group = obj.vertex_groups.new(name=single_bone)
        group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    modifier = obj.modifiers.new("armature", "ARMATURE")
    modifier.object = rig
    modifier.use_vertex_groups = True


def create_flowing_lower_wrap(spec, body_height, cloth, rig, *,
                               variant="wrap", bottom_ratio=0.275,
                               bottom_radius_ratio=0.172, flow=0.055):
    """Build a pleated lower garment with enough geometry to read as cloth.

    A cone can only look like a lampshade. This is a stack of shaped rings:
    close at the hips, loose at the knee, with alternating radial folds that
    grow toward the hem. Runtime adds low-amplitude secondary sway to the whole
    piece; the folds make that movement catch light like fabric.
    """
    sides, rings = 72, 11
    top_z, bottom_z = 0.565 * body_height, bottom_ratio * body_height
    # A human waist is elliptical, not circular. The old circular ring used
    # the side-to-side radius at the front and back too, leaving the skirt
    # visibly floating several centimetres away from the abdomen and seat.
    # These proportions tuck the top underneath the matching elliptical belt,
    # then gradually open into a rounder free hem.
    top_x, top_y = 0.126 * body_height, 0.098 * body_height
    bottom_x = bottom_radius_ratio * body_height
    bottom_y = bottom_x * 0.86
    verts, faces = [], []
    for row in range(rings):
        t = row / (rings - 1)
        z = top_z + (bottom_z - top_z) * t
        ease = t ** 0.72
        base_x = top_x + (bottom_x - top_x) * ease
        base_y = top_y + (bottom_y - top_y) * ease
        for col in range(sides):
            angle = math.tau * col / sides
            # Eight broad folds, plus a smaller travelling wrinkle. Both grow
            # toward the free hem and vanish at the belted waist.
            fold = math.sin(angle * 8.0) * (0.004 + 0.015 * t) * body_height
            ripple = math.sin(angle * 4.0 + t * math.pi * 1.5) * 0.004 * t * body_height
            detail = fold + ripple
            verts.append((math.cos(angle) * (base_x + detail),
                          math.sin(angle) * (base_y + detail * 0.82), z))
    for row in range(rings - 1):
        for col in range(sides):
            nxt = (col + 1) % sides
            a, b = row * sides + col, row * sides + nxt
            c, d = (row + 1) * sides + nxt, (row + 1) * sides + col
            faces.append((a, b, c, d))

    mesh = bpy.data.meshes.new(f'{spec["id"]}-{variant}-mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    skirt = bpy.data.objects.new(f'{spec["id"]}-{variant}', mesh)
    bpy.context.scene.collection.objects.link(skirt)
    skirt.data.materials.append(cloth)
    shade_smooth(skirt)
    solidify = skirt.modifiers.new("woven thickness", "SOLIDIFY")
    solidify.thickness = 0.0035 * body_height
    solidify.offset = 0.0
    bevel = skirt.modifiers.new("soft cloth edges", "BEVEL")
    bevel.width = 0.0025 * body_height
    bevel.segments = 2
    skirt["role"] = "garment-flow"
    skirt["flow"] = flow
    skirt["cloth_anchor"] = 0.20
    skirt["slot"] = "lower"
    skirt["variant"] = variant
    bind_to_rig(skirt, rig, single_bone="pelvis")
    return skirt


def create_loincloth(spec, body_height, cloth, rig):
    """Two layered, subdivided panels that move independently."""
    width = 0.23 * body_height
    top, bottom = 0.56 * body_height, 0.30 * body_height
    for side, y, phase in (("front", -0.145 * body_height, 0.0),
                           ("back", 0.135 * body_height, math.pi)):
        cols, rows = 9, 9
        verts, faces = [], []
        for row in range(rows):
            t = row / (rows - 1)
            z = top + (bottom - top) * t
            for col in range(cols):
                u = col / (cols - 1)
                x = (u - 0.5) * width * (1.0 - 0.36 * t)
                ripple = math.sin(u * math.pi * 4 + t * 2.0 + phase) * 0.008 * body_height * t
                # Longer down the centre and shorter at the corners gives a
                # cut-hide hem instead of a rectangular apron.
                hem = math.cos((u - 0.5) * math.pi) * 0.025 * body_height * t
                verts.append((x, y + ripple, z - hem))
        for row in range(rows - 1):
            for col in range(cols - 1):
                a = row * cols + col
                faces.append((a, a + 1, a + cols + 1, a + cols))
        mesh = bpy.data.meshes.new(f'{spec["id"]}-loincloth-{side}-mesh')
        mesh.from_pydata(verts, [], faces)
        panel = bpy.data.objects.new(f'{spec["id"]}-loincloth-{side}', mesh)
        bpy.context.scene.collection.objects.link(panel)
        panel.data.materials.append(cloth)
        shade_smooth(panel)
        solidify = panel.modifiers.new("woven thickness", "SOLIDIFY")
        solidify.thickness = 0.004 * body_height
        panel["role"] = "garment-flow"
        panel["flow"] = 0.085 if side == "front" else 0.065
        panel["cloth_anchor"] = 0.16
        panel["slot"] = "lower"
        panel["variant"] = "loincloth"
        bind_to_rig(panel, rig, single_bone="pelvis")


def create_mantle(spec, human, body_height, cloth, rig):
    """A fitted shoulder hide cut directly from the character's upper back."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(human.evaluated_get(depsgraph))
    mantle = bpy.data.objects.new(f'{spec["id"]}-shoulder-mantle', mesh)
    bpy.context.scene.collection.objects.link(mantle)
    for group in human.vertex_groups:
        mantle.vertex_groups.new(name=group.name)

    arm_prefixes = ("upperarm", "lowerarm", "hand", "thumb", "index", "middle", "ring", "pinky")
    arm_groups = {group.index for group in mantle.vertex_groups if group.name.startswith(arm_prefixes)}
    on_arm = [sum(g.weight for g in vert.groups if g.group in arm_groups) > 0.55 for vert in mesh.vertices]

    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    low, high = 0.655 * body_height, 0.815 * body_height
    remove = [vert for vert in bm.verts if on_arm[vert.index]
              or not (low <= vert.co.z <= high)
              or vert.co.y < 0.015 * body_height
              or abs(vert.co.x) > 0.235 * body_height]
    bmesh.ops.delete(bm, geom=remove, context="VERTS")
    bm.normal_update()
    for vert in bm.verts:
        # A real layer of hide resting on the back, not a remote billboard.
        vert.co += vert.normal * (0.010 * body_height)
    bm.to_mesh(mesh)
    bm.free()

    mesh.materials.clear()
    mantle.data.materials.append(cloth)
    for polygon in mantle.data.polygons:
        polygon.material_index = 0
    shade_smooth(mantle)
    solidify = mantle.modifiers.new("hide thickness", "SOLIDIFY")
    solidify.thickness = 0.005 * body_height
    mantle["role"] = "garment-flow"
    mantle["flow"] = 0.035
    mantle["cloth_anchor"] = 0.28
    mantle["slot"] = "mantle"
    mantle["variant"] = "shoulder-mantle"
    bind_to_rig(mantle, rig)

def shell_from_body(human, rig, *, name, material, keep, lift, thickness,
                    relief=None, relax=None, props=None):
    """Cut a garment out of the body's own surface and lift it clear.

    Primitives placed by ratio cannot fit a body they have never seen: the
    armor plates were flat cubes parked at a guessed front/back depth and the
    gaiters were cones parked at a guessed leg spacing, so both floated with
    gaps no matter which character wore them. A shell taken off the skin fits
    every body by construction, and — because it inherits the body's vertex
    groups — it scales with the same bones when the proportion sliders move,
    which is what stops the wearer growing back out through it.

    `keep(co, height, owner)` chooses the region; `owner` is the name of the
    bone that holds most of that vertex, so regions can be named anatomically
    rather than guessed from coordinates.
    """
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(human.evaluated_get(depsgraph))
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for group in human.vertex_groups:
        obj.vertex_groups.new(name=group.name)

    # Only bones may own a vertex. MPFB's `extra_vertex_groups` also hangs
    # region groups ("body", "legs") off the mesh at full weight, and those beat
    # every bone in a plain maximum — which silently emptied the gaiters and
    # gave the armor sleeves down to the elbow.
    bones = {bone.name for bone in rig.data.bones}
    names = [group.name if group.name in bones else None for group in obj.vertex_groups]
    owners = []
    for vertex in mesh.vertices:
        best, weight = None, 0.0
        for entry in vertex.groups:
            if entry.group >= len(names) or names[entry.group] is None:
                continue
            if entry.weight > weight:
                best, weight = names[entry.group], entry.weight
        owners.append(best or "")

    height = max(v.co.z for v in mesh.vertices)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(
        bm,
        geom=[v for v in bm.verts if not keep(v.co, height, owners[v.index])],
        context="VERTS")
    bm.normal_update()
    for vert in bm.verts:
        extra = relief(vert.co, height) if relief else 0.0
        vert.co += vert.normal * (lift * height + extra)
    bm.to_mesh(mesh)
    bm.free()

    mesh.materials.clear()
    mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.material_index = 0
    for slot in obj.material_slots:
        slot.link = "DATA"

    if relax:
        smooth = obj.modifiers.new("hangs like cloth", "SMOOTH")
        smooth.factor, smooth.iterations = relax
    solid = obj.modifiers.new("thickness", "SOLIDIFY")
    solid.thickness = thickness * height
    solid.offset = 1.0
    shade_smooth(obj)
    for key, value in (props or {}).items():
        obj[key] = value
    bind_to_rig(obj, rig)
    return obj


def create_fur_boots(spec, human, cloth, rig):
    """Hide gaiters cut from the shin itself, so they wrap every leg."""
    for side in ("l", "r"):
        calf = f"calf_{side}"
        shell_from_body(
            human, rig,
            name=f'{spec["id"]}-calf-gaiter-{side}',
            material=cloth,
            # The shin, ankle and instep — whatever the leg's actual shape is.
            keep=lambda co, height, owner, calf=calf: owner in (calf, f"foot_{side}")
            and co.z < 0.30 * height,
            lift=0.006,
            thickness=0.004,
            # Binding bands: raised rings up the shin rather than free-floating
            # tori that never touched the leg.
            relief=lambda co, height: max(0.0, math.sin(co.z / height * 150.0)) ** 3
            * 0.004 * height,
            props={"role": "garment", "slot": "feet", "variant": "fur-boots"})


def create_armor_bands(spec, human, hide, rig):
    """Worked-hide plating taken off the torso, so it closes around the ribs."""
    shell_from_body(
        human, rig,
        name=f'{spec["id"]}-layered-hide-plating',
        material=hide,
        keep=lambda co, height, owner: not owner.startswith(
            ("upperarm", "lowerarm", "hand", "thumb", "index", "middle", "ring", "pinky"))
        and 0.55 * height <= co.z <= 0.80 * height
        and abs(co.x) <= 0.30 * height,
        # Sits proud of the woven tunic underneath rather than inside it.
        lift=0.022,
        thickness=0.007,
        # Overlapping horizontal courses, the silhouette the plates were after.
        relief=lambda co, height: max(0.0, math.sin(co.z / height * 96.0)) ** 2
        * 0.008 * height,
        relax=(0.6, 4),
        props={"role": "garment", "slot": "torso", "variant": "hide-armor"})


def mask_skin_under_clothes(human, body_height):
    """Remove export-only skin hidden by the tunic.

    Cloth and skin cannot occupy nearly the same space under animation without
    occasional punch-through. Production characters solve that with body
    masks. The editable .blend is saved before this runs, so sculptors retain a
    complete body; only the browser/game mesh loses the invisible torso faces.
    """
    arm_prefixes = ("upperarm", "lowerarm", "hand", "thumb", "index",
                    "middle", "ring", "pinky", "clavicle")
    arm_groups = {group.index for group in human.vertex_groups
                  if group.name.startswith(arm_prefixes)}
    low, high = 0.485 * body_height, 0.79 * body_height
    removable = []
    for polygon in human.data.polygons:
        verts = [human.data.vertices[index] for index in polygon.vertices]
        center_z = sum(v.co.z for v in verts) / len(verts)
        arm_weight = max(
            (sum(g.weight for g in v.groups if g.group in arm_groups) for v in verts),
            default=0.0,
        )
        if low < center_z < high and arm_weight < 0.34:
            removable.append(polygon.index)

    bm = bmesh.new()
    bm.from_mesh(human.data)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[index] for index in removable], context="FACES")
    bm.to_mesh(human.data)
    bm.free()
    human.data.update()
    print(f"MASKED {len(removable)} hidden skin faces beneath clothing")


def ground_and_align(human, rig, rig_reference_height):
    """Stand the character on z=0 with its skeleton actually inside its body.

    MPFB's `feet_on_ground` moves the mesh vertices up but leaves the armature
    where it was, so the whole skeleton ends up roughly 0.8 m below the body it
    is supposed to drive — the shoulder joint sits at hip height and the ankles
    hang below the floor. Nothing looks wrong at rest, because rest equals bind
    and no deformation is applied; it only shows the moment a bone rotates,
    when the limb pivots about a point nowhere near its joint and swings wide.

    So the human is built unshifted, where MPFB's rig does line up, and mesh and
    bones are then lifted together by the same amount.
    """
    lowest = min(vert.co.z for vert in human.data.vertices)
    body_height = max(vert.co.z for vert in human.data.vertices) - lowest
    offset = -lowest
    for vert in human.data.vertices:
        vert.co.z += offset
    human.data.update()

    # `add_builtin_rig` always emits the same skeleton, sized for MPFB's stock
    # body — so once the macros make a character shorter or taller, the bones
    # stop matching it. Scale the rig by the same amount the body changed before
    # lifting it, or the shoulder joint of a 1.53 m character sits at the height
    # of a 1.69 m one's.
    growth = body_height / max(1e-6, rig_reference_height)

    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for edit_bone in rig.data.edit_bones:
        # Ground the skeleton first, then scale about the feet. Scaling about
        # the rig's own origin — which sits near the hips — stretched the legs
        # and shortened the spine, leaving a short character's shoulder at 85%
        # of her height instead of the ~79% a person's actually is.
        edit_bone.head.z += offset
        edit_bone.tail.z += offset
        edit_bone.head *= growth
        edit_bone.tail *= growth
    bpy.ops.object.mode_set(mode="OBJECT")

    shoulder = rig.data.bones["upperarm_l"].head_local.z
    top = max(v.co.z for v in human.data.vertices)
    print(f"ALIGNED scaled rig x{growth:.3f}, lifted {offset:.3f} m; shoulder "
          f"z={shoulder:.3f} of body {top:.3f} ({shoulder / top:.0%})")


def aim_pose_bone(rig, name, target):
    """Swing a pose bone so it points along `target` in armature space.

    Posing by euler angles on this rig fights gimbal lock — pushing the arm
    further down past a point starts widening it again. Aiming is stated in the
    terms we actually care about ("the upper arm points down and slightly out")
    and is independent of how the bone's local axes happen to be laid out.
    """
    pose_bone = rig.pose.bones[name]
    pose_bone.rotation_mode = "QUATERNION"

    # Swing from where the bone is *now*, not from where it rests: once the
    # upper arm has moved, the forearm no longer lies along its rest direction.
    current = (pose_bone.tail - pose_bone.head).normalized()
    swing = current.rotation_difference(mathutils.Vector(target).normalized())

    # Write the rotation channel only. Assigning `pose_bone.matrix` also sets
    # location, and Blender solves for a local offset that drags the bone off
    # its parent — the arm ends up pointing correctly downward while having
    # been translated bodily out to the side, which is what kept splaying it.
    #
    #   world = parent_world @ local_rest @ pose_local
    # so the pose channel that yields `swing @ world` is:
    #   pose_local = (parent_world @ local_rest)^-1 @ swing @ world
    world = pose_bone.matrix.to_quaternion()
    identity = mathutils.Quaternion()
    parent_world = pose_bone.parent.matrix.to_quaternion() if pose_bone.parent else identity
    parent_rest = (pose_bone.parent.bone.matrix_local.to_quaternion()
                   if pose_bone.parent else identity)
    local_rest = parent_rest.inverted() @ pose_bone.bone.matrix_local.to_quaternion()
    pose_bone.rotation_quaternion = (parent_world @ local_rest).inverted() @ (swing @ world)
    bpy.context.view_layer.update()


def relax_arms(rig):
    """Drop the arms from MPFB's 42° A-pose to something a person stands in.

    MakeHuman bodies are authored with the arms held out for rigging and
    clothes fitting. Left that way the character reads as a mannequin, and the
    walk cycle's forward/back swing sweeps a sideways-held arm *across* the
    body instead of along it. Parent before child: the upper arm has to be
    placed before the forearm is aimed off it.
    """
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    for side, out in (("l", 1.0), ("r", -1.0)):
        upper = rig.pose.bones[f"upperarm_{side}"]

        # 1. Open the elbow first, while the arm is still out to the side. In an
        #    A-pose the forearm is bent forward of the upper arm; swinging the
        #    shoulder down without straightening it first turns that bend into a
        #    hand reaching out in front of the hip. Blender's -Y is forward, so
        #    a little of it leaves a natural elbow rather than a locked one.
        upper_dir = (upper.tail - upper.head).normalized()
        elbow = (upper_dir + mathutils.Vector((0.0, -0.14, 0.0))).normalized()
        aim_pose_bone(rig, f"lowerarm_{side}", elbow)

        # 2. Then swing the whole straightened arm down from the shoulder; the
        #    forearm and hand follow rigidly and keep the relationship above.
        aim_pose_bone(rig, f"upperarm_{side}", (0.16 * out, 0.0, -1.0))
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()
    for name in ("upperarm_l", "lowerarm_l"):
        pose_bone = rig.pose.bones[name]
        direction = (pose_bone.tail - pose_bone.head).normalized()
        from_down = math.degrees(math.atan2(
            math.hypot(direction.x, direction.y), -direction.z))
        print(f"POSED {name} {from_down:.1f} deg from straight down")


def bake_pose_as_rest(rig):
    """Make the relaxed pose the body's actual rest pose.

    Changing only the skeleton is not enough: glTF renders `mesh` unchanged
    wherever the pose equals the bind pose, so a relaxed skeleton against an
    A-pose mesh makes the skinning re-apply the relaxation and the arms splay
    further out than they started. The mesh has to be baked to match.

    The stock route is blocked — Blender will not apply a modifier to a mesh
    carrying shape keys, and MPFB leaves 38 macro targets on the body. Nothing
    at runtime drives them (the creator's sliders are not wired to morphs), so
    they are dropped here rather than being allowed to veto the pose.

    Run this before anything is fitted to the body, so eyes, hair and clothing
    are all built against the pose the character will actually stand in.
    """
    meshes = [obj for obj in bpy.context.scene.objects
              if obj.type == "MESH"
              and any(m.type == "ARMATURE" and m.object == rig for m in obj.modifiers)]

    for obj in meshes:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        before = max(v.co.x for v in obj.data.vertices)
        if obj.data.shape_keys:
            obj.shape_key_clear()
        for modifier in [m for m in obj.modifiers
                         if m.type == "ARMATURE" and m.object == rig]:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        # Arms coming in is the check that matters: if this number grows, the
        # skeleton is not sitting inside the body and the pose is being applied
        # about the wrong pivots.
        print(f"BAKED {obj.name}: half-span {before:.3f} -> "
              f"{max(v.co.x for v in obj.data.vertices):.3f}")

    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.armature_apply()
    bpy.ops.object.mode_set(mode="OBJECT")

    for obj in meshes:
        modifier = obj.modifiers.new("armature", "ARMATURE")
        modifier.object = rig
        modifier.use_vertex_groups = True

    bone = rig.data.bones["upperarm_l"]
    direction = (bone.tail_local - bone.head_local).normalized()
    print("BAKED rest upperarm_l {:.1f} deg from down, {} mesh(es) rebound".format(
        math.degrees(math.atan2(math.hypot(direction.x, direction.y), -direction.z)),
        len(meshes)))


def bake_helper_mask(human):
    """Delete MPFB's helper geometry for real, rather than hiding it.

    MakeHuman bodies carry a low-poly helper shell used for fitting clothes.
    `mask_helpers=True` hides it behind a Mask modifier, which was enough while
    the exporter ran with `export_apply=True`. Now that morph targets have to
    survive export, modifiers are left unevaluated — so the helper shell ships
    with the body and renders as flat panels across the face and shoulders.

    Applying the mask needs a mesh with no shape keys, so this has to run after
    the rest-pose bake clears them and before the face morphs are authored.
    """
    masks = [m for m in human.modifiers if m.type == "MASK"]
    if not masks:
        return
    bpy.ops.object.select_all(action="DESELECT")
    human.select_set(True)
    bpy.context.view_layer.objects.active = human
    before = len(human.data.vertices)
    for modifier in masks:
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    print(f"HELPERS stripped {before} -> {len(human.data.vertices)} verts")


def create_face_morphs(human):
    """Author a compact, game-safe facial morph set after the rest-pose bake."""
    height = max(v.co.z for v in human.data.vertices)
    human.shape_key_add(name="Basis")
    definitions = {
        "headWidth": lambda co: co.z > 0.84 * height and abs(co.x) < 0.105 * height,
        "jawWidth": lambda co: 0.82 * height < co.z < 0.88 * height and abs(co.x) < 0.10 * height,
        "chinLength": lambda co: 0.80 * height < co.z < 0.845 * height and abs(co.x) < 0.085 * height,
        "noseSize": lambda co: abs(co.x) < 0.055 * height and 0.835 * height < co.z < 0.91 * height and co.y < 0,
        "cheekbones": lambda co: 0.845 * height < co.z < 0.91 * height and abs(co.x) < 0.13 * height,
        "mouthWidth": lambda co: 0.815 * height < co.z < 0.855 * height and abs(co.x) < 0.09 * height and co.y < 0,
    }
    for name, include in definitions.items():
        key = human.shape_key_add(name=name)
        key.slider_min, key.slider_max = -1.0, 1.0
        for index, vertex in enumerate(human.data.vertices):
            co = vertex.co
            if not include(co):
                continue
            if name == "headWidth":
                key.data[index].co.x += co.x * 0.12
            elif name == "jawWidth":
                key.data[index].co.x += co.x * 0.18
            elif name == "chinLength":
                key.data[index].co.z -= 0.025 * height
            elif name == "noseSize":
                key.data[index].co.y += co.y * 0.14
            elif name == "cheekbones":
                key.data[index].co.x += co.x * 0.10
            elif name == "mouthWidth":
                key.data[index].co.x += co.x * 0.12

    create_body_morphs(human, height)


def create_body_morphs(human, height):
    """Chest, seat and belly, as morphs the player can actually move.

    MPFB's own `cupsize` macro is baked at generation and did not survive to the
    export in any case, so these are authored directly: a soft falloff from the
    centre of each region means the shape swells and shrinks rather than a block
    of vertices sliding as one. Blender -Y is forward.
    """
    def falloff(value, centre, reach):
        return max(0.0, 1.0 - abs(value - centre) / reach) ** 2

    regions = {
        # Bust: forward and a little apart, strongest at the fullest point.
        "bust": {
            "test": lambda co: co.y < 0 and 0.66 * height < co.z < 0.80 * height
            and abs(co.x) < 0.17 * height,
            "move": lambda co: (
                math.copysign(falloff(abs(co.x), 0.062 * height, 0.11 * height)
                              * falloff(co.z, 0.725 * height, 0.075 * height)
                              * 0.030 * height, co.x) * 0.45,
                -falloff(abs(co.x), 0.062 * height, 0.11 * height)
                * falloff(co.z, 0.725 * height, 0.075 * height) * 0.030 * height,
                0.0),
        },
        # Seat: back and slightly down, so it reads as weight rather than a shelf.
        "glutes": {
            "test": lambda co: co.y > 0 and 0.44 * height < co.z < 0.60 * height
            and abs(co.x) < 0.22 * height,
            "move": lambda co: (
                math.copysign(falloff(abs(co.x), 0.085 * height, 0.13 * height)
                              * falloff(co.z, 0.515 * height, 0.075 * height)
                              * 0.034 * height, co.x) * 0.35,
                falloff(abs(co.x), 0.085 * height, 0.13 * height)
                * falloff(co.z, 0.515 * height, 0.075 * height) * 0.034 * height,
                -falloff(co.z, 0.515 * height, 0.075 * height) * 0.006 * height),
        },
        # Belly: forward and round, centred on the navel.
        "belly": {
            "test": lambda co: co.y < 0 and 0.52 * height < co.z < 0.68 * height
            and abs(co.x) < 0.16 * height,
            "move": lambda co: (
                0.0,
                -falloff(abs(co.x), 0.0, 0.15 * height)
                * falloff(co.z, 0.60 * height, 0.085 * height) * 0.030 * height,
                0.0),
        },
    }

    for name, region in regions.items():
        key = human.shape_key_add(name=name)
        key.slider_min, key.slider_max = -1.0, 1.0
        for index, vertex in enumerate(human.data.vertices):
            co = vertex.co
            if not region["test"](co):
                continue
            dx, dy, dz = region["move"](co)
            key.data[index].co.x += dx
            key.data[index].co.y += dy
            key.data[index].co.z += dz


def limit_skin_weights(obj, limit=4):
    """Fit the weighting to what glTF can actually carry.

    MPFB weights a vertex to as many bones as it likes. glTF stores four, and
    the exporter silently drops the rest — which renormalises what remains and
    drags vertices toward whichever bones survived. On this body that pulled
    the chest ~9 cm forward through the clothing and smeared the legs to 67 cm
    below the floor.

    Do not be tempted to delete the non-deform groups first: MPFB's Mask
    modifier hides the helper geometry by vertex group, and dropping that group
    unmasks it straight into the export — 18 MB of characters became 48 MB.
    """
    if not obj.vertex_groups:
        return
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.vertex_group_limit_total(limit=limit)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)


def add_period_clothing(spec, human, rig):
    """Simple layered garments over the real body; editable in every .blend."""
    cloth = bpy.data.materials.new(f'{spec["id"]}-woven-hide')
    cloth.diffuse_color = spec["cloth"]
    cloth.use_nodes = True
    bsdf = cloth.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = spec["cloth"]
    bsdf.inputs["Roughness"].default_value = 0.92
    bsdf.inputs["Sheen Weight"].default_value = 0.18

    hide = bpy.data.materials.new(f'{spec["id"]}-smoked-hide')
    hide.use_nodes = True
    hide_bsdf = hide.node_tree.nodes.get("Principled BSDF")
    hide_bsdf.inputs["Base Color"].default_value = tuple(
        max(0.008, channel * 0.52) for channel in spec["cloth"][:3]) + (1.0,)
    hide_bsdf.inputs["Roughness"].default_value = 0.72
    hide_bsdf.inputs["Sheen Weight"].default_value = 0.06

    # Derive the torso wrap from the evaluated human surface. This preserves
    # the shoulder slope, chest, waist and back instead of putting a cylinder
    # around a person. The small normal offset prevents z-fighting.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    fitted_mesh = bpy.data.meshes.new_from_object(human.evaluated_get(depsgraph))
    torso = bpy.data.objects.new(f'{spec["id"]}-fitted-torso-wrap', fitted_mesh)
    bpy.context.scene.collection.objects.link(torso)
    # Deform weights live on the mesh, but the group *names* live on the object.
    # Recreate them in the body's order so the copied weights resolve to the
    # same bones — without this the wrap binds to nothing and stays rigid.
    for group in human.vertex_groups:
        torso.vertex_groups.new(name=group.name)
    # Cut the band as a fraction of *this* body, not in absolute metres. These
    # characters are deliberately different heights: the same 0.86–1.40 m band
    # that clothed the 1.72 m hunter reached over the 1.50 m keeper's head and
    # cast a mask of her face.
    body_height = max(v.co.z for v in fitted_mesh.vertices)
    low, high = 0.50 * body_height, 0.815 * body_height
    half_width = 0.30 * body_height

    # Now that the arms hang at the sides they share the torso's x range, so a
    # width cut can no longer tell one from the other and the tunic grew
    # sleeves down to the wrists. Ask the weighting instead: anything the arm
    # bones own is arm. The clavicles stay, so the garment keeps its shoulders.
    limb = ("upperarm", "lowerarm", "hand", "thumb", "index", "middle", "ring", "pinky")
    arm_groups = {group.index for group in torso.vertex_groups
                  if group.name.startswith(limb)}
    on_arm = [
        sum(g.weight for g in vert.groups if g.group in arm_groups) > 0.5
        for vert in fitted_mesh.vertices
    ]

    bm = bmesh.new()
    bm.from_mesh(fitted_mesh)
    bm.verts.ensure_lookup_table()
    remove = [v for v in bm.verts
              if on_arm[v.index]
              or not (low <= v.co.z <= high and abs(v.co.x) <= half_width)]
    bmesh.ops.delete(bm, geom=remove, context="VERTS")
    # Lift the shell clear of the skin. Cloth taken straight off the body sits
    # on it exactly, so every time the chest moved under the breathing spine the
    # body surfaced through the weave — the nipples appearing to swell and
    # shrink was the body punching through a garment with no air in it.
    bm.normal_update()
    # The game export masks the hidden skin, so the fitted layer can rest close
    # to the flesh without punch-through.
    lift = 0.009 * body_height
    for vert in bm.verts:
        # A broad diagonal bias breaks the vacuum-sealed look without noisy,
        # evenly spaced corrugation. It is strongest near the free waist and
        # nearly absent at the shoulders where cloth bears on the body.
        vertical = max(0.0, min(1.0, (high - vert.co.z) / (high - low)))
        angle = math.atan2(vert.co.y, vert.co.x)
        wrinkle = math.sin(angle * 3.0 + vertical * math.pi * 4.0)
        vert.co += vert.normal * (lift + wrinkle * 0.0035 * body_height * vertical)
    bm.to_mesh(fitted_mesh)
    bm.free()
    # The derived mesh arrives wearing the body's skin. Replace every slot, then
    # point all faces at the one that is left, or the garment renders as bare
    # skin over bare skin.
    fitted_mesh.materials.clear()
    fitted_mesh.materials.append(cloth)
    for polygon in fitted_mesh.polygons:
        polygon.material_index = 0
    for slot in torso.material_slots:
        slot.link = "DATA"
    # Relax the surface before thickening it. Hide taken off a body keeps every
    # contour of that body — navel, nipples, ribs — which reads as paint rather
    # than clothing. Smoothing lets it hang like a garment.
    relax = torso.modifiers.new("hangs like cloth", "SMOOTH")
    relax.factor = 1.25
    relax.iterations = 12
    solidify = torso.modifiers.new("woven thickness", "SOLIDIFY")
    solidify.thickness = 0.006 * body_height
    solidify.offset = 1.0
    shade_smooth(torso)
    torso["role"] = "garment"
    torso["slot"] = "torso"
    torso["variant"] = "tunic"
    bind_to_rig(torso, rig)

    # The armor variant is its own shell off the same body, not a copy of the
    # tunic pushed outward by object scale — that scaled about the origin at the
    # feet, so the gap grew the further up the body you looked.
    create_armor_bands(spec, human, hide, rig)

    create_flowing_lower_wrap(spec, body_height, cloth, rig, variant="wrap")
    create_flowing_lower_wrap(
        spec, body_height, cloth, rig, variant="robe",
        bottom_ratio=0.10, bottom_radius_ratio=0.20, flow=0.065)
    create_mantle(spec, human, body_height, hide, rig)
    create_fur_boots(spec, human, hide, rig)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.134 * body_height, minor_radius=0.0085 * body_height,
        major_segments=64, minor_segments=12,
        location=(0, 0, 0.557 * body_height))
    belt = bpy.context.object
    belt.name = f'{spec["id"]}-fibre-belt'
    belt.data.materials.append(cloth)
    # Human waists are wider side-to-side than front-to-back. An elliptical
    # belt sits on the garment instead of intersecting it at four cardinal
    # points like a circular torus.
    belt.scale.y = 0.76
    shade_smooth(belt)
    belt["role"] = "garment"
    belt["slot"] = "waist"
    belt["variant"] = "fibre-belt"
    bind_to_rig(belt, rig, single_bone="pelvis")


def export_character(spec):
    reset_scene()
    human = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=False,
        extra_vertex_groups=True,
        # Grounding is done in ground_and_align, which moves the skeleton too.
        feet_on_ground=False,
        scale=0.1,
    )
    # The height the stock rig is authored against, captured before the macros
    # move it, so ground_and_align can scale the skeleton to match.
    rig_reference_height = (max(v.co.z for v in human.data.vertices)
                            - min(v.co.z for v in human.data.vertices))
    apply_macro_details(human, spec["macro"])
    human.name = f'{spec["id"]}-body'
    human.data.name = f'{spec["id"]}-mesh'
    skin_path = AssetService.find_asset_absolute_path(spec["skin_asset"], asset_subdir="skins")
    if skin_path:
        HumanService.set_character_skin(skin_path, human, skin_type="GAMEENGINE")
    else:
        human.data.materials.clear()
        human.data.materials.append(skin_material(f'{spec["id"]}-skin', spec["skin"]))

    rig = HumanService.add_builtin_rig(human, "game_engine")
    rig.name = f'{spec["id"]}-rig'

    # Put the skeleton inside the body before posing it — every joint pivots in
    # the wrong place until this runs.
    ground_and_align(human, rig, rig_reference_height)

    # Drop the arms and bake that in before anything is fitted to the body, so
    # eyes, hair and clothing are all cut against the pose the character stands
    # in rather than against MPFB's splayed rigging pose.
    relax_arms(rig)
    bake_pose_as_rest(rig)

    # Each part carries a `role`, exported as glTF extras and read back as
    # `userData.role`. The creator recolours by role, so it never has to guess
    # which mesh is hair from an asset filename that changes per character.
    human["role"] = "skin"

    attachments = [
        ("eyes", "low-poly.mhclo", "Eyes", "eyes", None),
        ("eyebrows", "eyebrow001.mhclo", "Eyebrows", "hair", None),
        ("eyelashes", "eyelashes01.mhclo", "Eyelashes", "hair", None),
        ("teeth", "teeth_base.mhclo", "Teeth", "mouth", None),
        ("tongue", "tongue01.mhclo", "Tongue", "mouth", None),
        ("hair", "short01.mhclo", "Hair", "hair", "close-crop"),
        ("hair", "ponytail01.mhclo", "Hair", "hair", "ponytail"),
        ("hair", "braid01.mhclo", "Hair", "hair", "long-braid"),
        ("hair", "afro01.mhclo", "Hair", "hair", "coiled-crown"),
        ("hair", "long01.mhclo", "Hair", "hair", "long-loose"),
    ]
    for subdir, filename, asset_type, role, variant in attachments:
        path = AssetService.find_asset_absolute_path(filename, asset_subdir=subdir)
        if not path:
            print(f"MISSING {subdir}/{filename}")
            continue
        existing = set(bpy.context.scene.objects)
        HumanService.add_mhclo_asset(
            path, human, asset_type=asset_type, subdiv_levels=0,
            material_type="GAMEENGINE", set_up_rigging=True)
        for added in set(bpy.context.scene.objects) - existing:
            added["role"] = role
            if variant:
                added["slot"] = "hair"
                added["variant"] = variant

    add_period_clothing(spec, human, rig)

    # Only here do both constraints hold. MPFB fits every .mhclo asset by
    # indexing into the full basemesh, so the helper shell has to survive until
    # the last attachment is bound; and a mesh carrying shape keys cannot have a
    # modifier applied, so the shell has to go before the morphs are authored.
    bake_helper_mask(human)
    create_face_morphs(human)

    # Keep the editable scene readable: render the default outfit while all
    # alternative slot meshes remain present and exportable.
    defaults = {"torso": "tunic", "lower": "wrap", "mantle": "none",
                "feet": "bare", "waist": "fibre-belt", "hair": "close-crop"}
    for obj in bpy.context.scene.objects:
        slot, variant = obj.get("slot"), obj.get("variant")
        if slot and variant != defaults.get(slot):
            obj.hide_render = True

    # Keep the editable MPFB scene as the source of truth for later sculpting.
    blend_path = os.path.join(SOURCE_OUT, f'{spec["id"]}.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    # Export the complete body. Runtime wardrobe masking rebuilds an
    # instance-local triangle index from active catalog items, so removing a
    # garment restores skin without mutating the cached/original geometry.

    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH":
            limit_skin_weights(obj)

    # MPFB's game-engine skins carry an alpha channel they never use. Exported
    # as-is, glTF marks them BLEND, and Three.js then draws the body in the
    # transparent pass with depth writes off — so skin sorts over clothing, and
    # eyes, teeth and lashes render through the face. Nothing here is meant to
    # be see-through, so state that before export.
    for material in bpy.data.materials:
        if hasattr(material, "blend_method"):
            material.blend_method = "OPAQUE"
        if not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            alpha = node.inputs.get("Alpha") if node.type == "BSDF_PRINCIPLED" else None
            if alpha and not alpha.is_linked:
                alpha.default_value = 1.0

    # Keep source textures in the editable .blend, but cap browser-export copies.
    for image in bpy.data.images:
        if image.size[0] > 1024 or image.size[1] > 1024:
            scale = min(1024 / image.size[0], 1024 / image.size[1])
            image.scale(max(1, round(image.size[0] * scale)), max(1, round(image.size[1] * scale)))

    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = rig
    glb_path = os.path.join(OUT, f'{spec["id"]}.glb')
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        # Applying modifiers here strips shape keys from glTF. Garment
        # modifiers are evaluated by the exporter; keep the body morph set.
        export_apply=False,
        export_skins=True,
        export_animations=False,
        export_morph=True,
        export_yup=True,
        # Carries each part's `role` through to userData so the creator can
        # recolour skin, hair and eyes without matching mesh names.
        export_extras=True,
    )
    print(f"WROTE {glb_path}")


requested = set(sys.argv[sys.argv.index("--") + 1:]) if "--" in sys.argv else set()
for character in CHARACTERS:
    if requested and character["id"] not in requested:
        continue
    export_character(character)
