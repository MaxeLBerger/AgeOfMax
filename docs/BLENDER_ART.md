# AgeOfMax: The Long Dawn / Blender Art

Die neue Art Direction wurde eigenständig für AgeOfMax geplant. Es wurden keine vorgefertigten Skills, heruntergeladenen Modelle, fremden Texturen oder Bildgenerierungsdienste verwendet. Die Laufzeitbilder stammen aus den eigenen Blender-Szenen im Projekt.

## Gestaltung und Umfang

Ein wiedererkennbares Tal verbindet fünf Epochen: Megalithen, Burg, Republik, industrielle Stadt und Aether-Zitadelle. Bronze, Kalkstein, Petrol und Elfenbein verbinden Figuren und Architektur. Spieler tragen Petrol; Gegner tragen karminrote Stoffe, Schilde und lackierte Flächen. Haut, Leder, Holz und Metall behalten ihre Materialidentität. Zukunftseinheiten besitzen zusätzlich unterschiedliche Lichtfarben. Balliste und Kanone tragen in Blender gebaute, leicht animierte Fraktionswimpel.

Die Figuren sind eigenständige stilisierte Modelle mit Kleidungslagen, Waffen und modularen Rüstungen. Reittiere haben artikulierte Beine, der Panzer einzeln bewegte Kettenglieder und der Mech einen eigenen Gang. Der Plasma-Soldat besitzt ein dickes Spulengewehr und Reservoirs; der Scharfschütze trägt einen modellierten Feldumhang. Keule und Kriegshammer benutzen ein zusätzliches Handgelenk, damit der sichtbare Kontakt nach vorne erfolgt.

| Ausgabe | Anzahl | Vertrag |
|---|---:|---|
| Spieler-Einheiten | 20 | `public/assets/reborn/units/{id}.png`, 2048 × 256 RGBA |
| Gegner-Einheiten | 20 | `public/assets/reborn/units-enemy/{id}.png`, gleicher Framevertrag |
| Basen | 10 | `bases/{epoch}.png` und `bases-enemy/{epoch}.png`, 512 × 512 RGBA |
| Verteidigungsanlagen | 30 | `towers/{epoch}-{1..3}.png` und `towers-enemy/...`, 256 × 256 RGBA |
| Schlachtfelder | 5 | `backgrounds/{epoch}.png`, 1600 × 900 |
| Editierbare Szenen | 85 | `art/blender/*.blend` |
| Waffenmarker | 20 × 8 | `public/assets/reborn/weapon-sockets.json` |

Das aktuelle Spiel verwendet die 15 Spieler-Türme; die 15 passenden Gegner-Türme sind zusätzlich produziert. Portraitdateien sind verlustfreie Kopien des ersten Frames. Die Spieloberfläche erzeugt ihren Ausschnitt daraus bzw. aus dem Sprite-Sheet.

Epochen-IDs: `stone`, `castle`, `renaissance`, `modern`, `future`. Einheiten-IDs entsprechen exakt `data/units.json`. Alle Figuren schauen in den Quellen nach rechts. Ein Frame misst 256 × 256 Pixel. Gemeinsamer Fußanker: **(0.5, 0.92)**. Frameindizes **0–3** bilden den Gang; **4–7** bilden Vorbereitung, Schwung, Kontakt und Erholung. Der Kontakt liegt bei Index **6**, entsprechend Blender-Frame **7**. Humanoide besitzen elf Grund-Bones; Keulenkrieger und Dinosaurierreiter besitzen zusätzlich `weapon.wrist`. Titan und Scharfschütze besitzen je 16 Bones, einschließlich getrennter Hände, flach ausgerichteter Füße und eines eigenen Waffen-Bones.

## Reproduzierbare Quellen

**Die gespeicherten `.blend`-Szenen sind die verbindliche Geometriequelle.** Bei einer unterbrochenen Schreiboperation wurde die ursprüngliche 70.670 Byte große Datei `rebuild_art.py` mit Nullbytes beschädigt. Alle 85 inzwischen vorhandenen Blender-Szenen sind erhalten und wurden erneut in Blender geöffnet. Prüfsumme und Befund stehen in `art/blender/source-recovery.json`. Die alte Textquelle ließ sich nicht aus den Szenen wiederherstellen; es wird daher keine vollständige Neuerzeugung sämtlicher Geometrie aus einer leeren Szene versprochen.

