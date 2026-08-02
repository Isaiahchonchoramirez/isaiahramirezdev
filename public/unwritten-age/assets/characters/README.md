# Unwritten Age character sources

These bodies are generated with MPFB 2.x in Blender from MakeHuman's CC0
basemesh and targets. Each character has two files:

- `.glb` is the game-ready export consumed by Three.js.

Editable `.blend` sources live in `art/characters/` so they are versioned but
are not copied into the deployed website.

Regenerate them with:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/generate_mpfb_characters.py
```

The generator deliberately does not label morphology as a binary restriction.
Its three starting points are presets; future Game Master controls may blend or
replace them freely.
