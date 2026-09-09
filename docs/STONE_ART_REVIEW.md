# Steinzeitkulisse: integrierte Blenderrevision v2

Stand: 9. September 2026. Von Root als kanonische Blender-Szene und Laufzeit-PNG integriert; Quellen, Originalarchive und Nachweise in `art/blender/candidates/stone-v2`. Keine Skills, heruntergeladenen Modelle oder Kulturzuschreibungen.

## Bildkritik und gestalterische Entscheidungen

Im vorherigen vollständigen Spielbild standen die schmalen hohen Felsen als Zackenreihe. Der einzelne Dolmen hatte keinen erkennbaren Siedlungskontext. 71 gleichartig aufgebaute Tannen bildeten ein wiederholtes dunkles Band hinter den Kämpfern.

Der Kandidat bündelt den Blick auf einen kompakten Dolmen und eine kleine Siedlung. Drei breite, erodierte Tragsteine tragen eine große Deckplatte mit tatsächlich flacher Lagerfläche. Zwei niedrige Holz-/Lederunterkünfte haben unterschiedlich große, offene Eingänge, Dachrippen, Nähte, Abspannungen und Bindungen. Eine kleine eingefasste Feuerstelle, Holzvorrat, ein Werkzeugbock mit unbearbeiteten Steinwerkzeugen und zwei unmarkierte Häute am Trockenrahmen geben dem Ort eine praktische Nutzung.

Die hohen Zacken sind durch unregelmäßige niedrige Felsgruppen ersetzt. 20 neue, einzeln variierte Bäume bilden ungleich große Gruppen: breit verzweigte Laubbäume, schlanke Birkenformen und unregelmäßige Nadelbäume; niedrige Sträucher ergänzen die Ränder. Die alten vorderen Randbäume bleiben erhalten, damit das vertraute Framing der Festungen und der Kampfzone bestehen bleibt. Die neue Bepflanzung hält den Mittelgrund um die Siedlung offen.

Die erste Bildprüfung zeigte zu glatte Kronen, zu gerade Steinkanten und harte Moospolygone. In der überarbeiteten Geometrie bestehen Kronen aus kleineren überlappenden Laubmassen mit echten Blattspitzen. Erodierte Steine verwenden durchgehende Mineral-/Flechten-Schattierung. Der Bodenfleck folgt an mehreren Ringen dem vorhandenen Terrain, statt die Talform mit großen Dreiecken zu überbrücken.

## Dateien

- `tools/blender/refine_stone.py`: eigenständige editierbare Blender-Geometrie, Materialien, Gruppierung, Aufbau und Kandidatenrender.
- `tools/blender/audit_stone_geometry.py`: read-only Prüfungen von Lagerflächen, Eingängen und projizierten Grenzen.
- `tools/blender/audit_stone_export.py`: isolierter Aufruf des normalen statischen Exporters.
- `art/blender/candidates/stone-v2/candidate.blend` und `candidate.png`: Szene und Render.
- `original-background-stone.blend` und `original-background-stone.png`: unveränderte Ausgangsdateien zur Rücksicherung.
- `metrics.json`: Kamera-, Terrain-, Hash- und Layoutnachweise.
- `geometry-validation.json`: tatsächliche Strahlprüfungen und gemeinsame Objektgrenzen.
- `art/qa/visual-stone-candidate.jpg`: technische Ansicht im vollständigen HUD mit vier Einheiten je Fraktion; ausdrücklich kein erspielter Fortschritt.

Der erste sichtgeprüfte Kandidat enthielt 1.498 neue editierbare Objekte; die Fokaliteration ist unten dokumentiert. Das ist eine Inventarangabe und kein Nachweis von AAA-Qualität. Die Laufzeit lädt weiterhin eine einzelne Hintergrund-PNG; Objektzahl und Blattsilhouetten erhöhen keine Phaser-Geometriekosten.

## Erhaltung und Geometrieprüfung

Kamera einschließlich Matrix, Orthoskalierung und 1600 × 900 Renderformat bleiben unverändert. Das kontinuierliche Talmesh einschließlich aller Eckpunkte, Polygone, Materialindices und Objektmatrix bleibt SHA-256-identisch. Die 71 bisherigen Nadelbaumgruppen und die alten Megalith-/Zackenobjekte sind ausschließlich in der Kandidat-Szene als verborgene Quellarchiv-Sammlung erhalten.

