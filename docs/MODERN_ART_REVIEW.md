# Moderne – gezielte Architekturrevision

## Befund an der tatsächlichen Quelle

`art/blender/background-modern.blend` enthielt 585 Objekte. Die Architektur bestand
im Wesentlichen aus 13 `Modern skyline`-Quadern, 91 `Horizontal glass band`-Streifen,
zwei `Communications dish`-Scheiben sowie 16 Teilen zweier gleicher Funkmasten
(`Radio tower leg` / `Radio tower lattice`). Die schmalen Quader wiederholten
Breite 1,3 und Tiefe 1,2; die Streifen waren nur 0,03 Einheiten tief. Ihr Material
`Faction woven cloth and enamel` unterschied sich zu wenig von mattem Baustoff.

Das vorhandene Laufzeitbild wurde vor dem Umbau bei 1280×720 angesehen. Wiederholte
Streifen, gleiche Antennen und wenig differenzierte Dachlinien bestimmten die
Silhouette. Die neue Fassung wurde deshalb um drei Bauaufgaben herum entworfen,
mit sichtbarer Konstruktion statt zusätzlicher beliebiger Kleinteile.

## Eigenständig entworfene Baugruppen

| Baugruppe | Komposition | Sichtbare Konstruktion |
|---|---|---|
| `MOD_SawtoothWorks` | links, Weltzentrum −6 / 23,5 | Ziegel-Maschinenhalle; vier Sägezahndächer mit steilen verglasten Dachflächen; Stahlrahmen; tiefe Sprossenfenster; ein Rolltor; zwei unterschiedlich hohe Schornsteine |
| `MOD_ControlOffice` | mittig, 0,65 / 25,7 | Betonrahmen mit vertieftem Glas; auskragende Geschossdecken und Sonnenschutz; zurückgesetzter höherer Versorgungskern; eine Lüftungsanlage und eine kleine Antenne |
| `MOD_LoadingHall` | rechts, 6,75 / 22,7 | flaches elliptisches Tonnendach mit Stehfalzen; verglaster Dachabschluss; drei rückgesetzte Rolltore; Vordach, Puffer und zwei Schutzpoller |

Die Fassadenöffnungen entstehen durch tatsächliche Aussparungen in analytisch
aufgeteilten Wandflächen. Es gibt keine ununterbrochene Wand hinter den Fenstern.
Glasscheiben sitzen 0,18 Einheiten hinter der äußeren Fassadenebene; dunkle
Innenflächen weitere 0,17 Einheiten dahinter. Rolltore sitzen in tiefen Laibungen.
Dachprofile, Stahlrahmen, Falze, Fensterprofile, Torlamellen und Dachtechnik sind
Geometrie. Der Ziegelverband ist ein eigener Objektkoordinaten-Shader; seine
Koordinaten sind auf die vertikale Fassade ausgerichtet.

Die Palette trennt Materialien: Beton mit Roughness 0,78–0,85, Ziegel 0,88,
Dachmetall 0,48 / Metallic 0,68, Stahl 0,40 / Metallic 0,67 und Glas 0,19 mit IOR
1,45, begrenzter Transmission und klarer Deckschicht. Alte Fraktionsmaterialien
werden für die neue Architektur nicht wiederverwendet. Wenige warme Fensterscheiben
beleben die Szene, ohne jedes Fenster leuchten zu lassen.

## Unveränderte Spielverträge und Prüfergebnisse

Kamera: `Battle valley / fixed horizon`, orthographische Breite 32; Auflösung
1600×900, auf 1280×720 skaliert. Kameramatrix und Projektion wurden vor/nach dem
Aufbau exakt verglichen. Das Gelände wurde über sämtliche Vertices, Polygonindizes,
Materialzuweisungen und seine Weltmatrix gehasht und blieb identisch. Die obere
HUD-Zone endet bei y=82, die untere beginnt bei y=552; Kampfanker y=500.

| Baugruppe | Bildbegrenzung bei 1280×720, links/oben/rechts/unten |
|---|---|
| Maschinenhalle | 260,21 / 133,58 / 539,79 / 373,21 |
| Leitstand | 581,95 / 135,98 / 750,05 / 389,07 |
| Verladehalle | 778,95 / 165,32 / 1041,05 / 417,82 |

Die ersten gemessenen Kamin-/Antennenhöhen wurden vor dem Render reduziert. Alle
Architekturteile halten jetzt mindestens 50 Pixel Abstand zum oberen HUD; kein
Bauteil reicht in die Kampfspur. Terrassensockel wurden mit fünf Gelände-Raycasts
je Baugruppe eingepasst, ohne den Boden zu verschieben. Der Hang erfordert
sichtbare Stützwände, besonders unter der Verladehalle; sie bleiben ein erkennbarer
Teil der aktuellen Komposition.

`metrics.json` enthält Objektlisten, Gelände-/Quellhashes, Materialwerte, Sockelhöhen
und die echten Fenstertreffer zweier Szenen-Raycasts. Der Render wurde aus der
zuvor gespeicherten Kandidaten-Blenderdatei erstellt und bei 1280×720 visuell
geprüft. Die drei Gebäudetypen und ihre Tiefenstaffelung sind deutlich erkennbar.
Der abschließende Vergleich mit dem echten Spiel-HUD erfolgt im Hauptauftrag.

## Dateien und Reproduktion