Der neu geschriebene `tools/blender/export_scenes.py` öffnet die editierbaren Quellen, ergänzt Wimpel und Umhang, korrigiert die Handgelenk-Animationen, erstellt Fraktionsmaterialien, speichert die Szenen und rendert daraus. `scene_details.py` enthält die zusätzlichen Modellierungsschritte. `rebuild_art.py` ist ein kompatibler Einstiegspunkt für diesen Exporter. Änderungen an Geometrie können direkt in den `.blend`-Dateien vorgenommen und anschließend erneut exportiert werden.

Produziert mit **Blender 4.5.13 LTS**, Cycles und OptiX auf einer RTX 4070 Ti SUPER. Die lokale portable Runtime liegt unter `downloads/blender-runtime/`. Eine andere Blender-4.5-Installation kann über `-BlenderPath` angegeben werden. Die verlustfreie Bildmontage benötigt Pillow; die vorhandene Umgebung `.conda/python.exe` enthält es.

```powershell
# Alle gespeicherten Szenen exportieren, beide Fraktionen und anschließende Prüfung.
./tools/blender/render.ps1 -Kind all -Epoch all -Faction both

# Einzelne Einheit einschließlich beider Fraktionen und Waffenmarker.
./tools/blender/render.ps1 -Kind units -Unit plasma-trooper

# Einzelnes Schlachtfeld.
./tools/blender/render.ps1 -Kind backgrounds -Epoch stone

# Nur Waffenmarker neu aus den animierten Geometrien projizieren.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  -b --python-exit-code 1 --python tools/blender/export_scenes.py -- --kind units --sockets-only

# Pixelvertrag und Öffnen aller editierbaren Quellen prüfen.
./.conda/python.exe tools/blender/verify_art.py
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  -b --python-exit-code 1 --python tools/blender/validate_blend_sources.py
```

Zwischenbilder liegen unter `art/blender/frames/{player,enemy}/{id}/{0..7}.png`, außerhalb des öffentlichen Assetverzeichnisses. Sie werden nicht mit der Website ausgeliefert und müssen nicht in Git gespeichert werden. `pack_sheets.py` montiert sie verlustfrei nebeneinander und erstellt Kontaktbögen. Die endgültigen PNGs, Blender-Szenen und Socketdaten werden über temporäre Dateien und anschließendes atomisches Ersetzen veröffentlicht; kurzzeitige Windows-Dateisperren werden begrenzt wiederholt.

## Waffenmarker

`weapon-sockets.json` ist ein Objekt mit einer Eigenschaft je Einheiten-ID. Jeder Wert enthält exakt acht `[x, y]`-Paare in den ungespiegelten 256-Pixel-Framekoordinaten. Die Punkte werden aus dem ausgewerteten, animierten Waffenmesh projiziert. Es gibt keine geratenen pauschalen Bildschirmhöhen. Dieselben Koordinaten gelten für die Gegner; das Spiel spiegelt deren X-Offset zusammen mit dem Bild. Jede Einheitsszene enthält zusätzlich den animierten Empty `Weapon muzzle / runtime socket`.

```text
Bildschirm-X = Einheit-X + (Marker-X - 128) × Skalierung × Blickrichtung
Bildschirm-Y = Einheit-Y + (Marker-Y - 235,52) × Skalierung
```

Die Blickrichtung beträgt rechts `1`, links `-1`. Für den Angriff wird der Marker des Kontaktframes 6 verwendet. Das Spiel legt Trefferpunkte am gegnerischen Körper unabhängig davon fest.

## Nachweise und Grenzen

`art/blender/verification.json` dokumentiert die Prüfung von **85 Bildern und 85 Quellen**: Abmessungen, RGBA-Transparenz, nicht leere Einzelbilder, Rand-Clipping, unterscheidbare Gang-/Angriffsposen, unterschiedliche Fraktionsbilder und vollständige endliche Waffenkoordinaten. `art/blender/blend-validation.json` protokolliert das erfolgreiche Öffnen aller **85** Quellen mit Kameras und Geometrie in Blender. Die abschließende Pixelprüfung meldete **keine Fehler**.

