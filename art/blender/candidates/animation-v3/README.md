# Blender-Animationsstudie: 8 → 16 Frames

Diese Studie betrifft ausschließlich **Clubman und Knight, Spielerfassung**.
Kanonische Blender-Dateien, Public-Sheets, Laufzeitcode und Produktions-Waffensockets
bleiben unverändert. Die jeweiligen bisherigen Quellen und Sheets liegen unter
`clubman/baseline/` beziehungsweise `knight/baseline/`.

## Ergebnis und Review

`review.html` zeigt die beiden Bewegungsvergleiche. Pro Figur enthalten die
Unterordner eine bearbeitbare `unit-*.blend`, 16 echte Renderbilder in `frames/`,
ein RGBA-Sheet `*-16.png` mit **4096×256 Pixeln**, `contact-sheet.jpg`,
`motion-comparison.webm` und eine zusätzliche GIF-Vorschau. Alle acht Gang- und
acht Angriffsframes sind pro Figur bildlich verschieden. Die Bilder wurden aus
der neuen Blender-Bewegung gerendert, nicht aus vorhandenen PNGs interpoliert.

Die Videos zeigen links den bisherigen und rechts den neuen Stand bei identischer
Zeitachse: drei Gangzyklen und danach drei Angriffsclips. Der WebM-Vergleich hat
504 dekodierbare Videoframes bei 200 fps und dauert exakt 2,520 Sekunden. Diese
Videoframes halten die 16 tatsächlich gerenderten Posen für ihre vorgesehenen
Zeiten; sie sind keine weiteren Bewegungspose-Exporte. Die kurzen Angriffsclips
werden zur Sichtprüfung wiederholt und bilden keine geänderte Angriffsgeschwindigkeit
des Spiels ab. GIF kann 65 ms nicht exakt ausdrücken und verwendet deshalb im
Gang abwechselnd 60/70 ms; WebM ist der maßgebliche Zeitvergleich.

| Vertrag | Bisher | Studie |
|---|---|---|
| Gang | 4 × 130 ms = 520 ms | 8 × 65 ms = 520 ms |
| Angriff | 4 × 80 ms = 320 ms | 8 × 40 ms = 320 ms |
| Treffer | Spriteindex 6 bei 160 ms | Spriteindex 12 bei 160 ms |
| Sheet | 2048×256 | 4096×256 |

`weapon-sockets.json` enthält nur die zwei Studien-IDs mit jeweils 16 projizierten
Koordinaten im unveränderten 256-Pixel-Raum, vor einer möglichen Gegner-Spiegelung.
Die Einzelberichte enthalten außerdem Clip, Zeitpunkt und Weltposition pro Frame.

## Tatsächliche Quellen und Blender-Änderung

`original-action-inspection.json` dokumentiert die vorgefundenen Actions, sämtliche
Keyframes, Interpolationen, Bones und ausgewerteten Halbframes. Beide bisherigen
Figuren verwenden Bézier-Schlüssel 1–8 in einer gemeinsamen Action; auf Gangframe 4
folgt direkt Angriffsschlüssel 5. Der Ritter besitzt zusätzlich vier animierte
Pferdebein-Empties, die Oberbein, Unterbein, Gelenk und Huf jeweils gemeinsam drehen.
Ungeprüftes Sampling von Frame 4,5 hätte deshalb Gang und Angriff vermischt.

Der Studiengenerator erstellt getrennte Walk- und Attack-Actions für die jeweils
animierten Objekte. Jeder Clip besitzt 65 geometrisch ausgearbeitete Schlüssel
zwischen Actionframe 0 und 8. Nur Actionframes 0–7 werden exportiert; Frame 8 ist der
separate Abschluss der Gangschleife beziehungsweise die vollständige Rückkehr
zum Grundstand. `animation_study_actions` in der Szene ordnet Actions ihren
Objekten und Clips zu. Die alte Action bleibt als Referenz gespeichert.

Beim Clubman steuern zwei zusätzliche Fußbones Sohlen und Stiefel unabhängig von
den Schienbeinen. Eine Zweigelenk-Lösung berücksichtigt reale Ober-/Unterschenkellängen,
Standphase, Schwungphase und abgesenkte Hüfte. Die Beine tragen den Körper während
der vorhandene Keulenschwung durch echte Zwischenposen ergänzt wird. Hand und
Finger folgen dem Waffenhandgelenk, sodass der Griff beim Schwingen erhalten bleibt.

