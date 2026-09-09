# Modern-v2 candidate

Reviewed standalone image: `candidate.png`, 1600 × 900 RGBA.
Editable scene: `candidate.blend`.
Authoring source: `tools/blender/refine_modern.py`, standalone bpy.
Design, source measurements, caveats and reproduction commands:
`docs/MODERN_ART_REVIEW.md`.

The candidate contains three deliberately different industrial building types:
a sawtooth-roof machine works, a framed control office with a stepped service core,
and a loading hall with a shallow barrel roof. The reviewed final scene and PNG have been atomically copied into their canonical/public paths.
Their exact predecessors are archived here as `original-background-modern.blend`
and `original-background-modern.png`. New geometry is in `MOD_Architecture`; old
architecture remains render-hidden in `MOD_SourceArchive`.

`metrics.json` records matching camera/terrain hashes, source/public hashes,
projected bounds, terrain-raycast terrace heights, glazing ray hits, and distinct
physical material properties. The image was rendered by opening the saved
candidate scene, with Cycles/OptiX and 32 samples. No external models or skills.

The actual game HUD review passed after the concrete retaining wall and shared
service court revision. `promotion.json` records the two-file replacement and
unchanged hashes of the other four backgrounds. `canonical-export-validation`
contains a passing normal-exporter check from the final canonical source.
The authoring script itself writes only to this candidate folder.