Alle neuen sichtbaren Meshes und Kurven liegen gemeinsam im 1280 × 720 Spielbild zwischen y = 104,45 und y = 408,23. Die Kampfzone ab y = 410 und die untere Bedienleiste ab y = 552 bleiben frei.

Drei senkrechte Strahlpaare messen die Unterseite der Dolmendeckplatte und Oberseite jedes Tragsteins. Alle drei gemessenen Lagerabstände sind 0 Blender-Einheiten. Je drei horizontale Strahlen prüfen einen freien Eingang über 0,55 Blender-Einheiten Tiefe an beiden Unterkünften.

Kanonische Blender-Datei, öffentliche PNG, Laufzeitquellcode und Produktionsbuild werden von diesen Kandidatenwerkzeugen nicht überschrieben. Dateischreibvorgänge gehen zuerst in temporäre Dateien und werden atomar ersetzt.

## Reproduktion

```powershell
$stoneBlender = (Get-ChildItem downloads/blender-runtime -Filter blender.exe -Recurse | Select-Object -First 1).FullName
& $stoneBlender -b --python-exit-code 1 --python tools/blender/refine_stone.py
& $stoneBlender -b --python-exit-code 1 --python tools/blender/refine_stone.py -- --render-only --samples 32
& $stoneBlender -b --python-exit-code 1 --python tools/blender/audit_stone_geometry.py
& $stoneBlender -b --python-exit-code 1 --python tools/blender/audit_stone_export.py -- --source art/blender/candidates/stone-v2/candidate.blend
node tools/visual-epoch.mjs stone art/blender/candidates/stone-v2/candidate.png
```

Der Aufbau verwendet nach dem ersten Durchlauf automatisch die gesicherte ursprüngliche Szene. Ausgaben außerhalb des isolierten Kandidatenverzeichnisses werden abgelehnt. Renderfenster werden mit den Animationsarbeiten abgestimmt.

Der Hauptagent hat die finale Sichtfreigabe nach Vergleich im vollständigen Spielbild erteilt und genau die zwei zugehörigen Assets übernommen. Der Kandidat verbessert die Siedlungslesbarkeit und die Variantenbildung der bisherigen stilisierten 2,5D-Kulisse. Er belegt kein erreichtes AAA-Niveau; insbesondere die ursprünglichen weichen Fernberge und vorderen Randbäume sind weiterhin Teil der gemeinsamen Bildsprache.

## Exportprüfung vor der Fokaliteration

Der finale Kandidat wurde mit Cycles/OptiX, 32 Samples, 1600 × 900 gerendert und anschließend im vollständigen Spiel-HUD mit beiden Fraktionen geprüft. Browserfehler: 0. Die Siedlung, die offene Mitte und beide Festungen bleiben lesbar; obere Statusanzeigen und untere Rekrutierungskarten bleiben bedienbar. Diese Ansicht ist ein absichtlich eingerichteter technischer Vergleich.

Der normale `export_scenes.py::export_static` lief auf einer isolierten Kopie. Alle acht Prüfungen von neuer Geometrie, Kamera, Terrain, Eingabedatei, kopierter Quelldatei, öffentlicher PNG, verborgenem Quellarchiv und Metadaten bestanden.

Die Bilder sind nicht bytegenau pixelidentisch: 255 von 1.440.000 Pixeln (0,017708 %) unterscheiden sich in mindestens einem RGB-Kanal um genau eine 8-Bit-Stufe. Die maximale Kanalabweichung beträgt 1/255, die mittlere RGB-Abweichung 0,000059/255. Keine Abweichung liegt über einer Stufe. Die vollständigen RGBA-Bytes und alle RGB-Kanäle wurden geprüft; ein einfacher RGBA-`getbbox()`-Vergleich allein wäre hier ungeeignet, weil die Alpha-Differenz überall null ist. Die sehr kleine Renderabweichung bleibt ausdrücklich im Prüfbericht dokumentiert.

Nachweise: `export-validation/source-validation.json` und `export-validation/pixel-validation.json`. Die `candidate.png` ist das tatsächlich sichtgeprüfte Bild; der isolierte Reexport dient der Reproduktionsprüfung. Beide bleiben im Kandidatenverzeichnis.