Beim Ritter sind Ober- und Unterbein, Gelenk und Huf des Pferdes einzeln artikuliert.
Die diagonal versetzten Standphasen verwenden flache Hufe und einen angehobenen
Rückschwung. Ein eigener Körperträger bewegt Pferderumpf und Reiter gemeinsam,
während die Hufe im Angriff stehen bleiben. Die Lanze erhält ein Waffenhandgelenk
und eine gerichtete Arm-IK; sie stößt beim Kontakt nach vorn über den Pferdekopf.
Die Reiterbeine bleiben relativ zum Sattel ruhig. Der Körper federt leicht mit.

Die Gang-Standphase bewegt den Fuß entgegengesetzt zur virtuellen Vorwärtsbewegung.
Ihre Schrittlänge ist auf die vorhandene Kamera, Laufzeitskalierung und reguläre
Geschwindigkeit ausgelegt: Clubman 40 bei 0,43 Skalierung, Knight 55 bei 0,51 Skalierung.
Das ist eine Prüfung des normalen Gangvertrags; eine spätere dynamische Änderung
der Bewegungsgeschwindigkeit muss bei einer Laufzeitmigration berücksichtigt werden.

## Prüfungen

`geometry-check.json` je Figur prüft 129 tatsächliche Auswertungszeiten pro Clip,
darunter Zeiten zwischen den ausgearbeiteten Schlüsseln. Die maximale Abweichung
aufeinanderfolgender Standphasenkontakte beträgt beim Clubman etwa 0,000054
Welteinheiten, beim Ritter weniger als 0,000001. Die Huf-/Sohlenspitzen bleiben
oberhalb der vorhandenen Bodenebene; es wurden keine Bilder nachträglich verschoben.

`source-audit.json` öffnet die gespeicherten Quellen unabhängig erneut und prüft:

- Alle Meshmittelpunkte schließen die Gangschleife und die Rückkehr zum Grundstand
  mit höchstens 0,00000003 Welteinheiten Abweichung.
- Der bisherige Ritterangriff verschob die Hufmittelpunkte um bis zu 0,14934
  Welteinheiten; in der Studie beträgt diese Drift 0. Clubman war bereits im
  bisherigen Angriff gepflanzt; seine neue Drift bleibt unter 0,000004.
- Handmittelpunkt und Waffenhandgelenk weichen höchstens 0,0000014 Welteinheiten ab.
  Zusätzlich wird der tatsächliche Abstand der Handoberfläche zum Schaft gemessen:
  etwa 0,000452 beim Clubman und höchstens 0,004711 beim Ritter, innerhalb der
  festgelegten 0,006-Toleranz. Das ist eine geometrische Toleranz, keine Behauptung
  mathematisch identischer Oberflächen.
- Die 16 exportierten Waffensockets stimmen nach erneutem Laden mit der projizierten
  Geometrie auf weniger als 0,001 Pixel überein. Zwischen den exportierten Frames
  hat der interpolierte Marker maximal 0,00308 Welteinheiten Restabweichung; die
  Laufzeit würde die exakt gemessenen 16 Samples verwenden.
- Hashes der beiden kanonischen Quellen, beiden Public-Sheets und produktiven
  Waffensocketdatei bleiben unverändert.

`render-check.json` prüft Bildabmessungen, acht unterschiedliche Posen pro Clip,
Alpha-Ränder und Produktionshashes. `video-check.json` je Figur prüft die tatsächliche
vollständige Dekodierung. `playback-check.json` bestätigt die Wiedergabe beider
Videos im lokalen Chromium-Browser inklusive Schleifendurchlauf ohne Fehler.
`browser-contact-review.jpg` zeigt beide Videos gemeinsam am 160-ms-Angriffskontakt.

## Wiederholen

Alle Befehle werden im Repository ausgeführt und schreiben ausschließlich in den
Studienordner beziehungsweise in dessen Prüfberichte:

```powershell
$blender = './downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe'
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/inspect_animation_study.py
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/build_animation_study.py -- --model-only
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/render_animation_study.py -- --samples 48
& $blender --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_animation_study.py
./.conda/python.exe tools/blender/review_animation_study.py
node tools/blender/check_animation_playback.cjs
```

Alternativ baut und rendert `build_animation_study.py` ohne `--model-only` direkt.
Für Videovergleich und Videoprüfung werden die vorhandenen lokalen Programme
ffmpeg und ffprobe verwendet. Keine Netzwerkinhalte und keine Skills sind nötig.

Die Studie ist zur Bild-/Bewegungsentscheidung vorbereitet. Sie autorisiert oder
vollzieht keine Migration der übrigen 38 Sheets, der Produktions-Animationsindizes,
des Boot-Assetvertrags oder der Waffenmarker. Figurengeometrie und Detailgrad bleiben
weitgehend die vorhandenen stilisierten Modelle; mehr Bewegungsframes allein
ergeben noch kein AAA-Niveau.
