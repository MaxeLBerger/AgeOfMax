# Future citadel candidate

This is an isolated architectural revision of the existing editable valley scene.
The original source and image are preserved under `baseline/`. No canonical or
public file has been changed by this candidate workflow.

The nine repeated obelisks and oversized cropped ring were replaced by a terraced
citadel. Its smaller ring has twelve separate shell sectors, a recessed aperture
seam, compression joints, servicing cassettes, diagonal supports and a lower
cradle. Stepped habitation buildings, open mechanical power crowns and faceted
observatories form three distinct building families. Recessed hall bays, service
bridges, rooftop radiators, occupied rooms and a central stair supply architectural
depth. All features are real editable Blender geometry.

`background-future.blend` is the staged source. `future.png` is its full 1600×900
Cycles/OptiX render at 64 samples. `before-after.jpg` is a labelled review sheet.

The checked contracts are recorded in `source-check.json`,
`reproduction-check.json` and `render-check.json`:

- All 463 retained environment objects, including the camera and terrain, retain
  their geometry/transform hashes. All 14 retained environment materials and all
  three existing lights are unchanged after reopening the saved scene.
- The ring begins at native y123.64 / runtime y98.91, below the HUD edge y82.
  All 326 new architectural objects end by native y509.25 / runtime y407.40,
  above the combat band y410–525.
- The regular `export_scenes.py` background exporter was run against the isolated
  staged source and wrote `reproduction/backgrounds/future.png`. It preserved every
  new architectural object. Only 237 of 1,440,000 pixels differ from the candidate,
  each by one channel value.
- Terrain and lane geometry are unchanged. Pixels are not promised identical:
  changed building shadows and independent Cycles sampling yield mean absolute
  RGB differences of approximately 0.96 / 0.99 / 0.81 in the combat band.
- Rebuilding twice from the immutable stage baseline yields 326 architectural
  objects each time; the script does not accumulate duplicate geometry.

Reproduce from the repository root (Windows PowerShell):

```powershell
& './downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe' -b --python-exit-code 1 --python tools/blender/refine_future.py -- --samples 64
& './downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe' -b --python-exit-code 1 --python tools/blender/audit_future.py
& './.conda/python.exe' tools/blender/review_future.py
```

The terrain, vegetation and broad lighting remain the existing stylized valley.
This candidate improves skyline, construction and composition; it does not
establish AAA visual quality. Final HUD composition must be reviewed in the game
before the source and image are promoted together.

## Publication and canonical validation

Following the supervising task's review in the game HUD, the corrected candidate
was published locally as the canonical Future Blender source and public PNG.
`promotion.json` records original/backup equality, the exact two replacement
hashes, and unchanged hashes for the other four backgrounds. The candidate-only
statements above describe its initial review stage.

The subsequent regular export from the published canonical scene is under
`canonical-export-validation/`. Its source validation preserves all 326 new and
463 existing objects, 14 existing environment materials and three lights. Its
render differs from the published image in 246 of 1,440,000 pixels, each by one
RGB channel value. Use `audit_future.py -- --canonical` with Blender, then
`review_future.py --canonical` with Python to repeat that isolated check.