## Gezielte Fokaliteration nach Hauptagenten-Review

Der Hauptagent prüfte die erste vollständige HUD-Ansicht und beauftragte eine weitere Ausarbeitung von Dolmen und Unterkunftshäuten. Der vorherige Kandidat einschließlich HUD-Bild und Exportberichten liegt unverändert in `before-focal-refinement`.

Die drei Tragsteine haben nun eigene Höhenprofile mit unterschiedlichen Schultern, Verjüngungen, Bauchungen, Neigungen und ausgewitterten Kanten. Die Deckplatte hat einen asymmetrischen Umriss, einzelne zurückgesetzte Randstellen und eine gewölbte, unregelmäßige Oberseite. Ihre Nennabmessungen und die Lage der drei Stützen bleiben bestehen. Kleine plane Lagerbereiche an den Stützen treffen auf die flache tragende Unterseite der Platte. Die ursprüngliche gröbere, gleichförmige Form wurde tatsächlich im Mesh ersetzt.

Ein eigener matter Steinshader verwendet geringe Mineralfarbvariation und wenige zurückhaltende Flechtenflächen. Keine zusätzlichen flächigen Rauschtexturen wurden über das Bild gelegt.

Die vier Dachhälften bestehen aus fein unterteilten Flächen mit tatsächlichem Durchhang von bis zu etwa 0,185 Blender-Einheiten zwischen jeweils fünf Holzrippen. Kleine zusätzliche Falten und ein bewegter Saum brechen die Geradlinigkeit. Auch die Eingangsseiten sind gewölbte Flächen mit Falten und gerollter Öffnungskante. Zwei plausible Dachbahnnähte, wenige Kreuzstiche, Verschnürungen an den Rahmen und je eine kleine Flickstelle folgen den realen Oberflächen. Die Hautoberfläche bleibt matt und leicht unterschiedlich gefärbt.

Die Unterkunftsgruppen behalten exakt ihre projizierten Grenzen. Vegetation, Kamera und Talmesh wurden für diese gezielte Iteration nicht gestalterisch geändert. Die Dolmenkontur liegt nun bei x = 354,65 bis 521,85 und y = 191,66 bis 349,17 im 1280 × 720 Bild. Alle neuen sichtbaren Objekte zusammen bleiben unverändert im vertikalen Bereich y = 104,45 bis 408,23.

Beim ersten neuen Kontaktversuch lag ein Randbereich der Platte 0,028 Blender-Einheiten über einem Stützpunkt. Der Test erkannte dies; die tragende Unterseite wurde erweitert. Anschließend bestanden 27 echte Strahlpaare, je neun Punkte auf jeder Lagerfläche, mit gemessenem Abstand 0. Die sechs unabhängigen Eingangstrahlen sind weiterhin frei. Die Szene enthält jetzt 1.640 neue editierbare Objekte.

Das aktualisierte Spielbild `art/qa/visual-stone-candidate.jpg` wurde erneut betrachtet. Die Einheiten bleiben klar vor dem freien Mittelgrund, die Bauten liegen weiterhin oberhalb des Kampfbereichs. Browserfehler: 0. Der Hauptagent hat diesen tatsächlichen Bildstand anschließend freigegeben und übernommen.

## Finale Übergabe der freigegebenen Fokaliteration

Der Hauptagent hat auch die nachgearbeitete HUD-Ansicht persönlich geprüft und diesen Gestaltungsstand freigegeben. Es erfolgte durch den Stone-Unteragenten weiterhin keine Übernahme in kanonische oder öffentliche Dateien.

`final-readiness.json` enthält die beiden exakten Kandidat-/Ziel-/Originalbackup-Paare, alle SHA-256-Werte, den Hash der betrachteten HUD-Aufnahme sowie die aktuellen Geometrie- und Exportnachweise. Beide Zieldateien stimmen zum Übergabezeitpunkt exakt mit ihren Originalbackups überein.