`art/blender/unit-contact-sheet.jpg` und `unit-contact-sheet-enemy.jpg` wurden visuell verglichen. Das Team ist anhand der tatsächlichen Materialvarianten klar erkennbar. Die korrigierte Keule sowie sämtliche acht Posen der neu modellierten Titan- und Scharfschützenvarianten wurden zusätzlich im Vorher-/Nachher-Vergleich angesehen. Diese technischen und visuellen Kontrollen ersetzen keine tatsächliche Spielpartie; die Laufzeitintegration und Partien werden im Hauptauftrag geprüft.

Der Stand besitzt eine zusammenhängende stilisierte Strategieästhetik. **Er erreicht damit noch nicht die visuelle Produktionsbreite eines AAA-Spiels.** Die acht kompakten Animationsframes, vereinfachten Gesichter und Kleidungsfalten, begrenzten Trefferreaktionen und wiederholten Umweltmotive bleiben erkennbare Grenzen. Höhere Renderauflösung allein würde diese gestalterischen Grenzen nicht beheben.

## Zweite Figurenrevision: Titan und Scharfschütze

Die kanonischen Einheiten `super-heavy` und `sniper` wurden nach einer getrennten Staging-Prüfung ersetzt. Der Titan besitzt nun einen breiten Rumpf, geschichtete Schulter- und Beinplatten, sichtbare Knieaktuatoren, große flache Stiefel und einen konstruierten Stahlhammer mit getrennten Schlagflächen. Er führt einen beidhändigen Überkopfschwung mit Körpereinsatz aus. Der Scharfschütze besitzt eine gefaltete Feldkapuze, einen ausgearbeiteten Mantel, einen neu gebauten Präzisionsverschluss samt Zielfernrohr und eine abgesenkte, abgestützte Schussstellung. Schulterstütze, Griffhand, Stützhand und Auge sind an den tatsächlichen Waffenpositionen ausgerichtet.

Die Gelenkposen wurden über berechnete Zwei-Segment-Ketten authored: Arme greifen die Waffen, während beide Fußsohlen während aller vier Angriffsframes dieselben Weltkoordinaten behalten. Die gemessene Sohlenbewegung liegt unter 0,000001 Modell-Einheiten. Beim Scharfschützen liegt das Okular vor dem Auge; die Höhenabweichung zwischen Auge und Okularzentrum beträgt etwa 0,003 Modell-Einheiten.

Diese Szenen tragen `authored_character_revision = 2` sowie `runtime_weapon_mesh`. Der reguläre Exporter bewahrt ihre Geometrie und vollständigen Körperanimationen und ersetzt sie nicht durch die älteren allgemeinen Posen. Zwei wiederholte Szenenexporte pro Figur wurden auf isolierten Kopien durchgeführt: Meshnamen, Bone-Listen und sämtliche acht Posematrizen blieben identisch; es entstanden keine doppelten Ausrüstungsteile.

Die archivierten Vorgänger, Autorenquellen, 32 gerenderten Frames, vier Sprite-Sheets, vier Blender-Szenen und Prüfergebnisse stehen unter `art/blender/candidates/heavy-sniper-v1/`. Die kompakten Vergleichsbilder heißen `super-heavy-comparison.png` und `sniper-comparison.png`; `*-before-after.png` zeigt jeweils alle acht Frames. `verification.json` prüft die Pixelverträge, `source-validation.json` die echten Fußsohlen und wiederholten Exporte, `promotion.json` dokumentiert die atomische Veröffentlichung. Bei der Veröffentlichung wurden nur die zwei zugehörigen Waffenmarker ersetzt; die anderen 18 Einträge blieben unverändert.

```powershell
# Die zwei bereits verbesserten kanonischen Figuren erneut rendern.
./tools/blender/render.ps1 -Kind units -Unit super-heavy
./tools/blender/render.ps1 -Kind units -Unit sniper

# Die Autorenstudie reproduzierbar aus ihren archivierten Vorgängern aufbauen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  -b --python-exit-code 1 --python tools/blender/build_character_candidates.py -- --samples 64
./.conda/python.exe tools/blender/review_character_candidates.py
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  -b --python-exit-code 1 --python tools/blender/audit_character_candidates.py
```
## Zweite Umgebungsrevision: Renaissance

