# Age of Max: The Long Dawn

Ein Strategiespiel über fünf Zeitalter: Rekrutiere Truppen, halte die Front, baue Verteidigungen und entwickle dein Reich von der Steinzeit bis in die Zukunft. Zerstöre die gegnerische Basis rechts, bevor deine Basis links fällt.

Die Neufassung verbindet eine eigenständig gebaute Blender-Produktion mit einer überarbeiteten Phaser-Simulation. Der Maßstab ist ein deutlich hochwertigeres Erscheinungsbild und ein verlässlicher, taktischer Spielablauf. **AAA-Qualität ist ein offenes Qualitätsziel; ein erfolgreicher Build oder grüne Tests belegen sie nicht.**

## Lokal spielen

Benötigt werden Node.js ab Version 18 und npm. Die Laufzeit benötigt weder Blender noch einen externen Dienst.

```powershell
npm install
npm run dev
```

Öffne die vom Terminal ausgegebene lokale Adresse. Vite verwendet normalerweise Port 5173 und wählt bei einem belegten Port eine andere Nummer. Wähle **Neue Schlacht**, einen Schwierigkeitsgrad und **Schlacht beginnen**. Das Feldhandbuch im Hauptmenü erklärt die Grundlagen.

```powershell
# Produktionspaket erstellen und lokal ansehen
npm run build
npm run preview
```

Das fertige Paket liegt in `dist/` und verwendet den bestehenden Auslieferungspfad `/AgeOfMax/`. Es enthält ausschließlich die 70 benötigten Laufzeitbilder und die Waffenmarker-Datei neben dem Spielcode. Blender-Zwischenbilder und alte Grafiken werden nicht mitkopiert. Die Grafikproduktion unter `public/assets/reborn/` muss vor dem Build vollständig sein.

