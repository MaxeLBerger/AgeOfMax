# Zweiter Schützenbatch: Muskete, Laser und Plasma

Sechs isolierte 16-Frame-Kandidaten für `musketeer`, `laser-soldier` und
`plasma-trooper`, jeweils Spieler und Gegner. Der Hauptagent hat die frühe
Vier-Posen-Vorschau auf Silhouette, Abstützung und Zielhaltung geprüft.
Produktion und Runtime bleiben unverändert.

Die Quelleninspektion belegt für alle drei Typen dasselbe ursprüngliche
11-Bone-Grundskelett und dieselben Hand-/Sohlenmaße. Deshalb werden die geprüften
Fuß-/Hand-/Waffensteuerungen aus Batch 1 wiederverwendet. Meshgeometrie, Materialien
und Ausrüstung bleiben erhalten. Alle Waffenbauteile folgen dem neuen Waffenbone;
die Plasmavorräte bleiben an der Wirbelsäule.

Die Bewegung wurde je Mechanismus ausgearbeitet:

- Musketier: längerer Lauf, vorderer Stützgriff, höherer Schulteranschlag und
  deutliches Nachschwingen nach dem Schuss. Ein vollständiger historischer
  Ladevorgang wird innerhalb der 320-ms-Kampfanimation nicht behauptet.
- Lasersoldat: ruhige Ausrichtung mit nur geringer Bewegung nach der Freigabe;
  drei erhaltene Leuchtschienen folgen starr der Waffe.
- Plasmatrupp: stärkere Abstützung, schwerere Kammer und ausgeprägterer Rückstoß;
  Beschleunigungsspulen und Behälter bleiben geometrisch unterscheidbar.

Diese drei Quellen besitzen keine optischen Zielfernrohre. Die ganze Kopfhaltung
richtet sich deshalb an der tatsächlichen Lauf-/Gehäuseoberkante aus. Die Augen
werden nicht unabhängig vom Kopf verschoben. Beide Handgriffe bleiben auch beim
Rückstoß an den gemessenen Punkten der Waffe.

Die breite Plasma-Mündung machte einen zusätzlichen Quellenvertrag nötig:
`runtime_weapon_mesh` benennt `Plasma acceleration coil.002`, und
`runtime_weapon_vertex_indices` speichert die feste, aus der Restgeometrie
gemessene Frontfläche. Der Exporter mittelt genau diese deformierten Worldvertices.
Eine neue Extrem-X-Auswahl je Pose hatte zuvor sichtbare geometrische Sprünge
verursacht. Die feste Frontfläche erhält denselben Punkt auf derselben Waffe;
sie ist kein frei gesetzter Bildschirmanker. Der Exporter prüft dafür eindeutige
gültige Indizes und unveränderte Vertexanzahl zwischen Original und Auswertung.

Die Actions und Samples entsprechen dem gemeinsam geprüften Layout 3:
Gang 0–7, Angriff 8–15, Kontakt 12 nach 160 ms; 520 ms nominaler Gang und 320 ms
Angriff. 67 Gangkeys enthalten die exakten Fußwechsel, 65 Angriffkeys den Ablauf.
Ein zusätzlicher ungerenderter Endkey schließt jeweils an die Grundpose an.
Gait-Metadaten und Formationsbremsung richten sich nach `../GAIT_CONTRACT.md`.

```powershell
$blender = './downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe'
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/inspect_shooter_family.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/build_shooter_family.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_shooter_family.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/measure_shooter_gait_motion.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/render_shooter_family.py
& './.conda/python.exe' tools/blender/review_shooter_family.py
& 'C:/Program Files/nodejs/node.exe' tools/blender/check_shooter_playback.cjs
```

`source-audit.json` prüft echte unterschiedliche Bone-Posen zusätzlich zur
PNG-Vielfalt, beide Griffe, Augenlinie, Sohlen, Loop-/Erholungsabschluss und alle
Waffenpunkte. `gait-motion-evidence.json` prüft den Weltbildkontakt bei vollem,
halben und angehaltenem Vortrieb. `render-check.json`, `video-check.json` und
`playback-check.json` dokumentieren Bildgröße, Bildränder, exakte Zeitachse und
Browserwiedergabe. Die Frontflächenkorrektur des Plasma-Ankers muss im finalen
`source-audit.json` grün sein; ein früher fehlgeschlagener Log ist kein Abschluss.

`review.html` und die sechs Kontaktbögen vergleichen Original und Studie bei
gleicher Zeitdauer. Diskrete Gangbilder verursachen weiterhin begrenzte
Abtastschritte. Abrupte Stand-/Angriffseinstiege benötigen eine gesonderte
Laufzeitprüfung. Dieser Batch belegt weder die übrigen Familien noch ein bereits
erreichtes AAA-Ziel.
