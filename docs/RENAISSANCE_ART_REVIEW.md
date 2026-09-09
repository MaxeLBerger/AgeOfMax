# Renaissance-Schlachtfeld: Geometrie und Bildaufbau

Stand: 9. September 2026. Dies ist ein umsetzbarer Entwurf für **nur das Renaissance-Schlachtfeld**. Die bestehende `.blend`-Datei wurde mit Blender 4.5.13 im Hintergrund geöffnet und ausgelesen; es wurde weder gerendert noch eine Szene oder ein Laufzeitbild verändert. Die Bewertung basiert auf der tatsächlichen Quelle, dem 1600 × 900-PNG und der Renaissance-Partie in 1280 × 720.

Die neue Fassung soll eine gewachsene Handelsrepublik mit einer erkennbaren Sternwarte zeigen. Eine breite, gegliederte Baugruppe ersetzt den glatten Zylinder; wenige unterschiedliche Gebäudefamilien ersetzen die gleichförmige Reihe spitzer Türme. Die ruhige Kampffläche und das gemeinsame Tal der fünf Epochen bleiben erhalten. Der Entwurf ist eine konkrete Qualitätssteigerung; seine Umsetzung allein wäre noch kein Nachweis von AAA-Qualität.

## Verbindliche Quellen und Messmethode

- Geometrie: `art/blender/background-renaissance.blend`.
- Laufzeitbild: `public/assets/reborn/backgrounds/renaissance.png`.
- Prüfung im Spiel: `art/qa/manual-final-renaissance.png`.
- Export: `tools/blender/export_scenes.py`; der ursprüngliche vollständige Geometriegenerator wurde laut `docs/BLENDER_ART.md` beschädigt. Die gespeicherte Szene ist deshalb die verbindliche Ausgangsquelle.

Objektgrenzen wurden mit `world_to_camera_view(scene, scene.camera, matrix_world @ corner)` auf die Laufzeitgröße projiziert. Die unten angegebenen Grenzen sind projizierte Bounding Boxes, keine Aussage über Sichtbarkeit durch vorgelagerte Geometrie. Meshzahlen sind die gespeicherte Basisgeometrie vor Modifier-Auswertung. Neue Maße und Positionen sind Entwurfswerte und ausdrücklich noch nicht gerendert.

## Unveränderliche Laufzeitfläche

| Vertrag | Maß und Konsequenz |
|---|---|
| Hintergrundexport | 1600 × 900, bisheriger Dateiname und Texturschlüssel `renaissance-bg` bleiben bestehen. Phaser zeigt das Bild vollständig auf 1280 × 720; Faktor 0,8. |
| Oberer HUD | y = 0–82. Kein bedeutender Bauabschluss oder Blickfang gehört dahinter. Mindestabstand des neuen Wahrzeichens zum HUD: 50 px. |
| Unterer HUD | y = 552–720. Hier keine notwendige Gestaltung verstecken. |
| Kampflinie | Mittelpunkt y = 500, Reihen bei 493 / 500 / 507. Der Bodenanker bleibt erhalten. |
| Vorderer Spielbereich | y = 410–525 ruhig halten. Keine neuen kontrastreichen Mauerkanten, Fensterreihen oder Dekorationsmasten hinter Köpfen und Waffen. |
| Festungen / Bauplätze | Eigene Basis bei x = 100, gegnerische bei 1180; drei Bauplätze bei x = 55 / 145 / 235, y = 521. Neue zentrale Architektur bleibt überwiegend in x = 270–1030. |
| Kamera | `Battle valley / fixed horizon`: orthografisch, Ort `(0, -70, 12.85)`, Rotation XYZ `(82.4322°, 0°, 0°)`, Ortho Scale 32.0. Sie wird nicht verändert. |