Die finale normale Exportprüfung besteht erneut alle acht Erhaltungsprüfungen. Beim Vergleich aller RGBA-Bytes und RGB-Kanäle unterscheiden sich 228 von 1.440.000 Pixeln (0,015833 %) um maximal eine 8-Bit-Stufe; mittlere RGB-Kanalabweichung: 0,00005278/255. Dies ersetzt für den aktuellen Kandidaten die oben dokumentierte Messung der früheren Fassung. Der minimale Restunterschied wird ausdrücklich nicht als Pixelidentität bezeichnet.

Die endgültigen Kandidatenhashes sind:

- BLEND: `bb4d3c94184c1c9b9ed4a767e6f13dc8647380e011911ef1ddb78522cd9c6071`
- PNG: `4f6a38d257a0c1076f01b5ea5ebe7f19f9fed97d00c7bb0b053bf98453435fe4`

`tools/blender/prepare_stone_handoff.py` erstellt den Übergabenachweis reproduzierbar vor der Übernahme. Es verändert weder kanonische Quellen noch öffentliche Assets. Nach der unabhängigen Hashprüfung hat der Hauptagent ausschließlich diese beiden Dateien übernommen; der abschließende Nachweis folgt unten.

## Integration und kanonischer Nachweis

Root hat nach persönlicher Sichtfreigabe und unabhängiger Prüfung aller sechs Dateihashes genau `art/blender/background-stone.blend` und `public/assets/reborn/backgrounds/stone.png` übernommen. Beide Zieldateien entsprechen bytegenau den oben genannten freigegebenen Kandidaten. Die zwei archivierten Originaldateien sind erhalten und stimmen mit ihren ursprünglichen Hashes überein.

`promotion.json` dokumentiert die von Root ausgeführte Übernahme und die danach unabhängig gelesenen Ziel-, Kandidaten- und Sicherungshashes. Vorher- und Nachherwerte sind ausdrücklich getrennt bezeichnet. `final-readiness.json` bleibt als historischer Nachweis vor der Übernahme erhalten.

Anschließend wurde die tatsächliche kanonische Szene mit `audit_stone_export.py` geöffnet, in einen neuen isolierten Quellpfad kopiert und über den normalen `export_static` gerendert. `canonical-export-validation/source-validation.json` bestätigt alle acht Erhaltungsprüfungen und denselben Geometrie-Hash wie beim abgenommenen Kandidaten. Während dieses Nachweises blieben kanonische Szene, öffentliche PNG und Produktionsbuild unverändert.

Die kanonische 1600 × 900-Ausgabe unterscheidet sich vom veröffentlichten PNG an 228 von 1.440.000 Pixeln um maximal eine RGB-Stufe. Alpha ist exakt identisch; mittlere RGB-Abweichung: 0,00005278/255. `canonical-export-validation/pixel-validation.json` enthält die vollständige Messung und beide Dateihashes.

```powershell
# Die integrierte Quelle ausschließlich isoliert nachweisen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_stone_export.py -- --source art/blender/background-stone.blend --outdir art/blender/candidates/stone-v2/canonical-export-validation --samples 32
./.conda/python.exe tools/blender/record_stone_promotion.py
```

Die Steinzeitrevision ist integriert und der kanonische Export geprüft. Dieser Abschluss betrifft die beiden Steinzeitassets; die spielweite Qualitätsarbeit und Animationsüberarbeitung laufen im Hauptauftrag weiter.

## Isoliertes Produktionspaket

Nach der kanonischen Prüfung wurde `art/qa/releases/stone-v2/package` mit Vite gebaut. Es enthält 73 Dateien und 20.987.732 Bytes. Gegenüber dem abgenommenen Paket `wave-tactics-v1/package` unterscheidet sich ausschließlich `assets/reborn/backgrounds/stone.png`; alle übrigen 72 Dateien einschließlich JavaScript und `index.html` sind byteidentisch. Die neue PNG entspricht exakt Public-Asset und freigegebenem Kandidaten.

Der Bericht `art/qa/releases/stone-v2/package-comparison.json` enthält alle Dateinamen, Größen und Hashes. Vorher-/Nachher-Manifeste bestätigen, dass sowohl Ausgangspaket als auch laufendes `dist` unverändert blieben. Das Paket wurde hier nur vorbereitet; Root übernimmt und prüft anschließend HTTP-Auslieferung und HUD. Kein neuer Browser oder Port wurde für diesen Paketvergleich gestartet.
