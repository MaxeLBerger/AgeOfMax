# Schützenfamilie: isolierte 16-Frame-Studie

Vier Kandidaten für `rifleman`, `rifleman-enemy`, `sniper` und `sniper-enemy`.
Der Produktionsstand wird durch diese Werkzeuge nicht geändert. Der Hauptagent
entscheidet nach Bild-/Bewegungsprüfung über die nächsten Familien; dies ist
noch keine Migration aller 40 Sheets und kein Nachweis für ein erreichtes AAA-Ziel.

Jede Figur besitzt eine editierbare Blenderquelle, 16 echte 256×256-Renders,
ein RGBA-Sheet mit 4096×256 Pixeln, 16 projizierte Waffenpunkte und einen Vergleich
mit dem archivierten 8-Frame-Stand. `review.html` zeigt vier lokale WebM-Vergleiche.
Jedes Video hält drei Gangzyklen à 520 ms und drei Angriffe à 320 ms auf derselben
Zeitachse; Kontakt nach 160 ms. 504 Videoframes bei 200 fps geben die 65-ms-Holds
exakt wieder. Das sind 16 echte Blender-Posen, keine 504 unterschiedlichen Posen.

## Tatsächliche Bewegungsarbeit

Der Rifleman erhält die bislang fehlenden fünf Hand-/Fuß-/Waffensteuerungen.
Beide Waffenhände folgen festen Griffpunkten der tatsächlich bewegten Waffe;
Sohlen bleiben flach. Die gesamte Waffe wird schulterhoch geführt, mit eigener
Vorbereitung, Rückstoß erst am Kontakt und Rückkehr in die Ganghaltung.

Die Sniper-v2-Geometrie, Meshbindungen, Bones, Kapuze, Zielfernrohr und lange Waffe
bleiben erhalten. Der tiefere Oberkörper beim Angriff stammt aus der überarbeiteten
v2-Pose. Beide Schützen richten während der Zielphase den ganzen Kopf zur realen
Visierachse; es wird weder ein einzelner Augenmesh noch nur der Runtime-Marker
verschoben. Beim Sniper liegt der Augenpunkt 0,105 Blender-Einheiten hinter der
Okularmitte. Die Handbindungen gelten auch während des Rückstoßes.

Die Sniper-Angriffsfüße verwenden jetzt die beiden Standpunkte der Gangphase 0.
Damit bleibt die tiefe Schusshaltung erhalten, mit engerem Stand als zuvor und
einer geometrisch geschlossenen Rückkehr. Diese sichtbare Poseentscheidung ist
Teil des Reviews. Der Endschlüssel jeder Action ist ungerendert und schließt
Gang beziehungsweise Erholung ohne Sprung an Gangphase 0 an.

Jede Action enthält dicht gebackene Quaternion-/Positionsschlüssel. Der Gang
besitzt zusätzliche Schlüssel genau an den Stand-/Schwungwechseln bei Phase 0,1
und 0,6. Diese verhindern, dass eine lineare Zwischenpose noch über den bereits
begonnenen Fußhub interpoliert. Beide Clip-Actions werden getrennt gespeichert;
ein Auswerten der alten durchgehenden 8-Frame-Action wäre nicht gleichwertig.

## Wiederholung

Alle Befehle vom Projektverzeichnis aus. Kein Befehl benötigt einen Skill.

```powershell
$blender = './downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe'
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/inspect_ranged_study.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/build_ranged_animation_study.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_ranged_animation_study.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/catalog_animation_gaits.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/measure_ranged_gait_motion.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/render_ranged_animation_study.py
& './.conda/python.exe' tools/blender/review_ranged_animation_study.py
& 'C:/Program Files/nodejs/node.exe' tools/blender/check_ranged_animation_playback.cjs
```

Der Aufbau beginnt immer mit der archivierten Originalquelle des jeweiligen
Teams. Dadurch werden neue Steuerungen beim Wiederholen nicht dupliziert.
Originale werden nur einmal archiviert, Produktionsdateien werden vor/nach dem
Aufbau und erneut beim Review per SHA-256 verglichen.

## Nachweise und Grenzen

- `source-inspection.json`: tatsächliche ursprüngliche Rig-/Mesh-/Materialdaten.
- Je Figur `model-check.json`: erhaltene Mesh-/Materialverträge, Actions, Herkunft
  und alle 16 Waffenkoordinaten. Sniper prüft zusätzlich identische ursprüngliche
  Gewichtsgruppen und Bone-Geometrie.
- `source-audit.json`: erneut geöffnete Quellen; 129 Auswertungen je Clip,
  Sohlenkontakt, beide Hände, tatsächlicher Waffenoberflächenabstand, Augenpunkt,
  Waffenanker, Schleifenabschluss und Erholung.
- `gait-motion-evidence.json`: dichtere Auswertung bei nominaler und halber
  Bewegung sowie Stillstand, inklusive Gegenbeispiel der festen Zeitphase.
- `render-check.json`: vier Sheets, tatsächlich acht unterschiedliche Gang- und
  acht Angriffsframes je Figur, Alpha-/Bildrandprüfung und unveränderte Produktion.
- Je Figur `video-check.json` und gemeinsam `playback-check.json`: echte
  Decodierung, identische Dauer und erfolgreicher Browser-Loop aller vier Videos.

Die kontinuierliche 3D-Schrittbahn gleicht nominalen Vortrieb aus. Acht gerenderte
Gangbilder bleiben jedoch diskrete Bilder: Beim Rifleman beträgt die nominale
Bewegung je Bildhaltezeit 2,86 Spielpixel, beim Sniper 2,34 Pixel. Formationsbremsung
benötigt den streckenbasierten Vertrag in `../GAIT_CONTRACT.md`. Ein abruptes
Anhalten mit angehobenem Fuß braucht zusätzlich eine geprüfte Standtransition;
allein mehr Frames lösen diese Laufzeitfrage nicht. Die Studie enthält noch
keine Änderung an Spielsimulation, Boot, UI oder Produktion.
