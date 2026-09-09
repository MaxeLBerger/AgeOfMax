# Castle-v2: kompakte Hangfestung

## Tatsächlicher Ausgangszustand und Entwurf

Die bestehende Szene `art/blender/background-castle.blend` enthielt 532 Objekte.
Vier `Limestone curtain wall`-Turmkörper und eine Flachwand wurden mit vier gleichen
`Castle turret roof`-Kegeln, gleichartigen Fahnen und aufgesetzten Gitterstäben
kombiniert. Das tatsächliche Laufzeitbild wurde vor der Modellierung angesehen.
Fehlende Fassadentiefe, wiederholte Dachprofile und ein oberflächliches Tor bestimmten
die Silhouette. Die Details des Nachfolgers wurden deshalb an einem zusammenhängenden
Burggrundriss geplant, nicht an vier frei stehenden Turmformen.

Der neue Entwurf besteht aus einem niedrigen oktogonalen Westbastionsturm mit offenen
Zinnen, einem rückwärtigen rechteckigen Bergfried mit kurzem Schiefer-Walmdach,
einem runden Wachturm mit auskragendem Holzwehrgang und flach abgeschlossenem
polygonalem Dach, einem inneren Saalbau mit Holzkonstruktion und einem eingerückten
Torhaus. Die sechs Ringmauerabschnitte sind körperlich dicke Mauern; auf ihnen liegen
Wehrgänge mit 0,72 Einheiten freier Tiefe, äußeren Zinnen und inneren Handläufen.
Zwei Steintreppen verbinden die niedrigeren Mauerdecks mit den seitlichen Türmen.

Der Torbau besitzt einen wirklich offenen Rundbogentunnel, einzelne radiale
Bogensteine, ein Tonnengewölbe, ein angehobenes Fallgatter und teilweise geöffnete
innere Holzflügel. Die Kamera sieht durch den Eingang in die Tiefe. Es gibt keine
volle Wand oder flache schwarze Torscheibe hinter der Öffnung. Eine knapp
4,9 Einheiten lange Holzbrücke aus 28 einzelnen Bohlen, zwei Längsträgern,
Steinauflagen und Handläufen verbindet den Toreingang mit einem auf dem vorhandenen
Gelände liegenden Weg.

## Konstruktion und Art Direction

Alle neuen Teile sind in `CAS_Architecture` zusammengefasst. Alte Burgteile sind
in `CAS_SourceArchive` vorhanden und sowohl im Viewport als auch beim Rendern
unsichtbar. Der Festungsgrundriss wird über abgestufte Gründungen und zusammenhängende
Mauern in den Hang eingepasst. Die Mauersockel liegen unter den wirklich gemessenen
Geländehöhen. Die Landschaft selbst wird nicht verändert.

Mauerwerk besteht aus einer massiven, ausgesparten Tragstruktur und tatsächlich
modellierten versetzten Steinschichten. Drei gedämpfte Steinmaterialien variieren
den Verband, ohne die Wand unruhig zu färben. Schießscharten sind Öffnungen durch
die Mauerstärke; sie sind nicht schwarz aufgemalt. Hölzerne Konsolen, Pfosten,
Brüstungsbretter, Dachschindelreihen, Dachrippen, Fallgatter und Bogenkeilsteine
sind Geometrie. Schiefer bleibt gedämpft blaugrün, Stein warmgrau, Holz dunkles Eichenholz;
Eisen und Bronze bleiben eigene Materialien. Eine einzelne Fahne setzt den Akzent.

## Gemessene Bild- und Quellenverträge

- Auflösung 1600×900, Spielansicht 1280×720.
- Unveränderte Kamera `Battle valley / fixed horizon`, orthographische Breite 32.
- Kameramatrix/Projektion vor und nach dem Aufbau exakt identisch.
- Gelände-Hash umfasst sämtliche Vertices, Polygonindizes, Materialzuweisungen
  und die Weltmatrix; vor und nach dem Aufbau identisch.
- Höchste Geometrie beginnt bei y=117,16; der obere HUD-Bereich endet bei y=82.
- Tiefste Geometrie endet bei y=407,67. Die Kampfzone y=410–525 bleibt frei.
- Brücke und Weg enden bei y=390,07.
- 1996 neue Objekte, 2528 Objekte einschließlich der erhaltenen Umgebung und Archive.

Zwei wirkliche Szenen-Raycasts prüfen den offenen Tortunnel über 2,75 Einheiten
und eine durchgehende Schießscharte im Westturm über 0,80 Einheiten. Alle sechs
Mauerabschnitte besitzen eine gemessene freie Wehrgangtiefe oberhalb 0,70.
`metrics.json` enthält die vollständigen Bildbegrenzungen, Geländeproben,
Quellhashes, Archivliste und Prüfergebnisse.

## Kandidat und Reproduktion