Für diese Kamera gilt näherungsweise: **Bild-x = 640 + 40 × Welt-x; Bild-y = 500,76 − 5,268 × Welt-y − 39,652 × Welt-z**. Eine Blender-Einheit entspricht horizontal 40 Laufzeitpixeln, vertikal entlang Z etwa 39,65 Pixeln. `(0, 0, 0)` liegt gemessen bei `(640, 500,76)`. Die Spurflächen von `Sculpted continuous valley` verwenden `Trail dust`; ihre Welt-Y-Grenzen sind −3,25 bis +2,60. Diese Flächen und ihre Vertices werden nicht ummodelliert.

## Was die Quelle tatsächlich enthält

Die Szene enthält 526 Objekte, 269.657 Mesh-Vertices und 241.312 Polygone. Alle Objekte befinden sich derzeit in einer einzigen Collection. Die hohe Gesamtzahl entsteht überwiegend durch Vegetation und verstreute Steine; sie bedeutet keine ausgearbeitete Architektur.

| Bestehende Quelle | Gemessener Befund | Sichtbare Folge |
|---|---|---|
| `Observatory drum` | Ort `(1, 20, 3.4)`, Maße `2.8 × 2.8 × 6.8`; 48 Vertices / 26 Flächen, Bevel und Weighted Normal. Bildschirmbox x 624–736, y 118,4–402,8. | Rund 284 px hohe, weitgehend ungegliederte Fassade dominiert das Bild. |
| `Copper observatory dome` | Ort `(1, 20, 6.8)`, Maße `3.2 × 3.2 × 2.4`; Bildschirmbox x 616–744, y 69,8–181,8. Material ist tatsächlich `Faction woven cloth and enamel`, Metallic 0. | Kuppel liegt teilweise hinter dem HUD und wirkt wie eine einfarbige Kappe statt gebautem Metall. |
| `Observatory spire` | Ort `(1, 20, 8.2)`, Höhe 1,6; Bildschirmbox y 38,3–102,3. | Der größte Teil verschwindet hinter dem HUD. |
| `Old republic house` bis `.009` | Zehn Quader mit je 8 Vertices / 6 Flächen. Einheitliche Breite 1,4 und Tiefe 1,2; Höhen zyklisch 1,8 / 2,4 / 3,0 / 3,6. X-Schritte exakt 1,8 = 72 px. | Fast gleich breite, regelmäßig gesetzte Wohntürme ohne klaren Straßen- oder Hofraum. |
| `Terracotta gable` bis `.009` | Zehn gleiche Dächer, jeweils 6 Vertices / 4 Flächen, Maße `1.7 × 1.5 × 1.0`. | Wiederholte identische Spitzsilhouetten, kaum Dachkonstruktion. |
| `Inset window` bis `.039` | Vier Fenster pro Haus unabhängig von dessen Höhe. Je `0.28 × 0.04 × 0.4`, rund 11 × 16 px. | Schwarze Flächen ohne Leibung, Rahmen oder geschossbezogene Anordnung. Der erste Fensterkörper liegt bei y 17,38 vor der Hausfront y 17,4; es ist keine ausgearbeitete Wandöffnung. |
| Vegetation | 71 Gruppen aus `Tapered pine trunk`, `Individually sculpted evergreen boughs`, `Soft conifer crown`; sechs Eschen mit je acht Ästen/Kronenteilen; 135 `Trail edge stones`. | Wiederholte Tannen konkurrieren mit den ebenso regelmäßigen Dächern. |

**Bearbeitungsfalle:** Giebel und viele Ast-/Laubmeshes besitzen Objektort `(0, 0, 0)`, ihre Vertices liegen bereits in Weltpositionen. Gebäudegruppen dürfen daher nicht anhand von `object.location` zusammengefunden werden. Zuordnung über Namen plus ausgewertete Bounding Boxes; vor gemeinsamer Verschiebung einen neuen Parent am Gebäudeschwerpunkt erzeugen und Welttransformationen erhalten.

## Neue Architektur: konkrete Baugruppen