Nur `art/blender/candidates/modern-v2/` wird beschrieben. Die ursprüngliche
Geometrie bleibt zusätzlich in der render-unsichtbaren Sammlung `MOD_SourceArchive`
im Kandidaten enthalten. Die kanonische Blenderdatei und das Public-PNG wurden nach dem zweiten echten
HUD-Vergleich atomar übernommen. `promotion.json` belegt die vorher geprüfte
Identität der Sicherungen und unveränderte Hashes aller vier anderen
Hintergrundpaare. Das Autorenwerkzeug selbst schreibt weiterhin ausschließlich
in den Kandidatenordner. Dort liegen genaue Sicherungen des Ausgangszustands.

- `candidate.blend` – vollständige editierbare Szene.
- `candidate.png` – 1600×900, RGBA, Cycles/OptiX, 32 Samples mit Denoising.
- `metrics.json` – Quellen-, Layout-, Material- und Geometrienachweise.
- `original-background-modern.blend` und `.png` – unveränderte Ausgangsdateien.
- `tools/blender/refine_modern.py` – eigenständiges bpy-Skript ohne Laufzeitimport
  eines anderen Modellgenerators oder fremde Modelle. Die grundlegenden Mesh- und
  Bodenabfrage-Helfer wurden aus dem geprüften Renaissance-Autorenwerkzeug übernommen;
  Gebäudeentwurf, Geometrie und Materialien sind separat für diese Revision geschrieben.

```powershell
# Kandidat aus dem archivierten Vorgänger erneut aufbauen und rendern.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/refine_modern.py -- `
  --source art/blender/candidates/modern-v2/original-background-modern.blend `
  --outdir art/blender/candidates/modern-v2 --render --samples 32

# Gespeicherte Kandidatenszene ohne erneuten Geometrieaufbau rendern.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/refine_modern.py -- `
  --outdir art/blender/candidates/modern-v2 --render-only --samples 32
```

Diese Revision verbessert die industrielle Identität und Fassadentiefe. Die
stilisierte Landschaft und drei kompakten Hintergrundbauten sind weiterhin eine
bewusste begrenzte Spielfeldkulisse; die Revision allein belegt kein AAA-Niveau.

## Zusätzlicher regulärer Exportnachweis

`tools/blender/audit_modern_export.py` prüft den bestehenden regulären Exporter
auf einer isolierten Kopie des gespeicherten Kandidaten. Der Eingabestand und
Public bleiben dabei per Hash unverändert. Meshes, Kurven, Materialien, Transformen,
Kamera, Gelände und Metadaten wurden beim Export erhalten. Der Nachweis liegt in
`art/blender/candidates/modern-v2/export-validation/source-validation.json`.
`publication-evidence.json` dokumentiert außerdem die exakten Sicherungen und den
Pixelvergleich zum freigegebenen Bild. Beide Ausgaben haben 1600×900 Pixel; minimale
Unterschiede bei wiederholtem GPU-Rendering sind darin ausdrücklich quantifiziert.

```powershell
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_modern_export.py -- `
  --source art/blender/candidates/modern-v2/candidate.blend --samples 32
```


## Abgenommene Betriebshofkorrektur und Übernahme

Nach dem ersten HUD-Vergleich wurden die großen Quadersteinpodeste entfernt.
Die endgültige Szene besitzt schlichte gegossene Betonstützwände mit wenigen
Konstruktionsfugen. Ihre Unterkanten folgen dichter abgetasteten Geländepunkten.
Ein gemeinsamer Servicehof verbindet alle drei Gebäude; 595 Raycasts legen
seine Oberfläche auf den unveränderten Boden. Drei durchgehende Zugänge führen
an die Gebäude. Die rechte Laderampe ist knapp sieben Modell-Einheiten lang und
endet über ihre ganze Breite kontinuierlich am vorhandenen Gelände. Ihre mittlere
Steigung beträgt 17,7 Prozent. Hof und Zugänge reichen im 1280×720-Bild bis y=440,84;
Kampfanker y=500 und beide HUD-Bereiche bleiben erhalten. Der vorherige Kandidat
ist als `before-service-yard.blend` und `before-service-yard.png` erhalten.

Die korrigierte Fassung wurde erneut im echten Spiel-HUD angesehen und danach
für die Übernahme freigegeben. Der reguläre Exporter wurde vor der Übernahme auf
einer isolierten Kopie geprüft: Nur 249 von 1.440.000 Pixeln unterscheiden sich
um maximal eine RGB-Kanalstufe; die Architektur blieb exakt erhalten.
Nach regulärer automatischer Freigabe wurden nur
`art/blender/background-modern.blend` und
`public/assets/reborn/backgrounds/modern.png` atomar ersetzt.

Auch der abschließende Reexport aus der tatsächlichen kanonischen Quelle ist
bestanden. `canonical-export-validation/source-validation.json` bestätigt
`input_is_canonical=true`, denselben Geometrie-Hash wie beim Kandidaten und
unveränderte Kamera, Geländegeometrie, Archivsichtbarkeit, Metadaten sowie
unveränderte Quell-/Public-Dateien während des Tests. Die Szenenmetadaten enthalten
`authored_environment_revision=2`, `environment_id=modern` und den Runtime-Pfad
`backgrounds/modern.png`. Der kanonische Renderpfad lautet
`//../../public/assets/reborn/backgrounds/modern.png`.

```powershell
# Abschließenden isolierten Exportnachweis aus der kanonischen Quelle wiederholen.
& ./downloads/blender-runtime/blender-4.5.13-windows-x64/blender.exe `
  --disable-autoexec -b --python-exit-code 1 --python tools/blender/audit_modern_export.py -- `
  --source art/blender/background-modern.blend `
  --outdir art/blender/candidates/modern-v2/canonical-export-validation --samples 32
```