Der Renaissance-Entwurf ersetzt den hohen, glatten Zylinder und zehn wiederholte
Spitzdächer durch sechs eigenständig modellierte Baugruppen: eine niedrige
Sternwarte mit oktogonalem Fenstertambour und gerippter Kupferkuppel, eine offene
Loggia, einen zweigeschossigen Palazzo mit zentralem Giebel und Sonnenuhr, eine
Werkstatt sowie zwei kleinere Osthäuser mit unterschiedlichen Dächern. Fenster
sind echte Öffnungen in den Fassaden; ihre Rückwände liegen zurückgesetzt im
Gebäude. Die Loggia ist durch beide Arkadenreihen offen. Dachziegelreihen,
Kupferrippen, Gesimse, Ecksteine, Fensterrahmen und Balustraden bestehen aus
Geometrie. Terrassensockel verwenden Raycasts auf das bestehende Gelände.

Der Entwurf liegt unter `art/blender/candidates/renaissance-v2/`. Die ursprüngliche
Blender-Szene und das ursprüngliche Laufzeitbild sind dort als
`original-background-renaissance.blend` und `original-background-renaissance.png`
archiviert. `tools/blender/refine_renaissance.py` baut die neue Architektur allein
mit bpy aus dieser Quelle; es benötigt den verlorenen Erstgenerator nicht.
Kamera, Geländevertices, Polygonindizes, Materialzuweisungen und Geländetransform
bleiben nachweislich identisch. Die Bildbegrenzung der Sternwarte beginnt im
1280×720-Spielraum bei y=156,86, unterhalb des oberen HUD bei y=82; die Kampfspur
bei y=500 bleibt frei.

Der Kandidat wurde im echten Spiel-HUD verglichen:
`art/qa/renaissance-before-hud.jpg` und `renaissance-candidate-hud.jpg`.
`geometry-validation.json` belegt die tatsächlichen Fenster-/Arkadenöffnungen.
`publication-evidence.json` enthält Original-, Sicherungs- und Kandidatenhashes.
Der bisherige reguläre Exporter benötigt keine Änderung, um die neue Architektur
zu erhalten. Die unabhängige Prüfung mit `audit_renaissance_export.py` öffnet eine
isolierte, korrekt benannte Kopie und ruft dessen `export_static` auf. Sie bestätigte
unveränderte Geometrie, Kamera, Gelände und Szenenmetadaten bei 2680 Objekten.
Die zwei 1600×900-Ausgaben weichen nur an 236 von 1.440.000 Pixeln um maximal eine
RGB-Stufe ab; Alpha ist identisch. Das ist keine byteidentische Renderausgabe.

Nach erneuter regulärer Freigabeprüfung mit konkreten Sicherungs-, Export- und
Auftragsnachweisen wurden die zwei lokalen Renaissance-Spielassets atomar
übernommen. `promotion.json` dokumentiert die Übernahme und unveränderte Hashes
der anderen vier Hintergründe. Auch die neue kanonische Quelle wurde danach über
den regulären Exporter in einen isolierten Prüfpfad gerendert:
`canonical-export-validation/source-validation.json` bestätigt erneut die
unveränderte Architektur, Kamera, Geländegeometrie und Szenenmetadaten. Die
archivierten Vorgänger bleiben als reproduzierbare Ausgangsquelle erhalten.

Die vorbereitete Quelle trägt `authored_environment_revision = 2`,
`environment_id = renaissance`, `runtime_background = backgrounds/renaissance.png`,
`authoring_source = tools/blender/refine_renaissance.py` und den unveränderten
Layoutvertrag in `runtime_layout`. Der reguläre Exporter setzt den Zielpfad beim
Rendern ausdrücklich; die isolierte Prüfung kann deshalb keine öffentlichen
Dateien überschreiben.

```powershell
# Den geprüften Entwurf aus dem archivierten Original neu aufbauen und rendern.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/refine_renaissance.py -- `
  --source art/blender/candidates/renaissance-v2/original-background-renaissance.blend `
  --outdir art/blender/candidates/renaissance-v2 --render --samples 32

# Den normalen Exporter auf einer isolierten Kopie dieses Kandidaten prüfen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_renaissance_export.py -- `
  --source art/blender/candidates/renaissance-v2/candidate.blend --samples 32

