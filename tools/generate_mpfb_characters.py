"""Generate the CC0 human bases used by The Unwritten Age.

Run with Blender, not system Python. MPFB 2.x must be installed and enabled:
  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/generate_mpfb_characters.py
"""

import importlib
import os
import sys

import bpy
import bmesh


def mpfb_symbol(module_suffix, symbol):
    for module_name in sys.modules:
        if module_name.endswith(module_suffix):
            module = importlib.import_module(module_name)
            return getattr(module, symbol)
    raise RuntimeError(f"MPFB module {module_suffix} is not loaded")


HumanService = mpfb_symbol("mpfb.services.humanservice", "HumanService")
AssetService = mpfb_symbol("mpfb.services.assetservice", "AssetService")

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


def add_period_clothing(spec, human, rig):
    """Simple layered garments over the real body; editable in every .blend."""
    cloth = bpy.data.materials.new(f'{spec["id"]}-woven-hide')
    cloth.diffuse_color = spec["cloth"]
    cloth.use_nodes = True
    bsdf = cloth.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = spec["cloth"]
    bsdf.inputs["Roughness"].default_value = 0.92
    bsdf.inputs["Sheen Weight"].default_value = 0.18

    # Derive the torso wrap from the evaluated human surface. This preserves
    # the shoulder slope, chest, waist and back instead of putting a cylinder
    # around a person. The small normal offset prevents z-fighting.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    fitted_mesh = bpy.data.meshes.new_from_object(human.evaluated_get(depsgraph))
    torso = bpy.data.objects.new(f'{spec["id"]}-fitted-torso-wrap', fitted_mesh)
    bpy.context.scene.collection.objects.link(torso)
    bm = bmesh.new()
    bm.from_mesh(fitted_mesh)
    remove = [v for v in bm.verts if not (0.86 <= v.co.z <= 1.40 and abs(v.co.x) <= 0.34)]
    bmesh.ops.delete(bm, geom=remove, context="VERTS")
    bm.to_mesh(fitted_mesh)
    bm.free()
    torso.data.materials.clear()
    torso.data.materials.append(cloth)
    for polygon in torso.data.polygons:
        polygon.material_index = 0
    solidify = torso.modifiers.new("woven thickness", "SOLIDIFY")
    solidify.thickness = 0.009
    solidify.offset = 1.0
    torso.parent = rig

    # A restrained flared lower wrap overlaps the fitted torso at the belt.
    bpy.ops.mesh.primitive_cone_add(
        vertices=32, radius1=0.255, radius2=0.215,
        depth=0.48, location=(0, 0, 0.73))
    skirt = bpy.context.object
    skirt.name = f'{spec["id"]}-hide-skirt'
    skirt.data.materials.append(cloth)
    bevel = skirt.modifiers.new("softened hide edge", "BEVEL")
    bevel.width = 0.009
    bevel.segments = 2
    skirt.parent = rig

    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.245, minor_radius=0.018, major_segments=32,
        minor_segments=8, location=(0, 0, 0.94))
    belt = bpy.context.object
    belt.name = f'{spec["id"]}-fibre-belt'
    belt.data.materials.append(cloth)
    belt.parent = rig


def export_character(spec):
    reset_scene()
    human = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=False,
        extra_vertex_groups=True,
        feet_on_ground=True,
        scale=0.1,
        macro_detail_dict=spec["macro"],
    )
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

    attachments = [
        ("eyes", "low-poly.mhclo", "Eyes"),
        ("eyebrows", "eyebrow001.mhclo", "Eyebrows"),
        ("eyelashes", "eyelashes01.mhclo", "Eyelashes"),
        ("teeth", "teeth_base.mhclo", "Teeth"),
        ("tongue", "tongue01.mhclo", "Tongue"),
        ("hair", spec["hair_asset"], "Hair"),
    ]
    for subdir, filename, asset_type in attachments:
        path = AssetService.find_asset_absolute_path(filename, asset_subdir=subdir)
        if not path:
            print(f"MISSING {subdir}/{filename}")
            continue
        HumanService.add_mhclo_asset(
            path, human, asset_type=asset_type, subdiv_levels=0,
            material_type="GAMEENGINE", set_up_rigging=True)

    add_period_clothing(spec, human, rig)

    # Keep the editable MPFB scene as the source of truth for later sculpting.
    blend_path = os.path.join(SOURCE_OUT, f'{spec["id"]}.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = rig
    glb_path = os.path.join(OUT, f'{spec["id"]}.glb')
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_skins=True,
        export_animations=False,
        export_morph=True,
        export_yup=True,
    )
    print(f"WROTE {glb_path}")


for character in CHARACTERS:
    export_character(character)
