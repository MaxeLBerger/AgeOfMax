# Maschinenstudie: Kanone und Panzer

Vier isolierte Blenderquellen und vier RGBA-Sheets mit 4096 × 256 Pixeln, jeweils acht Fahr- und acht Angriffsframes. Die archivierten SHA256-Werte bestätigen unveränderte Spiel- und kanonische Dateien. Keine Skills, Spielregeländerungen oder Laufzeitintegration. Ballista und Mech gehören zum getrennten nächsten Batch.

## Gemessene Bewegung

| Typ | Mechanischer Zyklus | Strecke bei Scale 0,51 | Dauer bei bestehendem Tempo |
|---|---|---:|---:|
| Kanone | 180° um die Y-Achse; Radradius 0,35 | 36,826784 px | 1473,071368 ms bei 25 px/s |
| Panzer | 90° der Laufräder mit Radius 0,225 entsprechen drei Schuhabständen | 10,047838 px | 324,123801 ms bei 31 px/s |

Die Strecken verwenden die Kameraprojektion der tatsächlichen Fahrzeug-X-Rollachse. Die Kanone schließt durch die gemeinsame Symmetrie ihrer 20-seitigen Radscheiben, 32er-Ringe und sechs Speichen. Acht Schritte von je 22,5° vermeiden die Rückwärtsalias-Wirkung einer vollen 360°/8-Schleife.

Die 88 vorhandenen Panzer-Kettenschuhe liegen nun gleichabständig auf einer geschlossenen Kapselbahn. Zuvor lagen benachbarte Zentren zwischen 0,04786 und 0,48943 Welteinheiten auseinander. Der neue Schuhabstand beträgt 0,117809721, der Umfang 5,183627741 und der Kurvenradius 0,325697473 Welteinheiten. Die X-Ausdehnung bleibt erhalten; obere und untere Gliedzentrumgrenze ändern sich um jeweils etwa 0,0157 Welteinheiten. Die Meshes, Materialzuweisungen und Waffenmodelle bleiben erhalten.

Beide Rohre erhalten eigene Richt- und Rücklaufbewegungen. Kontakt liegt auf Sprite 12 nach 160 ms, der größte Rücklauf auf Sprite 13. Die ungerenderte lokale Actionframe 8 schließt die Erholung nach 320 ms ab. Fahrgestell und abgestellte Räder/Ketten bleiben fest. Der geerbte separate Breeze-Zeitverlauf am Kanonenwimpel ist auf die gespeicherte Ausgangsfalte fixiert; alle Shape-Key-Geometrien bleiben erhalten.

## Prüfungen

- Vier Quellen erneut geöffnet; beide Actionmappings mit jeweils 257 Zeitpunkten geprüft. Je 26 Kanonen- beziehungsweise 131 Panzer-Meshes behalten Topologie, Materialien und Bindungen.
- Tatsächlich gemessene Radwinkel: 179,99999785° und 90,00000099°. Größter Phasenfehler unter 5,4e−7 Radiant. Die Kettenstandstücke haben nach Gegenrechnung der Vorwärtsbewegung höchstens 6,1e−8 Welteinheiten Restdrift.
- Geometrische Schleifenlücke unter 3,5e−7, Recovery unter 2e−7 Welteinheiten. Fahrgestelltranslation und Angriffsbasisdrift: null.
- Feste Mündungsflächen: 20 von 120 ausgewerteten Vertices bei der Kanone, vier von 56 beim Panzer. Die ursprünglichen BEVEL-Modifikatoren bleiben erhalten. Beide Teams besitzen dieselben 16 Marker; maximaler Zwischenzeitfehler 0,000031 rohe Bildpixel.
- Alle 64 Hauptbilder sind dem jeweiligen Blender-Quellhash zugeordnet, mit je acht unterschiedlichen Fahr- und Angriffsframes. Zusätzlich acht Loop-/Recoverybilder. Transparenz und Bildränder geprüft.
- Eigene Browserinstanz: alle acht Fahrframes, jeweils zwei Kanonen- und zwölf Panzerloops, pixelgenaue Pause, Kontaktframe 12 per Tastatur, gemessener 4×-Zeitfaktor 3,9858; keine Browserfehler. Dies ist eine Animationsprüfung, keine gespielte Partie.

## Sichtprüfung und Grenzen

Die Fahr-/Kontaktbilder und vergrößerten Mechanikfolgen wurden angesehen. Teamfarben, Proportionen, Speichen und Ketten bleiben lesbar. Der Hauptagent übernimmt die unabhängige Sichtentscheidung im echten Spiel-HUD und die vollständige Migration aller 20 Typen.

Gleichartige Speichen und Schuhe schließen durch Teilpermutation. Die Silhouetten von lokal Frame 8 und 0 sind pixelgenau gleich. Geringe prozedurale Holz-/Nabentexturunterschiede bleiben erhalten: maximal 0,869 von 255 mittlere RGB-Stufen auf sichtbaren Pixeln. Die tatsächliche Bildänderung von Frame 7 auf 0 liegt im Bereich der inneren Schritte: Kanone 4,99 gegenüber 4,32–5,18; Panzer 1,67 gegenüber 1,53–1,68. Eine zuvor gemessene zusätzliche Panzer-Shadingkante zwischen Fahr- und Angriffsanfang wurde durch identische Rad-Transformauswertung behoben. Kein Recoverybild besitzt Pixel mit RGB-Abweichung über 12.

Die vorberechneten Angriffe beginnen mit Fahrphase 0. Der Wechsel aus einer beliebigen abrupt gestoppten Fahrphase bleibt eine Integrationsfrage. Acht Samples erzeugen weiterhin sichtbare Quantisierung. Diese Studie allein erfüllt weder AAA-Qualität noch den Gesamtspielauftrag.

## Dateien und Reproduktion

- [Interaktive Prüfung](review.html): Tempo, Wegstrecke, Mündungsanker, Pause und einzelne Frames.
- [Mechanikphasen](mechanism-steps.jpg), [Browserkontakt](browser-contact-review.jpg) sowie Kontaktbogen je Unitverzeichnis.
- `batch-manifest.json`: vier Quell- und vier Sheethashes, insgesamt 3.423.231 Bytes.
- `source-audit.json`, `render-check.json`, `playback-check.json`: vollständige Messungen.
- `gait-metadata.partial.json` enthält ausdrücklich nur cannon und tank; vor dem strikten Laufzeitvertrag auf 20 IDs vervollständigen. `weapon-sockets.json` enthält zweimal 16 Punkte.

Die sechs neuen Werkzeuge liegen unter `tools/blender`: `inspect_machine_animation_study.py`, `build_machine_animation_study.py`, `audit_machine_animation_study.py`, `render_machine_animation_study.py`, `review_machine_animation_study.py` und `check_machine_animation_playback.cjs`.

Blender mit `--python-exit-code 1` ausführen; Scriptargumente erst hinter dem Trenner `--`. Aufbau und Audit benötigen keinen GPU-Render. Den Render mit anderen Agenten abstimmen; `--closures` erzeugt die separaten Abschlussbilder. Den Python-Bildprüfer mit `.conda/python.exe` ausführen. Die Browserprüfung verwendet den bestehenden Dev-Server auf Port 5190. Quellen, Blenderdateien und Renderziele werden atomar ersetzt.