# Nach erfolgter Übernahme dieselbe Prüfung aus der kanonischen Quelle ausführen.
# Auch dieser Nachweis schreibt nur in das isolierte Kandidatenverzeichnis.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_renaissance_export.py -- `
  --source art/blender/background-renaissance.blend `
  --outdir art/blender/candidates/renaissance-v2/canonical-export-validation --samples 32
```

## Zweite Umgebungsrevision: Zukunft

Die Zukunftskulisse wurde nach Sichtprüfung im echten Spiel-HUD als terrassierte
Zitadelle übernommen. Ein vollständig sichtbares Ringtor mit zwölf separaten
Mantelsegmenten, Kompressionsverbindungen, Wartungskassetten, Diagonalträgern und
unterem Auflager ersetzt den oben abgeschnittenen Großring. Gestaffelte Wohntürme,
Kraftwerkstürme mit offenen mechanischen Kronen und verglaste Observatorien bilden
drei unterschiedliche Gebäudefamilien. Zurückgesetzte Hallenfenster, Radiatoren,
Versorgungsbrücken, massive Terrassengründungen und eine mittige Treppe verbinden
die Anlage räumlich. Die Architektur besteht aus bearbeitbarer Blender-Geometrie.

`tools/blender/refine_future.py` baut den Entwurf reproduzierbar aus der erhaltenen
Originalszene unter `art/blender/candidates/future-v2/baseline/` auf. Zwei Aufbauten
ergaben jeweils 326 neue Architekturteile; wiederholtes Ausführen erzeugt keine
Dubletten. Kamera, Terrain und alle 463 übrigen Umgebungsobjekte behalten ihre
Geometrie-/Transformhashes. Auch 14 vorhandene Umgebungsmaterialien und drei
Lichter bleiben nach erneutem Öffnen der Quelle unverändert. Das Ringtor beginnt
bei y=98,91 im 1280×720-Spielraum, unterhalb der HUD-Kante y=82. Die gesamte neue
Architektur endet spätestens bei y=407,40, oberhalb der Kampfbahn y=410–525.

`before-after.jpg` zeigt die Architekturänderung; die Prüfung im tatsächlichen HUD
liegt unter `art/qa/visual-future-current.jpg` und `visual-future-candidate.jpg`.
`source-check.json`, `reproduction-check.json` und `render-check.json` dokumentieren
die getrennte Kandidatenprüfung. `promotion.json` bestätigt die anschließende
Übernahme genau einer kanonischen Blender-Datei und ihres Laufzeit-PNGs nach
Original-/Backuphashprüfung. Die anderen vier Hintergrundpaare blieben dabei
unverändert. Jede Zieldatei wurde atomar ersetzt; die zwei Dateien bilden keine
Dateisystemtransaktion. Die ursprüngliche Quelle und das ursprüngliche Bild
bleiben archiviert.

Der normale `export_scenes.py` benötigt keine Änderung. Nach der Übernahme wurde
auch die veröffentlichte Quelle durch dessen regulären `export_static` in einen
isolierten Pfad gerendert. `canonical-export-validation/source-validation.json`
bestätigt unveränderte Architektur, Kamera, Gelände, Materialien und Lichter.
Der 1600×900-Reexport mit 64 Cycles-Samples unterscheidet sich vom veröffentlichten
PNG in 246 von 1.440.000 Pixeln um jeweils höchstens eine RGB-Stufe. Der
Kandidaten-Reexport davor unterschied sich in 237 Pixeln. Die Kampfbahngeometrie
ist identisch; geänderte Gebäudeschatten und separates Render-Sampling verursachen
im Kampfbildstreifen durchschnittliche RGB-Abweichungen von 0,96 / 0,99 / 0,81.

```powershell
# Architektur aus dem archivierten Original nur im Kandidatenverzeichnis aufbauen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/refine_future.py -- --samples 64

# Regulären Export aus der veröffentlichten Quelle isoliert prüfen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_future.py -- --canonical
./.conda/python.exe tools/blender/review_future.py --canonical
```

Die bestehende Vegetation, das Gelände und die breite Lichtstimmung bleiben die
stilisierten Talquellen. Die Revision verbessert Konstruktion, Silhouette und
Komposition; sie ist kein Nachweis, dass das gesamte Spiel bereits AAA-Niveau hat.
## Zweite Umgebungsrevision: Moderne