Das eigenständige Skript `tools/blender/refine_castle.py` enthält seine grundlegenden
Mesh-, Material- und Bodenabfragehelfer direkt. Es benötigt keine verlorene
Generatorquelle und keine externen Modelle. Ausgabe ist ausschließlich der
Kandidatenordner `art/blender/candidates/castle-v2/`. Die ursprüngliche Blenderdatei
und das ursprüngliche Laufzeit-PNG sind dort exakt archiviert.

```powershell
# Kandidat aus dem archivierten Ausgangszustand reproduzieren.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/refine_castle.py -- `
  --source art/blender/candidates/castle-v2/original-background-castle.blend `
  --outdir art/blender/candidates/castle-v2 --render --samples 32

# Nur die gespeicherte Kandidatenszene rendern.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/refine_castle.py -- `
  --outdir art/blender/candidates/castle-v2 --render-only --samples 32

# Normalen Exporter auf einer isolierten Kopie des Kandidaten prüfen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_castle_export.py -- `
  --source art/blender/candidates/castle-v2/candidate.blend --samples 32
```

Der Hauptauftrag hat den endgültigen Kandidaten im echten vollständigen Spiel-HUD
persönlich geprüft (`art/qa/visual-castle-candidate.jpg`): Architektur, offenes Tor
mit Brückenanschluss, Silhouette und Abstand zur Kampfzone sind freigegeben.
Die automatische Ausführungsprüfung lehnte die erste Ersetzung vor Prozessstart
ab. Nach unabhängiger erneuter Prüfung der sieben Datei-Hashes, der exakten Ziele
und ihrer Sicherungen wurde eine erneute reguläre Prüfung erfolgreich freigegeben.
Root übernahm anschließend ausschließlich `art/blender/background-castle.blend`
und `public/assets/reborn/backgrounds/castle.png`; beide sind byteidentisch mit
dem abgenommenen Kandidaten. `integration-review.json` hält den historischen
Ablehnungszustand fest, `promotion.json` die erfolgreich gelöste Freigabe und
endgültige Integration. Alle übrigen vier Hintergrundpaare sind unverändert.


## Abschließende Kandidatenprüfung

Der tatsächliche 1600×900-Render wurde bei 1280×720 angesehen. Danach wurden nur
Bergfried und Saalbau höher gestaffelt, damit ihre Baukörper hinter den vorderen
Wehrgängen erkennbar bleiben. Der höchste Punkt liegt weiterhin unterhalb des HUD
bei y=117,16; die übrigen geschützten Grenzen bleiben unverändert. Die erste
Ansicht ist als `before-rear-layering.png` und `.blend` archiviert.

Der reguläre Exporter hat den endgültigen Kandidaten auf einer isolierten Kopie
erneut gerendert. Geometrie, Kamera, Gelände, Archivsichtbarkeit und Metadaten
blieben unverändert. Der Pixelvergleich unterscheidet sich nur an 242 von
1.440.000 Pixeln um jeweils höchstens eine RGB-Stufe; Alpha ist identisch.
`publication-evidence.json` enthält die genauen Quell-/Original-/Sicherungshashes
und diese Messung. `wall-walk-clearances.json` prüft zusätzlich die tatsächlichen
Meshgrenzen: zwischen innerer Parapetfläche und Handlauf bleiben auf allen sechs
Mauern ungefähr 0,72 Einheiten frei. Diese Messung liest die transformierten
Geometrien, nicht nur einen beschreibenden Szenenwert.

```powershell
# Hashes, exakte Sicherungen und Pixelgleichheit bis auf minimale GPU-Rundung prüfen.
./.conda/python.exe tools/blender/verify_castle_candidate.py
```


## Nachweis aus der integrierten Quelle

Der reguläre Exporter hat anschließend die kanonische Castle-Datei auf einer
isolierten Kopie erneut geöffnet und bei 1600×900 gerendert. Alle acht
Quellenprüfungen bestanden: Architektur, Kamera, Gelände, Originaldatei,
Exportkopie, Public-PNG, Archivsichtbarkeit und Metadaten. Der Geometrie-Hash
ist derselbe wie im zuvor abgenommenen Kandidaten. Die Quellenprüfung liegt
unter `canonical-export-validation/source-validation.json`; `promotion.json`
enthält zusätzlich den Pixelvergleich und die unveränderten acht übrigen
Hintergrunddateien. Die frühen Originaldateien bleiben exakt archiviert.

```powershell
# Kanonischen Burg-Hintergrund über den normalen Exportpfad exportieren.
./tools/blender/render.ps1 -Kind backgrounds -Epoch castle

# Kanonische Quelle lesen; Render ausschließlich isoliert ablegen und prüfen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_castle_export.py -- `
  --source art/blender/background-castle.blend `
  --outdir art/blender/candidates/castle-v2/canonical-export-validation --samples 32
```

`verify_castle_candidate.py` und `publication-evidence.json` gehören ausdrücklich
zur Prüfung vor der Übernahme; sie verlangen damals unveränderte Originaldateien.
Für die integrierte Quelle dient der kanonische Audit oben.
