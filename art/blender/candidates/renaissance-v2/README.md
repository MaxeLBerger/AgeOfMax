# Renaissance architecture candidate v2

This directory is an isolated review candidate. It does not replace the canonical
`art/blender/background-renaissance.blend` or the runtime PNG.

- `candidate.blend`: full scene, saved with camera and terrain unchanged.
- `candidate.png`: 1600 × 900 Cycles/OptiX preview, 32 samples with denoising.
- `metrics.json`: source hash, camera matrices, terrain digest, projected bounds,
  per-terrace soil samples, and relocated pine groups.
- `geometry-validation.json`: measured façade and loggia opening checks.

The review brief is `docs/RENAISSANCE_ART_REVIEW.md`. The source builder is
`tools/blender/refine_renaissance.py`, a standalone bpy script. It requires only
Blender and the existing source scene; it does not call the original generator.

Run from the repository root with Blender 4.5:

```powershell
& 'downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe' --disable-autoexec -b --python 'tools/blender/refine_renaissance.py' -- --source 'art/blender/candidates/renaissance-v2/original-background-renaissance.blend' --outdir 'art/blender/candidates/renaissance-v2' --render --samples 32
```

To render the saved candidate again without rebuilding its geometry:

```powershell
& 'downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe' --disable-autoexec -b --python 'tools/blender/refine_renaissance.py' -- --outdir 'art/blender/candidates/renaissance-v2' --render-only --samples 64
```

Original architecture is retained, render-hidden, in `REN_SourceArchive`. New
geometry is under `REN_Architecture`; six named root groups contain the observatory,
west loggia, civic palazzo, workshop, and two east houses. The observatory drum is
built from eight genuinely perforated facets. Roof courses, dome ribs, window
reveals, quoin stones, pediment and sundial are geometry.

The terrain's vertices, polygon indices, material assignments and object matrix
are hashed before and after the build. Camera matrix, projection and resolution
are compared exactly. Building platforms use existing terrain raycasts; the
source terrain is not edited. The candidate changes selected pine placements,
light intensity and softness and the depth gradient of the existing fog only within
this saved scene.

The bare preview has been reviewed at 1280 × 720. Its skyline remains below the
HUD: the observatory starts at y=156.86; the lane at y=500 remains unobstructed.
The parent task performs the final comparison with the actual game HUD before
any publication. This bounded architecture pass improves the former cylinder and
repeated roofs; it does not by itself establish AAA quality for the whole game.
