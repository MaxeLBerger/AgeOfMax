# Castle-v2 candidate

Editable source: `candidate.blend`.
Render target: `candidate.png`, 1600 × 900 RGBA.
Measured source/layout/geometry proofs: `metrics.json`.
Design and reproduction: `docs/CASTLE_ART_REVIEW.md`.
Standalone authoring: `tools/blender/refine_castle.py`.

The compact hill fortress combines an octagonal open bastion, a rectangular
roofed keep, a round tower with timber hoarding, a timber-framed great hall,
and a recessed gatehouse. Six genuinely wide wall walks and two stair flights
connect the fortress; the vaulted gate is open in geometry and reached by a
supported timber bridge. Arrow slits penetrate the masonry. The highest point
starts at y=117.16 and the lowest ends at y=407.67 in the 1280 × 720 game view.
The camera and terrain are hash-checked and unchanged.

Exact originals are preserved as `original-background-castle.blend` and `.png`.
New geometry is in `CAS_Architecture`, original architecture render-hidden in
`CAS_SourceArchive`. This authoring pass writes only inside the candidate tree.
The parent task reviewed and accepted the real game HUD image at
`art/qa/visual-castle-candidate.jpg`. The first automatic execution review rejected
the integration before process start. After independently checking all exact
hashes and backups, a renewed regular review approved root's two-file integration.
The canonical source and runtime PNG now match this reviewed candidate exactly.
`integration-review.json` preserves the historical rejection; `promotion.json`
records its resolution, the unchanged other four background pairs and the passed
canonical reexport under `canonical-export-validation/`.

The regular-exporter audit is `tools/blender/audit_castle_export.py`; it reads
an input and exports only an isolated copy. After its render,
`tools/blender/verify_castle_candidate.py` checks original/backup identity and
quantifies pixel differences. Results appear under `export-validation/` and in
`publication-evidence.json`.