Die vorhandenen drei Sternwartenobjekte sowie die Familien `Old republic house`, `Terracotta gable` und `Inset window` werden in der nächsten Arbeitskopie aus der sichtbaren Fassung genommen und durch die nachstehenden benannten Gruppen ersetzt. Landschaft, Himmel und Festungssprites werden davon nicht erfasst. Separate Collections: `REN_Architecture`, `REN_Terraces`, `REN_Vegetation`, `REN_Atmosphere`.

| Neue Gruppe / Lage in Blender | Konkrete Modellierungsaufgabe für die nächste Fassung |
|---|---|
| `REN_Observatory`, Schwerpunkt `(3.1, 22, 0)`; Bildschirmmitte x 764 | Breiter Palazzo-Unterbau statt Hochzylinder. `REN_Obs_Platform`: Mittelpunkt `(3.1, 22, 0.25)`, Maße `5.4 × 3.6 × 0.5`. `REN_Obs_Palazzo`: Mittelpunkt `(3.1, 22, 1.6)`, Maße `4.6 × 3.0 × 2.2`. Ecksockel, umlaufendes Geschossgesims, drei sichtbare Hauptachsen mit tatsächlichen Fensterleibungen. |
| `REN_Obs_Drum` | Oktogonaler Tambour mit Radius 1,4, Höhe 0,9, Mittelpunkt z 3,15; Unterkante z 2,7, Oberkante z 3,6. Jede sichtbare Seite erhält eine Pilasterkante und ein schmales Bogenfenster. Die niedrige, facettierte Form trennt Unterbau und Kuppel. |
| `REN_Obs_Dome`, `REN_Obs_Lantern` | Kuppelradius 1,55, Basis z 3,6, Scheitel z 4,7. 12–16 echte Rippen, ausgebildeter Traufring und vier größere Metallpaneele je sichtbarem Viertel. Laterne bis z 5,2, kleine Spitze bis maximal z 5,55. Die Gesamtsilhouette soll ungefähr y 155–400 erreichen, mit mindestens 50 px Abstand zum HUD. Geometrie nach Projektion justieren, nicht die Kamera. |
| `REN_LoggiaWest`, Schwerpunkt `(-6.8, 19.2, 0)`; Breite 3,8, Tiefe 1,8, Wandhöhe 1,65 | Niedriges Marktgebäude mit vier echten offenen Rundbögen, jeweils etwa 0,65 breit und 1,15 hoch; massive Pfeiler statt aufgemalter schwarzer Bögen. Ein flaches Walmdach und ein seitlicher Anbau geben die waagerechte Gegensilhouette zur Sternwarte. |
| `REN_CivicPalazzo`, Schwerpunkt `(-3.9, 23, 0)`; Breite 4,8, Tiefe 2,6, Höhe 2,8 | Hinter der Loggia gestaffeltes Ratshaus. Zwei klar definierte Geschosse, rustizierter Sockel, breite Eingangstreppe, fünf Fensterachsen. Ein niedriger Giebel nur über der Mittelachse, sonst Walmdach. Keine weitere Turmkopie. |
| `REN_Workshop`, Schwerpunkt `(-0.7, 25.5, 0)`; Breite 2,0, Tiefe 1,6, Höhe 1,65 | Kleine Werkstatt im Abstand zwischen Ratshaus und Sternwarte: asymmetrisches Satteldach, ein Schornstein, angelehntes Vordach. Maximal zwei größere Requisiten, etwa Holzstapel und Fass; keine Mikroobjektstreuung. |
| `REN_EastHouseA/B`, Schwerpunkte `(7.0, 23.5, 0)` und `(8.8, 27, 0)` | Zwei niedrigere Häuser mit unterschiedlichen Breiten 2,6 / 1,8, Höhen 2,1 / 1,6 und Dachformen Walm / Pult. Sie bilden einen abfallenden östlichen Abschluss; keine weitere vertikale Landmarke. |