Die Moderne wurde in Blender um drei unterschiedliche Industriebauten neu
entworfen: Ziegel-Maschinenhalle mit Sägezahndächern, gestaffelter Beton-Leitstand
mit tiefen Fensterrahmen und Verladehalle mit flachem Tonnendach. Echte Öffnungen,
Glas-/Stahlmaterialien, Rolltore und konstruktive Dachdetails ersetzen die alten
13 Quader und 91 aufgesetzten Fensterbänder. Nach dem ersten HUD-Vergleich wurden
die hohen Steinpodeste durch schlichte Betonstützwände ersetzt und alle drei
Gebäude über einen auf dem Gelände liegenden Betriebshof verbunden. Die rechte
Halle erhält eine durchgehende Laderampe. Kamera, Gelände und Kampfspur blieben
unverändert; der Betriebshof bleibt hinter der Kampflinie.

Nach dem zweiten echten Spiel-HUD-Vergleich wurden ausschließlich
`art/blender/background-modern.blend` und
`public/assets/reborn/backgrounds/modern.png` atomar übernommen. Exakte Vorgänger,
Vorherbilder, Quellen, Messwerte, Normalexport und Übernahmeprotokoll liegen unter
`art/blender/candidates/modern-v2/`. `promotion.json` bestätigt vorab identische
Original-/Sicherungshashes und unveränderte Dateien aller anderen vier
Hintergrundpaare. Der Reexport aus der endgültigen kanonischen Quelle hat denselben
Geometrie-Hash wie der abgenommene Kandidat; der Nachweis steht in
`canonical-export-validation/source-validation.json`.

`tools/blender/refine_modern.py` ist ein eigenständiges bpy-Autorenwerkzeug;
`audit_modern_export.py` ruft den bestehenden regulären Exporter ausschließlich
auf einer isolierten Kopie auf. Die Gestaltung, Materialwerte, Gelände-/Fenster-
Raycasts, Bildbegrenzungen und alle Wiederholungsbefehle dokumentiert
`docs/MODERN_ART_REVIEW.md`. Die ursprüngliche Blenderquelle ist im Kandidatenordner
archiviert, damit auch der Geometrieaufbau nach der Übernahme reproduzierbar bleibt.

```powershell
# Den fertigen Moderne-Hintergrund regulär aus der kanonischen Quelle exportieren.
./tools/blender/render.ps1 -Kind backgrounds -Epoch modern

# Kanonische Quelle lesen und den Export ausschließlich isoliert nachweisen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_modern_export.py -- `
  --source art/blender/background-modern.blend `
  --outdir art/blender/candidates/modern-v2/canonical-export-validation --samples 32
```


## Zweite Umgebungsrevision: Burg

Die Burgrevision unter `art/blender/candidates/castle-v2/` ersetzt die
gleichförmigen Kegeltürme durch eine kompakte Hangfestung: offene achteckige
Bastion, höherer rechteckiger Bergfried, runder Turm mit hölzernem Wehrgang,
innerer Fachwerksaal und tiefes, geometrisch offenes Bogentor. Sechs begehbare
Mauerabschnitte, zwei Steintreppen und eine abgestützte Holzbrücke verbinden die
Baukörper. Gemessene Wehrgangbreite: 0,72 Blender-Einheiten; Kamera und Gelände
bleiben unverändert. Die Architektur reicht im Spielbild von y=117,16 bis
y=407,67 und hält HUD sowie die ruhige Kampfzone y=410..525 frei.

Der vollständige HUD-Vergleich `art/qa/visual-castle-candidate.jpg` ist im
Hauptauftrag persönlich geprüft. Der reguläre Exporter erhielt sämtliche
Architektur, Kamera, Gelände und Metadaten; die isolierte 1600×900-Wiederholung
unterscheidet sich an 242 von 1.440.000 Pixeln um maximal eine RGB-Stufe.
`publication-evidence.json` enthält Quellen-/Sicherungshashes und Exportnachweis;
`docs/CASTLE_ART_REVIEW.md` dokumentiert Konstruktion und Wiederholungsbefehle.