Geprüfter Produktionsstand vom **9. September 2026 um 05:21 (Europe/Berlin)**: **73 Dateien / 20.987.732 Bytes**, mit angekündigten Taktikwellen, Aufklärung, der neuen Blender-Burg und dem überarbeiteten Steinzeitlager. Alle 71 Runtime-Dateien wurden im Produktionsstart erfolgreich geladen und bytegenau mit den Exporten verglichen. Die Funktionsprüfung besteht mit **23 Browser- und 120 Jest-Tests** sowie TypeScript und Lint. Die aktuelle lokale Spielvorschau läuft unter [127.0.0.1:5191/AgeOfMax/](http://127.0.0.1:5191/AgeOfMax/); dieser Prozess ist an die laufende Sitzung gebunden.

Echte Rekrutierung, Aufklärung, Handbuch, Pause sowie reguläre Niederlage und Ergebnis-Neustart wurden auch im Produktionspaket ohne Entwicklungszugriff geprüft. Der vollständige selbst gespielte Sieg der aktuellen Kampfregeln dauerte **8:26 Minuten** mit **122 Kills** und allen fünf verdienten Epochen. Der unmittelbare Vorgänger bleibt unter `art/qa/releases/stone-v2/previous-dist/` byteidentisch erhalten; das separat geprüfte aktuelle Paket liegt in `art/qa/releases/stone-v2/package/`. Die frühere Fassung vor den Taktikwellen ist zusätzlich unter `art/qa/releases/wave-tactics-v1/previous-dist/` erhalten.

Die zusätzliche Neun-Fälle-Matrix und die Versionen der tatsächlichen Spieltests sind mit ihren Zufalls- und Stichprobengrenzen in [QA_REBUILD.md](docs/QA_REBUILD.md) dokumentiert. Die laufende Arbeit an vollständig überarbeiteten 16-Frame-Animationen bleibt bis zur vollständigen Abnahme im Blender-Kandidatenbereich.

## Steuerung

Alle Hauptbefehle sind über die Oberfläche erreichbar. Tastaturbefehle gelten im aktiven Spiel:

| Taste | Aktion |
|---|---|
| Q / W / E / R | Eine der vier Einheiten des aktuellen Zeitalters rekrutieren |
| A / S / D | Eine der drei Verteidigungen auswählen; danach einen freien Bauplatz anklicken |
| U | Ins nächste Zeitalter aufsteigen, sobald genügend Erfahrung vorhanden ist |
| F | Meteorschauer einsetzen |
| G | Artillerieschlag einsetzen, ab Renaissance |
| I | Aufklärung der angekündigten Welle ein- oder ausblenden |
| 1 / 2 / 3 | Spieltempo 1× / 2× / 4× |
| Leertaste | Pause ein- oder ausschalten |
| Escape | Zuerst Bauauswahl abbrechen, dann offene Aufklärung schließen; sonst Pause öffnen/schließen |

Klicke einen gebauten Turm an, um ihn aufzuwerten oder zu verkaufen. Türme besitzen drei Ausbaustufen. Klicke eine Einheit an, um ihre Werte zu sehen. In Menüs navigieren Tab und Pfeiltasten; Enter bestätigt die Auswahl. Das gilt auch für Pause und Ergebnisansicht. Shift+Tab wählt die vorherige Aktion; der hervorgehobene Fokus folgt auch der Maus.

## Spielablauf

- Gold fließt regelmäßig und durch besiegte Gegner. Rekrutierung und Verteidigungen nutzen denselben Vorrat.
- Vorbereitungs-, Angriffs- und Erholungsphasen geben gegnerischen Wellen einen Rhythmus. Die nächste Welle und ihr Countdown stehen im HUD. Bewege die Maus über die Wellenanzeige oder öffne sie mit Klick bzw. I: Die Aufklärung zeigt gegnerische Epoche, Truppenmengen und einen Taktikhinweis. Das Spiel läuft dabei weiter.
- Mischformationen, Durchbrüche, Schützen und Belagerungen verlangen unterschiedliche Antworten. Eine angekündigte Formation bleibt bis zum Angriff fest; sie reagiert nicht heimlich auf deine Käufe oder deinen Aufstieg.
- Unterschiedliche Rollen ergänzen sich: Frontkämpfer, Fernkampf, schnelle Durchbrüche und Belagerung. Eine Armee ist auf 24 aktive Einheiten begrenzt.
- Erfahrung ermöglicht einen bewussten Aufstieg. Jeder der fünf Epochen gehören vier Einheiten und drei Turmtypen.
- Die Gegner entwickeln sich ebenfalls weiter. Leicht, Normal und Schwer unterscheiden sich bei Startgold, Kopfgeld, Gegnerstärke, Wellengröße, Entwicklungstempo des Gegners, Festung, Festungsgeschütz und Spätverstärkung. Alle Werte stehen gebündelt in `DIFFICULTY` in `src/game/combatRules.ts`.
- Die gegnerische Festung verteidigt sich mit einem Geschütz gegen Angreifer vor ihrer Mauer; unter einem Viertel ihrer Lebenspunkte verstummt es. Einzeln nachrückende Truppen reiben sich an Geschütz und frischen Wellen auf. Sammle Gold und greife mit einer geschlossenen Gruppe an.
- Sobald der Gegner in der Zukunft kämpft, rückt jede weitere Welle etwas stärker an. Die Aufklärung zeigt den Zuschlag als „Stärke +X %“. So läuft keine Schlacht endlos fest.
- Sieg und Niederlage führen zur Ergebnisansicht. Von dort sind eine neue Partie und der Rückweg ins Hauptmenü möglich.

Musik, Effekte und reduzierte Bewegung lassen sich unter **Einstellungen** ändern. Diese Einstellungen werden lokal im Browser gespeichert. Musik und Geräusche entstehen zur Laufzeit über Web Audio und beginnen nach der ersten Bedienung.

## Blender-Produktion

Die Blender-Modelle, Materialien, Kameras und Animationen wurden eigenständig in Blender gebaut. Die gespeicherten .blend-Szenen sind die erhaltenen editierbaren Quellen. Das Spiel verwendet orthografisch gerenderte PNGs; es ist keine dreidimensionale Blender-Laufzeit.

| Inhalt | Laufzeitvertrag |
|---|---|
| 20 Einheitentypen pro Fraktion | 8 Frames à 256 × 256 in einem horizontalen Sprite-Sheet |
| 5 Schlachtfelder | 1600 × 900 |
| 5 Basen pro Fraktion | 512 × 512 |
| 15 Verteidigungsanlagen | 256 × 256 |
| Waffenmarker | 8 projizierte Positionen pro Einheit, passend zur Animation |

Die editierbaren Szenen liegen in `art/blender/`, Laufzeitbilder in `public/assets/reborn/`. Spieler und Gegner erhalten getrennte Materialvarianten. Die Fußanker und die Projektionsdaten für Waffen werden gemeinsam mit der Animation exportiert.

Der ursprüngliche prozedurale Modellgenerator wurde bei einer unterbrochenen Dateischreiboperation beschädigt. Alle 85 gespeicherten .blend-Szenen sind erhalten und wurden in Blender überprüft. Der neue Exporter export_scenes.py rendert diese editierbaren Quellen einschließlich Fraktionsmaterialien, Animation und Waffenmarkern erneut. Eine vollständige Neuerzeugung sämtlicher Geometrie aus einer leeren Szene allein aus dem aktuellen Python-Quelltext wird nicht versprochen.

Produziert wurde mit Blender 4.5.13 LTS. Für die erneute Produktion werden eine Blender-Installation und Python mit Pillow benötigt; die lokale Umgebung nutzt `.conda/python.exe`. Details, konkrete Exportbefehle und die Grenzen der aktuellen Grafikqualität stehen in [BLENDER_ART.md](docs/BLENDER_ART.md).

```powershell
# Die lokale portable Blender-Runtime wird automatisch gesucht.
./tools/blender/render.ps1 -Kind all -Epoch all -Faction both

# Alternativ einen installierten Blender explizit angeben.
./tools/blender/render.ps1 -Kind all -Epoch all -Faction both -BlenderPath 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe'

# Exportierte Bilder prüfen.
./.conda/python.exe tools/blender/verify_art.py
```

Ein vollständiger Neurender ist eine GPU-Produktion und dauert deutlich länger als ein Spielbuild. Das heruntergeladene Blender-Programm gehört nicht in Git.

## Entwicklung und Prüfung

```powershell
# TypeScript und isolierte Gameplay-Regeln
npx tsc --noEmit
npm run test:unit -- --runInBand

# Browser-Integration
npm test

# Auslieferungsbuild
npm run build
```

Die Playwright-Prüfung benötigt alle fertigen Laufzeitbilder und Waffenmarker. Der Vorabtest prüft Vollständigkeit, Bildabmessungen, PNG-Abschluss und getrennte Fraktionsbilder. Danach folgen echte Canvas-Eingaben für Menüs, Einstellungen, Rekrutierung, Pause, Tempo, Bauplätze, Fähigkeiten, Epochen und Ergebnisfluss.

Playwright nutzt lokal installiertes Chrome unter Windows, sonst sein Chromium. Über `QA_BROWSER_PATH` kann eine andere lokale Browserdatei gewählt werden. Falls kein Browser installiert ist, stellt `npx playwright install chromium` den Testbrowser bereit. Die Suite betreibt einen eigenen lokalen Vite-Server auf **127.0.0.1:5190**, ohne HMR und ohne automatisch geöffnete Fenster.

Bildschirmfotos der Browserprüfung schreibt ein normaler `npm test` nur in den ignorierten Ordner `test-results/`, je Test in einen eigenen Unterordner. Die aufgezeichneten Nachweisbilder in `art/qa/` bleiben dabei unverändert: die drei Dialogbilder `pause-keyboard-focus.png`, `victory-keyboard-focus.png` und `defeat-keyboard-focus.png` sowie die fünf Aufklärungskarten `wave-tactics-v1/intel-{epoch}-900.png` für `stone`, `castle`, `renaissance`, `modern` und `future`. Nur ein ausdrücklich angeforderter Nachweislauf überschreibt diese acht Dateien. Sieh dir die neuen Bilder danach an und übernimm sie nur bewusst in einen Commit.

```powershell
# Nachweisbilder in art/qa/ bewusst neu aufnehmen
$env:QA_CAPTURE_EVIDENCE = '1'
npm test
# Sonst gilt die Variable für jeden weiteren Lauf dieser PowerShell-Sitzung
Remove-Item Env:QA_CAPTURE_EVIDENCE
```

`tools/combat-playthrough.mjs` ist eine zusätzliche technische Simulation mit automatisierten Kaufentscheidungen und beschleunigter interner Zeitschleife. Sie ersetzt keine tatsächlich über die Oberfläche gespielte Partie. Mit `QA_SEED` kontrolliert sie Startzeit, Zufallsfolgen und eine getrennte Testuhr; jede Ausführung schreibt neue Berichte statt alte Nachweise zu überschreiben. `node tools/run-seeded-balance.mjs` vergleicht drei Strategien/Schwierigkeiten mit drei Seeds. Ergebnisse, überprüfte Grenzen und echte Spielnachweise werden in [QA_REBUILD.md](docs/QA_REBUILD.md) getrennt dokumentiert.

`node tools/balance-matrix.mjs` kalibriert die Schwierigkeitsgrade: Es spielt komplette Partien mit acht Spielertypen vom Anfänger bis zum Experten, jeweils mit gesetzter „Tagesform“ pro Seed, auf der internen Spieluhr ohne Darstellung. Es benötigt den QA-Server (Standard 127.0.0.1:5190, sonst `QA_BASE_URL`) und schreibt JSONL-Rohdaten sowie eine Markdown-Übersicht nach `art/qa/<Gruppe>/` (`QA_REPORT_GROUP`). `QA_DIFFICULTIES`, `QA_STRATEGIES`, `QA_SEEDS`, `QA_SPEED` (1, 2 oder 4), `QA_PARALLEL`, `QA_MAX_MINUTES` (Zeitgrenze, Standard 20) und `QA_VARIANTS` (JSON-Datei mit Balance-Varianten) steuern den Lauf. Bot-Ergebnisse ersetzen keine menschlichen Partien; die Kalibrierung und ihre Grenzen stehen in [QA_REBUILD.md](docs/QA_REBUILD.md).

## Orientierung im Projekt

| Pfad | Inhalt |
|---|---|
| `src/scenes/` | Laden, Menüs, Schlacht und HUD |
| `src/game/` | Kampfregeln und begrenzte visuelle Effekte |
| `src/audio/` und `src/utils/` | Audio und unterstützende Systeme |
| `src/ui/` | Gestaltung, deutsche Bezeichnungen und Rollen |
| `data/` | Einheiten, Epochen, Turmdaten und Spielbalance |
| `tools/blender/` | Modellierung, Rendern, Montage und Grafikprüfung |
| `e2e/` | Browserprüfungen und eigener QA-Server |
| `art/qa/` | Screenshots, Messungen und Spielprotokolle |
| `docs/REBUILD_PLAN.md` | Eigenständiger Entwurf und Qualitätskriterien |

Die bestehende Spiellogik wurde überarbeitet; die Umsetzung bleibt ein kompaktes seitliches Strategiespiel. Breite Inhalte einer großen Studioproduktion, umfangreiche Figurenanimationen und professionell produzierte Musik sind noch keine erreichten Eigenschaften dieses Stands.