Die Plattformen müssen in das vorhandene Gelände gesetzt werden: Unterkanten zunächst per Raycast auf `Sculpted continuous valley` bestimmen. Niedrige, gestufte Stützmauern schließen Höhenunterschiede sichtbar; keine schwebenden Sockel und keine durchs Gras ragenden Türen. Eine geschwungene Zufahrt wird ausschließlich hinter der Kampffläche gebaut und darf nicht wie eine zweite begehbare Kampflinie wirken.

## Bauteile, die bei Spielgröße sichtbar bleiben

- Gesimse und Fensterrahmen 0,05–0,09 Einheiten stark: rund 2–4 px in der Laufzeit. Nicht flächendeckend subpixelige Rillen modellieren.
- Fensterleibungen 0,10–0,16 tief, Öffnungen geschossbezogen setzen. Vierseitiger Rahmen, echte rückgesetzte dunkle Innenfläche und einzelne Holzläden; vorhandene schwarze Quader nicht einfach tiefer in eine geschlossene Wand schieben.
- Sockel mit 0,20–0,28 hohen Quaderlagen und versetzten Fugen. Obergeschosse als ruhigere verputzte Flächen; mindestens ein vertikaler Rücksprung pro großer Fassade.
- Dachüberstand 0,10–0,16, sichtbare Traufbohle und Firstkappen. Dachziegel in 0,12–0,18 breiten Reihen zusammenhängend modellieren; zwei bis drei warm abgestufte Materialien, keine identische Zufallsnoise auf jedem Dach.
- Sternwarte als ziviles Wissenschaftsbauwerk lesbar machen: eine dezente Sonnenuhr am Unterbau und ein einzelnes 0,6–0,8 langes Messinstrument auf der Terrasse. Die Kuppel bleibt die Hauptform.

## Materialien und Licht

Vorhandene Materialien duplizieren und mit `REN_` benennen, damit spätere Wiederverwendung anderer Epochen nicht unbeabsichtigt verändert wird. Aktuell verwenden Kalkstein, Terrakotta und Fraktionsmaterial dieselbe Noise-Skala 7 und Bump-Distanz 0,09. Diese gemeinsame Oberflächenstruktur ersetzt keine konstruktiven Details.

| Neues Material | Konkreter Startwert und Einsatz |
|---|---|
| `REN_LimestoneCut` aus `Warm carved limestone` | Grundfarbe etwa `(0.54, 0.48, 0.36)`, Roughness 0,72, Metallic 0; Bump-Distanz 0,02–0,035 statt 0,09. Nur Sockel, Rahmen und Gesimse. Große Farbflecken deutlich zurücknehmen. |
| `REN_WarmPlaster` | Ruhiges warmes Hellbeige, Roughness 0,85, Bump-Distanz höchstens 0,012. Breite Wandflächen; wenige gröbere Alterungsspuren an Sockeln und unter Fensterbänken. |
| `REN_TerracottaA/B/C` | Gemeinsame Roughness 0,68–0,78; helle, mittlere und dunkle Rotbrauntöne in ganzen Ziegelstreifen. Dachkonstruktion gibt den Rhythmus, Materialvariation unterstützt ihn. |
| `REN_PatinatedCopper` | Eigene Kupfer-/Patinamaske, Grundton etwa `(0.075, 0.22, 0.18)`, Metallic 0,55–0,7, Roughness 0,4–0,55. Vom bisherigen Stoffmaterial der Kuppel trennen. Saum und Rippen mit gedämpften bronzenen Abriebkanten. |
| `REN_WindowRecess`, `REN_ShutterWood` | Rezess etwas heller als bisheriges Fastschwarz; Metallic 0, Roughness 0,8. Holzläden mit konstruktiv erkennbaren Brettern und Querleisten. Keine leuchtenden Fenster am Tag. |

Die Kamera, AgX, `AgX - Medium High Contrast` und Exposure −0,05 zunächst erhalten. Bestehende Lichtpositionen und Richtungen bleiben erhalten, damit die Lichtgeschichte des Tals konsistent bleibt. Erst nach der Geometrieprobe folgende Startwerte vergleichen:

| Licht / Atmosphäre | Bestand | Erster Vergleichswert |
|---|---|---|
| `Late golden sun` | Area bei `(-14, -12, 20)`, 1800 W, Size 12, Farbe `(1, .72, .42)` | 1500 W, Size 7: deutlicher lesbare Gesims- und Bogenverschattung, ohne die gesamte Szene zu überbelichten. |
| `Blue sky bounce` | Area bei `(12, 10, 14)`, 900 W, Size 18, Farbe `(.42, .72, 1)` | 650 W, Size 18: ruhige kühle Schatten, weniger flacher Aufheller. |
| `Sun shafts` | Sun 2,4, Angle 0,11; Rotation `(65°, -25°, -35°)` | Zunächst Energie beibehalten, Angle 0,07 testen. Schattenrichtung beibehalten. |
| `Atmosphere behind the battlefield` / `Valley air` | Volumen bei `(0, 28, 6)`, Ausmaß `100 × 38 × 16`; Density 0,017, Anisotropy 0,15 | Den gleichmäßigen Nebel nicht erhöhen. Hauptarchitektur klar halten; Dichte vor y 20 auf etwa 0,007–0,010 absenken und erst hinter y 30 auf 0,017–0,022 ansteigen lassen. Werte sind Rendervergleich, keine bereits bestätigte Verbesserung. |

Die 71 Tannen nicht pauschal entfernen. Nur die Gruppen, deren projizierte Kronen die neue Fassadensilhouette zerschneiden, in drei asymmetrische Gehölzgruppen umordnen: linker Hang, Lücke zwischen Ratshaus und Warte, östlicher Hang. Hauptfassaden und Straßenräume erhalten bewusst freie Ausschnitte. Fernberge bleiben kalt und kontrastarm; Architektur bekommt mittlere Kontraste, der spielbare Vordergrund die klarsten Kontakte.

## Umsetzung und Abnahme

1. Arbeitskopie der verbindlichen Szene erzeugen und Architektur in benannte Collections gruppieren. Source-Objekte über Namen/BBox prüfen; alte Familien nur in dieser Kopie ausblenden. Keine Änderungen an Kamera, Spur-Vertices oder anderen Epochen.
2. Zunächst nur die sechs neuen Baugruppen und die niedrige Sternwarte modellieren. Alle gruppierten Objektgrenzen per Kameraprojektion gegen die HUD- und Kampfzonen prüfen. Das braucht keinen GPU-Render.
3. Fenster, Arkaden, Sockel, Gesimse und Dächer ergänzen; anschließend Materialien und selektive Vegetationsabstände. Keine zusätzlichen Gebäudetypen außerhalb dieses Umfangs.
4. Erst nach Ende der parallel laufenden Figurenproduktion einen Vorschau-Render in einen separaten Staging-Pfad schreiben. Kamera unverändert; niemals eine halbfertige Vorschau unter dem öffentlichen Hintergrundnamen veröffentlichen.
5. Vergleich des bisherigen und neuen Bildes bei 1280 × 720 **mit bestehendem HUD, beiden Basen und einer Renaissance-Gruppe**. Außerdem bei 900 px Canvasbreite prüfen. Erst anschließend 1600 × 900 final rendern und atomisch veröffentlichen.

Abnahmekriterien: kein Teil der zentralen Landmarke hinter y 82; mindestens drei klar verschiedene Dach-/Bauformen statt zehn identischer Türme; Rundbögen und Fensterleibungen bei Spielgröße erkennbar; keine neue harte Hintergrundkante im Kopf-/Waffenbereich y 410–500; keine Änderung der Fußanker oder der Spur; alle Gebäude sitzen auf Gelände oder sichtbaren Terrassen; die Szene bleibt auch in Graustufen in Vordergrund, Republik und Fernberge gegliedert. Der endgültige Maßstab ist ein ruhigerer, glaubwürdigerer und besser lesbarer Ort im laufenden Spiel.