Die erste automatische Ausführungsprüfung lehnte die Übernahme vor Prozessstart
ab. Nach unabhängigen zusätzlichen Hash-/Sicherungsnachweisen erlaubte eine
erneute reguläre Prüfung die eng begrenzte Ersetzung. Root integrierte genau
`art/blender/background-castle.blend` und
`public/assets/reborn/backgrounds/castle.png`; beide entsprechen bytegenau dem
geprüften Kandidaten. Die historischen Nachweise bleiben in
`integration-review.json`, das erfolgreiche Ergebnis steht in `promotion.json`.
Alle übrigen vier Hintergrundpaare und die archivierten Originale blieben
unverändert. Der nachfolgende isolierte Reexport aus der kanonischen Quelle
bestand sämtliche Geometrie-, Kamera-, Gelände-, Datei- und Metadatenprüfungen.
`canonical-export-validation/source-validation.json` enthält den gleichen
Geometrie-Hash wie der abgenommene Kandidat.

```powershell
# Burg über den normalen Exporter aus der integrierten Quelle rendern.
./tools/blender/render.ps1 -Kind backgrounds -Epoch castle

# Kanonische Quelle lesen und ausschließlich isoliert nachweisen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_castle_export.py -- `
  --source art/blender/background-castle.blend `
  --outdir art/blender/candidates/castle-v2/canonical-export-validation --samples 32
```

## Zweite Umgebungsrevision: Steinzeit

Die Steinzeitrevision wurde nach zwei persönlichen HUD-Prüfungen des Hauptagenten
als kleine Siedlung in das gemeinsame Tal integriert. Ein Dolmen mit drei
unterschiedlich erodierten Tragsteinen und unregelmäßig geformter Deckplatte
ersetzt die gleichförmigen hohen Steinpfeiler. Zwei Holz-/Lederunterkünfte besitzen
echten Durchhang zwischen den Dachrippen, gefaltete offene Eingangsseiten,
wenige plausible Nähte, eine kleine Flickstelle und Verschnürungen. Feuerstelle,
Arbeitsplatz, Trockenrahmen und Holzvorrat verbinden die Bauten zu einem genutzten
Ort. Niedrige Felsgruppen und 20 variierte Bäume lösen die Zackenreihe und
71 wiederholte Nadelbaumgruppen ab; die ursprünglichen vorderen Randbäume bleiben.

Kamera und kontinuierliches Talmesh sind exakt erhalten. Die gesamte neue
sichtbare Geometrie liegt im 1280×720-Spielraum zwischen y=104,45 und y=408,23,
oberhalb der Kampfzone y=410..525. 27 echte Kontaktmessungen über jeweils
neun Punkte pro Dolmenauflage ergeben Abstand 0; sechs unabhängige
Eingangsstrahlen bleiben frei. `tools/blender/refine_stone.py` baut die neue
Geometrie reproduzierbar aus der archivierten Originalszene; die Fokaliteration
und Nachweise stehen in `docs/STONE_ART_REVIEW.md`.

Root übernahm ausschließlich `art/blender/background-stone.blend` und
`public/assets/reborn/backgrounds/stone.png`. Beide entsprechen bytegenau
den persönlich betrachteten Kandidaten. `art/blender/candidates/stone-v2/promotion.json`
dokumentiert unabhängig bestätigte Vorher-/Nachher-/Kandidatenhashes und erhaltene
Originalbackups. `final-readiness.json` enthält den historischen Zustand vor
der Übernahme.

Der anschließende reguläre Export aus der tatsächlichen kanonischen Szene
schrieb ausschließlich in `canonical-export-validation/`. Alle acht
Geometrie-, Kamera-, Terrain-, Datei- und Metadatenprüfungen bestanden.
Der Geometrie-Hash stimmt mit dem abgenommenen Kandidaten überein.
Die 1600×900-Ausgabe weicht an 228 von 1.440.000 Pixeln um maximal eine RGB-Stufe
vom veröffentlichten Bild ab; Alpha ist identisch. Das ist keine byteidentische
Renderausgabe. Öffentliche Assets und Produktionsbuild wurden durch den
kanonischen Nachweis nicht verändert.

```powershell
# Integrierte Stone-Quelle regulär rendern.
./tools/blender/render.ps1 -Kind backgrounds -Epoch stone

# Dieselbe kanonische Quelle ausschließlich in einem isolierten Prüfpfad exportieren.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_stone_export.py -- --source art/blender/background-stone.blend --outdir art/blender/candidates/stone-v2/canonical-export-validation --samples 32
./.conda/python.exe tools/blender/record_stone_promotion.py
```
