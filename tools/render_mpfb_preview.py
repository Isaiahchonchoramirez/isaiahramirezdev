"""Render the currently open MPFB .blend for quick visual QA."""

import os
import sys

import bpy
from mathutils import Vector


def look_at(obj, point):
    obj.rotation_euler = ((Vector(point) - obj.location).to_track_quat("-Z", "Y")).to_euler()


args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
output = args[0] if args else "/tmp/mpfb-preview.png"

for obj in list(bpy.data.objects):
    if obj.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(obj, do_unlink=True)

world = bpy.context.scene.world or bpy.data.worlds.new("Preview World")
bpy.context.scene.world = world
world.color = (0.025, 0.022, 0.02)

camera_data = bpy.data.cameras.new("Preview Camera")
camera = bpy.data.objects.new("Preview Camera", camera_data)
bpy.context.scene.collection.objects.link(camera)
camera.location = (0, -4.1, 1.02)
camera.data.lens = 58
look_at(camera, (0, 0, 0.88))
bpy.context.scene.camera = camera

for name, location, energy, size, color in [
    ("Key", (-2.4, -2.8, 3.3), 1150, 2.4, (1.0, 0.78, 0.58)),
    ("Fill", (2.5, -1.8, 2.0), 750, 2.2, (0.58, 0.72, 1.0)),
    ("Rim", (0.4, 2.0, 2.8), 1000, 1.8, (1.0, 0.88, 0.68)),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.color = energy, "DISK", size, color
    light = bpy.data.objects.new(name, data)
    light.location = location
    look_at(light, (0, 0, 1.0))
    bpy.context.scene.collection.objects.link(light)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 800
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.abspath(output)
scene.render.film_transparent = False
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print(f"WROTE {scene.render.filepath}")
