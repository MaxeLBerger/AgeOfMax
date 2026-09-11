# Prüfprotokoll der Neufassung

Stand: 9. September 2026. Dieses Protokoll trennt technische Integration, automatisierte Balance-Simulation und eine tatsächlich über die Oberfläche gespielte Partie. Planung: [REBUILD_PLAN.md](REBUILD_PLAN.md). Blender-Quellen und Exportvertrag: [BLENDER_ART.md](BLENDER_ART.md).

**Abschließend geprüft am 9. September 2026 um 04:17 (Europe/Berlin): 19/19 Browserprüfungen, 74/74 Jest, TypeScript und Lint grün. Der freigegebene Produktionsbuild enthält 73 Dateien mit 20.892.182 Bytes.** Die nachfolgenden früheren Größen und Zwischenstände bleiben als historische Nachweise gekennzeichnet; der abschließende Auslieferungsnachweis steht am Ende.

## Bestätigte Ergebnisse vor der abschließenden Grafik- und Trefferkorrektur

| Prüfung | Ergebnis |
|---|---|
| TypeScript | Erfolgreich; auch QA-Dateien und Build-Konfiguration separat geprüft |
| Gameplay-Regressionen | 73 von 73 Jest-Prüfungen im Hauptauftrag bestanden |
| Vollständige Browser-Suite | **15 von 15 bestanden**, 47,1 Sekunden |
| Wiederholung kritischer Eingaben | Escape/Turmausbau und Ausbau nach Einkommen jeweils viermal bestanden; 8 von 8 |
| Produktionsbuild | Erfolgreich; 73 Dateien, **20.742.613 Bytes** insgesamt |
| Produktionsstart | Unter `/AgeOfMax/` alle 71 benötigten Runtime-Dateien mit HTTP 200 geladen, keine Laufzeitfehler |
| Produktionsschnittstelle | Die Entwicklungsbrücke `window.__AGE_OF_MAX__` ist im Produktionspaket nicht vorhanden |
| Eigene UI-Partie | Normal, Sieg nach **8:44,645 Simulationszeit**, alle fünf Epochen, 125 besiegte Gegner |
| Neustart über Ergebnisansicht | Zurück in Steinzeit mit Tempo 1×, leerer Verteidigung und einem korrekt bezahlten neuen Keulenkrieger |

Der abschließende Produktions-Screenshot wurde selbst angesehen: deutsches HUD, Blender-Schlachtfeld, beide Basen und drei tatsächlich gekaufte Einheiten sind sichtbar. Der Quellordner enthält zusätzliche Blender-Zwischenbilder und historische Grafiken; diese werden nicht in das Produktionspaket übernommen. Das Build-Plugin emittiert nur die 70 benötigten PNGs und `weapon-sockets.json`.

Vite weist weiter auf den etwa 1,59 MB großen JavaScript-Chunk und statisch wie dynamisch importierte Szenen hin. Der Build gelingt. Eine Aufteilung des Phaser-Bundles und gezielte Ladezeitmessungen bleiben mögliche Verbesserungen.

## Browserabdeckung

Die fünfzehn Prüfungen benutzen ein separates installiertes Chrome, einen Worker und `http://127.0.0.1:5190` ohne HMR.

1. Rekrutierung per Maus und Tastatur: richtiger Typ, genau ein Kauf, korrekter Goldabzug und tatsächliche Bewegung.
2. Vier schnelle Q-Befehle bei drei besetzten Ausgängen: nur drei Käufe, Rückmeldung ohne zusätzlichen Goldabzug; ein neuer Kauf funktioniert nach dem Abmarsch.
3. Pause bei 1× und 4×: Simulationszeit, Einkommen, Welle, Einheiten, Projektile, Animationsframes und Fähigkeitsanzeige bleiben stehen. Pausierte Befehle verändern die Schlacht nicht.
4. Bauauswahl abbrechen, Turm bauen, auf Stufe drei aufwerten, Aufwertung begrenzen und korrekt verkaufen.
5. Mit echtem Startgold Palisade und zwei Keulenkrieger kaufen, das noch unbezahlbare Ausbaumenü offen halten, reguläres Einkommen abwarten und anschließend ohne Neuöffnen ausbauen.
6. Fähigkeiten: Epochenfreigabe, Abklingzeit und zeitabhängige Wiederverfügbarkeit.
7. Alle fünf Epochenbilder, beide Fraktionskataloge, acht numerische Sprite-Frames pro Einheit und Waffenmarker im tatsächlichen Laufzeit-Cache.
8. Gültiges JSON mit beschädigtem Waffenmarker-Vertrag: sichtbarer Ladefehler verhindert den Spielstart. Der echte Wiederholen-Button lädt nach Beseitigung des Fehlers erfolgreich.
9. Tastaturmenüs, gespeicherte Einstellungen und Mausklicks nach Änderung der Browsergröße. Ein passiver Analyser prüft tatsächliche Musik- und Effektbusse: laufender AudioContext, messbares Musiksignal, stumm geschaltetes Signal, Wiederkehr nach Lautstärkeänderung und Effekt bei Rekrutierung.
10.–12. Frischer Spielstart für Leicht, Normal und Schwer mit jeweiliger Wirtschaft.
13. Alle zwanzig Einheiten und fünfzehn Turmtypen über die Oberfläche; Aufstieg, Erfahrungsrest und unabhängige Basenwerte.
14.–15. Sieg und Niederlage über einen tatsächlichen letzten Treffer, angehaltener Ergebniszustand und Neustart ohne doppelte Event-Handler.

Einige Bau-, Fähigkeits-, Katalog- und Ergebnisprüfungen bereiten absichtlich Werte wie Gold, Erfahrung oder eine fast zerstörte Basis vor. Testnamen und Hilfsfunktionen kennzeichnen das als technische Einrichtung. Diese Prüfungen behaupten keine erspielten Siege.

Der Export-Vorabtest prüft siebzig tatsächliche PNGs und die Waffenmarker-Datei: zwanzig Einheitentypen je Fraktion, fünf Basen je Fraktion, fünf Hintergründe und fünfzehn Türme. Er kontrolliert Abmessungen, PNG-Dateiende, acht endliche Waffenpositionen je Einheit und unterschiedliche Fraktionsbilder. Der zusätzliche benannte Portrait-Frame zählt nicht als neuntes Animationsbild.

## Während der Prüfung gefundene Fehler

Ein einzelnes natives KeyboardEvent wurde in Phasers Queue gelegentlich mehrfach verarbeitet. So hob ein doppelt ausgeliefertes A die gerade gewählte Verteidigung wieder auf; doppelt ausgeliefertes Escape konnte nach dem Abbruch zusätzlich Pause aktivieren. Identische Zeitstempel und Eventidentitäten wurden in wiederholten echten Browsereingaben nachgewiesen. Eine gemeinsame WeakSet-Prüfung verarbeitet jedes Eventobjekt nur einmal, ohne neue schnelle Tastendrücke zu unterdrücken. Der vollständige Browserlauf besteht danach.

Weitere Korrekturen betreffen den zeitlich konsistenten Umgang mit 125-ms-Frames, Projektiltreffer vor dem Entfernen außerhalb des Bildes, durch Einkommen freigeschaltete Turmmenüs und deutsche Epochenbezeichnungen. Separate Regressionen prüfen diese Fälle.

Zwei Testannahmen wurden korrigiert: Die Fähigkeitsanzeige braucht den nächsten UI-Update, und ein Reload muss vor dem erneuten Szenen-Poll wirklich beginnen. Neue Turmschaltflächen werden erst nach ihrer tatsächlichen Darstellung angeklickt. Der Audio-Analyser beobachtet die Busse auch vor dem gemeinsamen Limiter; ein fehlendes Messergebnis aus einem falschen Messpunkt wird nicht als Spielfehler ausgegeben.

## Tatsächlich gespielte Partie

Das Protokoll [manual-playthrough.jsonl](../art/qa/manual-playthrough.jsonl) enthält die einzelnen Maus-/Tastaturaktionen, Pausen, Screenshots und gelesenen Spielzustände. Gold, Erfahrung, Basenwerte und Simulationszeit wurden nicht künstlich gesetzt. Die Partie nutzte Tempo 4× mit Denkpausen; **8:44,645 bezeichnet Simulationszeit, nicht verstrichene Echtzeit**.

Die eigene Steinzeitbasis fiel bis auf 1.998 von 4.200 HP. Verteidigung, Rekrutierung, Spezialangriffe und Epochenwechsel ermöglichten die Erholung. Ein Pfeilturm wurde tatsächlich auf Stufe zwei ausgebaut. In der Zukunft erreichten Laser-Soldat, Mech, Plasma-Soldat und schwerer Zukunftssoldat die Front. Der Sieg kam bei Welle 12 und 125 besiegten Gegnern; die eigene Basis hatte 12.260 von 14.000 HP, die gegnerische Basis 0 HP.

Über den Ergebnisbutton begann anschließend eine neue Partie. Nach genau einem neuen Q-Kauf zeigte das Protokoll 1.008 ms, Tempo 1×, 198 Gold = 240 − 50 + 8 Einkommen, genau einen Keulenkrieger mit UID 1, volle Steinzeitbasen und leere Bauplätze.

Die lang laufende Seite war vor den letzten Korrekturen an Zeitabgleich, Event-Deduplizierung und deutscher Gegnerbeschriftung geladen worden. Die echte vollständige Partie und die anschließend frisch geladenen finalen Regressionen sind deshalb **getrennte Nachweise**, keine Behauptung, derselbe lange Browserlauf habe jede zuletzt geänderte Zeile benutzt.

| Bild | Inhalt |
|---|---|
| [Produktionsstart](../art/qa/production-battle.jpg) | Tatsächlicher Produktionsbuild, drei Käufe |
| [Zukunft](../art/qa/manual-final-future.png) | Alle fünf Epochen erspielt |
| [Ende der Partie](../art/qa/manual-final-result-or-front.png) | Tatsächlicher Sieg |
| [Neustart](../art/qa/manual-final-restart.png) | Zurückgesetzte Partie mit einem Kauf |

## Technische Balance-Simulation

Diese Läufe steuern die reale Phaser-Simulation und normale Spielbefehle programmatisch. Sie stoppen die Echtzeitschleife und rufen die interne Zeitschleife direkt auf. Sie vergeben keine zusätzlichen Ressourcen, ersetzen aber keine eigene UI-Partie.

| Schwierigkeit / Strategie | Ergebnis | Simulationszeit | Käufe | Meteor / Artillerie | Endepoche |
|---|---|---:|---:|---:|---|
| Normal / gemischt | Sieg | 209,0 s | 39 | 0 / 0 | Renaissance |
| Normal / gemischt, Fähigkeiten deaktiviert | Sieg | 209,0 s | 39 | 0 / 0 | Renaissance |
| Schwer / gemischt | Sieg | 278,3 s | 49 | 3 / 1 | Renaissance |
| Normal / keine Befehle | Niederlage | 147,5 s | 0 | 0 / 0 | Steinzeit |

Alle vier gespeicherten Läufe melden keine unbehandelten Laufzeitfehler. Die drei gemischten Läufe endeten mit vollen eigenen Renaissancebasen, 7.600 HP. Ohne Befehle fiel die eigene Basis vollständig; die gegnerische Mittelalterbasis hatte 5.600 HP.

Die Bot-Strategie kauft schnell nach einer festen gemischten Reihenfolge und steigt bei ausreichender Erfahrung sofort auf. Meteor wird erst bei mindestens fünf Gegnern und einem Gegner links von x=650 angefordert; Artillerie erst ab Renaissance bei mindestens sieben Gegnern. Der offensive normale Lauf erreichte die Meteorbedingung nicht. Sein Vergleich ohne Fähigkeiten ist daher **kein allgemeiner Nachweis zur Stärke von Meteor**, sondern zeigt, dass dieser frühe Sieg keine Fähigkeit brauchte.

Die Läufe sind nicht mit einer kontrollierten Zufallsfolge gekoppelt. Ein früher schwerer Lauf endete bereits nach 229,3 s; der zuletzt gespeicherte Lauf mit Einsatzzählern brauchte 278,3 s. Diese Stichproben zeigen eine wirksame schnelle Angriffsstrategie und Spielraum für weitere Balanceprüfung. Sie belegen weder eine typische Partiedauer noch einen Fehler allein dadurch, dass ein geübter früher Angriff vor der Zukunft gewinnen kann. Die selbst gespielte Partie dauerte deutlich länger.

Die damaligen JSON-Dateien und Endbilder bleiben unter `art/qa/combat-{difficulty}-{mode}-{speed}x.*` erhalten. Neue Läufe erhalten zusätzlich Seed, Zeitstempel und Zufallskennung; sie überschreiben keine früheren Ergebnisse.

## Werkzeuge und verbleibende Grenzen

```powershell
npx tsc --noEmit
npm run test:unit -- --runInBand
npm test
npm run build
```

Ein normaler `npm test` schreibt seine Bildschirmfotos nur in den ignorierten Ordner `test-results/`. Die acht aufgezeichneten Nachweisbilder der Browserprüfung in `art/qa/` bleiben dabei unverändert: `pause-keyboard-focus.png`, `victory-keyboard-focus.png`, `defeat-keyboard-focus.png` und `wave-tactics-v1/intel-{epoch}-900.png` für alle fünf Epochen. Nur mit `QA_CAPTURE_EVIDENCE=1` (PowerShell: `$env:QA_CAPTURE_EVIDENCE = '1'`) überschreibt die Suite genau diese Dateien. Ein solcher Lauf ist eine neue Aufnahme: Die Bilder werden vor einem Commit persönlich geprüft und nur bewusst übernommen.

`tools/combat-playthrough.mjs` akzeptiert `QA_BASE_URL`, `QA_DIFFICULTY` (`easy`, `medium`, `hard`), `QA_MODE` (`mixed`, `line`, `idle`), `QA_SPEED` (`1`, `2`, `4`) sowie `QA_ABILITIES=0` zum Ausschalten beider Spezialfähigkeiten. `QA_SEED` aktiviert die unten beschriebene kontrollierte Zufallsfolge und Testuhr; `QA_REPORT_GROUP` legt einen eigenen Unterordner unter `art/qa/` an.

`tools/production-smoke.mjs` überprüft eine laufende Vorschau unter `http://127.0.0.1:5191/AgeOfMax/`, führt echte Klicks und Rekrutierung aus und speichert Bilder. Es hat keinen Zugriff auf eine Entwicklungsbrücke. `tools/qa-browser.mjs` dient einem getrennten, fortsetzbaren UI-Browser auf dem lokalen CDP-Port 9224. `connectToManualPage()` verbindet einen kurzlebigen Steueraufruf mit dieser Seite. Der Aufrufer darf den langfristigen Browser nicht schließen.

Ein vollständiger Assetvertrag, acht verschiedene Frames und grüne Tests beweisen weder gute Animation noch AAA-Gestaltung oder dauerhaft guten Spielspaß. Die derzeitige Grafik ist eine zusammenhängende stilisierte Indie-Produktion. Vereinfachte Gesichter, vier Gangphasen, wenige Trefferreaktionen und wiederholte Umweltformen bleiben sichtbare Grenzen. Die beobachteten 120 FPS in einzelnen Spielproben sind keine systematische Leistungszusage für andere Rechner. Langfristige Balance, Zugänglichkeit, weitere Gerätekonfigurationen und ein breiterer Spieltest bleiben separat zu beurteilen. **Das AAA-Ziel ist nicht als erreicht nachgewiesen.**

## Nachprüfung mit frisch geladenem Endstand

Nach dem vollständigen normalen Sieg wurde die Seite neu geladen und eine schwere Partie mit dem endgültigen Tastatur- und Zeitcode begonnen. Echte Eingaben über mehrere getrennte Browser-Verbindungen schalten Pause nun jeweils genau einmal um. Bis 1:55,753 wurden 23 Gegner besiegt, die Mittelalter-Epoche regulär freigeschaltet und eine Palisade gebaut; Basis 5.600/5.600 HP. Die Partie bleibt pausiert und gilt als zusätzliche Bedien-/Fortschrittsprüfung, nicht als weiterer abgeschlossener Sieg. Screenshots: manual-final-hard-defense.png und manual-final-hard-castle.png. Keine Ressourcen oder Simulationswerte wurden gesetzt; der Browser meldet weiterhin keine Laufzeitfehler.


## Kontrollierte Balance-Reihe, vor der Trefferkorrektur

Die neun Läufe in [seed-matrix-20260909T014354814Z/summary.json](../art/qa/seed-matrix-20260909T014354814Z/summary.json) verwenden dieselbe Version von Kampfcode, Daten, Waffenmarkern und Bot. SHA-256 des protokollierten Quellenverbunds: `2d7ce3f34dc814a6c6d044a620296057c5b3e100f61384ccb414a2f55add1a5e`. Die einzelnen JSON-Berichte enthalten die Hashes der jeweiligen Dateien, jeden bezahlten Kauf, Armee-Zusammensetzung, Epochenwechsel, Fähigkeitsaufrufe und 30-Sekunden-Schnappschüsse.

Der Browser stoppt noch im Menü. Szenenanlage und technische Simulation laufen danach im selben JavaScript-Aufruf; kein echter Schlachtframe kann sich vor den ersten Messpunkt schieben. Alle neun Starts wurden unmittelbar nach `create()` bei Simulationszeit 0, Erfahrung 0, Kills 0, leeren Armeen und regulärem Startgold kontrolliert: Normal 240, Schwer 200. Jeder erfolgreiche Kauf muss den normalen Preis bezahlen. Es werden weder Ressourcen noch Lebenspunkte gesetzt.

Nur innerhalb dieses separaten Testbrowsers werden `Math.random` und die tatsächlich geladene Phaser-Zufallsquelle anhand von `QA_SEED` initialisiert. Zusätzlich beginnen die direkten Frame-Zeitstempel bei 0 und `Date.now` folgt einer festen Testuhr mit 16,667 ms pro unskaliertem Schritt. Das ist nötig, weil Phaser-Tweens intern auch die Wanduhr lesen und ihr Ende den weiteren Verbrauch von Zufallszahlen beeinflussen kann. **Diese Testuhr verändert keinen Laufzeitcode des normalen Spiels.** Alle Vergleichspartien laufen bei 1× mit derselben Entscheidungsfrequenz von 1,5 Simulationssekunden. Ein zusätzlicher exakter Wiederholungslauf Normal/gemischt/101 stimmt in sämtlichen protokollierten Zuständen einschließlich Zufallszustand überein; Metadaten wie Dateiname und Erstellungszeit sind ausgenommen. Eine vollständige Wiederholbarkeitsbehauptung für alle anderen Konfigurationen folgt daraus nicht.

| Schwierigkeit / Strategie | Seed | Ergebnis | Zeit (s) | Käufe / Gold | Kills | Letzte Epoche | Kleinster eigener HP-Anteil | Meteor / Artillerie |
|---|---:|---|---:|---:|---:|---|---:|---:|
| Normal / gemischt | 101 | Sieg | 183,383 | 34 / 3.365 | 36 | Mittelalter | 100 % | 0 / 0 |
| Normal / gemischt | 202 | Sieg | 183,383 | 34 / 3.365 | 36 | Mittelalter | 100 % | 0 / 0 |
| Normal / gemischt | 303 | Sieg | 183,383 | 34 / 3.365 | 36 | Mittelalter | 100 % | 0 / 0 |
| Schwer / gemischt | 101 | Niederlage | 835,900 | 138 / 48.690 | 238 | Zukunft | 0 % | 14 / 9 |
| Schwer / gemischt | 202 | Niederlage | 933,167 | 155 / 57.985 | 269 | Zukunft | 0 % | 15 / 11 |
| Schwer / gemischt | 303 | Sieg | 361,117 | 64 / 10.795 | 94 | Moderne | 100 % | 4 / 1 |
| Normal / Linie | 101 | Nach 16 Minuten offen | 960,000 | 180 / 56.050 | 253 | Zukunft | 73,84 % | 17 / 11 |
| Normal / Linie | 202 | Niederlage | 894,600 | 167 / 49.030 | 227 | Zukunft | 0 % | 15 / 11 |
| Normal / Linie | 303 | Nach 16 Minuten offen | 960,000 | 173 / 54.675 | 247 | Zukunft | 71,95 % | 17 / 10 |

„Nach 16 Minuten offen“ ist ein abgebrochener Beobachtungszeitraum, weder Sieg noch Niederlage. HP-Anteile werden pro Schritt gegen die gerade gültige maximale Basisgesundheit gemessen; ein Epochenwechsel verfälscht den Nenner nicht. „Gold“ bezeichnet ausschließlich die tatsächlich bezahlten Einheiten.

Die gemischte Strategie rotiert pro Epoche durch Frontkämpfer, Fernkampf und weitere Rollen; die genaue Reihenfolge steht im Bericht. „Linie“ verwendet jeweils nur den ersten Eintrag: Keulenkrieger, Schwertkämpfer, Duellant, Panzer und Mech. Es handelt sich deshalb nicht durchgehend um Nahkampf. Beide Strategien steigen sofort auf, wenn die Erfahrung reicht, und verwenden dieselben Fähigkeitsbedingungen. Bei Normal/gemischt entstehen keine Meteor-Einsätze, weil die vorgeschriebene Gegnerkonzentration vor der eigenen Hälfte ausbleibt.

Die historischen Bots versuchen einmal, Turmindex 0 zu bauen, sobald nach dem Rekrutieren 200 Gold übrig sind. In allen neun Läufen geschieht das nach der Steinzeit; der inzwischen unpassende Katalogeintrag wird korrekt abgewiesen und kostet nichts. **Keiner dieser Läufe enthält tatsächlich gebaute Verteidigung.** Diese Einschränkung bleibt zwischen den Versionen bewusst identisch. Eine spätere Untersuchung von Turmstrategien muss passende Türme des aktuellen Zeitalters einsetzen.

Die gegnerische Einheitenwahl folgt einer festen Wellenreihenfolge, keiner zufälligen Strategieauswahl. Drei Seeds sind daher keine drei unabhängigen Spielsituationen. Insbesondere die drei normalen gemischten Siege sind ohne zufällige Flächentreffer erwartbar identisch. Die Unterschiede der schweren und langen Linienpartien zeigen, dass kleinere Treffer- und Fähigkeitsunterschiede den weiteren Verlauf beeinflussen können. Die frühe gemischte Armee ist in dieser eingeschränkten Normal-Probe erfolgreicher als diese konkrete Linienstrategie; daraus folgt keine allgemeine Überlegenheit eines Rushs gegenüber allen Spielweisen oder Schwierigkeiten.

Die älteren ungesetzten Läufe mit 209 bis 278 Sekunden begannen noch nach unterschiedlich vielen echten Startframes und verwendeten keine feste Test-Wanduhr. Sie sind historische Funktionsproben und dürfen nicht als kausaler Vorher-/Nachher-Vergleich mit dieser Reihe interpretiert werden.

Reproduzierbare neue Einzelprobe bei laufendem QA-Server:

```powershell
$env:QA_SEED = '101'
$env:QA_DIFFICULTY = 'medium'
$env:QA_MODE = 'mixed'
$env:QA_SPEED = '1'
$env:QA_REPORT_GROUP = 'eigener-vergleich'
node tools/combat-playthrough.mjs
```

`node tools/run-seeded-balance.mjs` legt eine neue Gruppe an und führt die neun Konfigurationen nacheinander sowie eine zusätzliche Wiederholung von Normal/gemischt/101 aus.


## Endstand nach Figuren- und Trefferkorrektur

Die veröffentlichten Sniper- und Titan-Modelle, ihre beiden Fraktionsvarianten und ihre animierten Waffenmarker sind integriert. Der Treffervergleich verwendet jetzt den ersten Eintritt eines Projektilsegments in einen Einheitenkreis. Zuvor wurde die Projektion des Kreismittelpunkts verglichen: Eine Einheit, deren Körper vor die Basiswand ragte, konnte dadurch übergangen werden. Die Regression mit einer tatsächlich vor der Wand stehenden Einheit prüft nun die unbeschädigte Basis auf beiden Spielfeldseiten. Die aktuellen Trefferregeln und Waffenmarker unterscheiden sich bewusst von der oben archivierten Reihe; Kaufpreise, Gegnerdaten und Bot-Entscheidungen blieben gleich.

| Prüfung des neuen Stands | Ergebnis |
|---|---|
| Gameplay-Regressionen | 74 von 74 im Hauptauftrag bestanden; TypeScript erfolgreich |
| Vollständige Browser-Suite | **15 von 15 bestanden**, 51,2 Sekunden |
| Produktionsbuild | Erfolgreich, 73 Dateien / **20.811.228 Bytes** |
| Produktionsstart | 71 Runtime-Dateien mit HTTP 200, keine Laufzeitfehler, keine Entwicklungsbrücke |
| Sichtprüfung des Produktionsbilds | Deutsches HUD, beide Basen und drei reale Käufe; 63 Gold = 240 − 185 + 8 |
| Grafikprüfung | 85 Bilder, 85 erneut geöffnete Blender-Quellen und 20 Marker-IDs ohne Fehler; Figurenpromotion im Art-Protokoll dokumentiert |

Die ersten drei Nachproben und der Geschwindigkeitsvergleich stehen in [seed-after-precision-20260909T014939302Z/summary.json](../art/qa/seed-after-precision-20260909T014939302Z/summary.json). Weil sich Schwer/gemischt/101 vom Verlust zum Sieg änderte, wurde anschließend die ganze Neuner-Matrix frisch geladen und wiederholt. Alle Läufe verwenden den Quellenverbund `5c4077b107a81ef5133060bee0234a731fd2d0f619b8ea9afa34ce25dbff0278`. [Neue vollständige Matrix](../art/qa/seed-matrix-20260909T015030625Z/summary.json).

| Schwierigkeit / Strategie | Seed | Ergebnis | Zeit (s) | Käufe / Gold | Kills | Letzte Epoche | Kleinster eigener HP-Anteil | Meteor / Artillerie |
|---|---:|---|---:|---:|---:|---|---:|---:|
| Normal / gemischt | 101 | Sieg | 184,917 | 33 / 3.255 | 36 | Mittelalter | 100 % | 0 / 0 |
| Normal / gemischt | 202 | Sieg | 184,917 | 33 / 3.255 | 36 | Mittelalter | 100 % | 0 / 0 |
| Normal / gemischt | 303 | Sieg | 184,917 | 33 / 3.255 | 36 | Mittelalter | 100 % | 0 / 0 |
| Schwer / gemischt | 101 | Sieg | 314,667 | 55 / 8.625 | 81 | Moderne | 100 % | 4 / 1 |
| Schwer / gemischt | 202 | Niederlage | 749,067 | 125 / 42.285 | 216 | Zukunft | 0 % | 12 / 8 |
| Schwer / gemischt | 303 | Sieg | 362,883 | 64 / 10.795 | 94 | Moderne | 100 % | 4 / 1 |
| Normal / Linie | 101 | Nach 16 Minuten offen | 960,000 | 176 / 54.755 | 249 | Zukunft | 100 % | 17 / 11 |
| Normal / Linie | 202 | Niederlage | 891,367 | 164 / 47.670 | 219 | Zukunft | 0 % | 16 / 10 |
| Normal / Linie | 303 | Niederlage | 741,550 | 140 / 33.955 | 173 | Zukunft | 0 % | 12 / 8 |

Alle neun Läufe beginnen wieder mit den kontrollierten unveränderten Startwerten, melden keine Laufzeitfehler und protokollieren ausschließlich bezahlte Käufe. Auch der neue zusätzliche Wiederholungslauf Normal/gemischt/101 stimmt exakt in den gespeicherten Zuständen überein. Die fehlgeschlagenen historischen Turmversuche bleiben in dieser Reihe unverändert; es ist weiterhin kein Verteidigungsvergleich.

Normal/gemischt erreicht wieder drei frühe Siege ohne eigene Basisschäden oder Fähigkeiten. Normal/Linie erreicht keinen Sieg: zwei Niederlagen und einen offenen Verlauf. Schwer/gemischt erreicht zwei Siege und eine Niederlage. Drei Seeds und diese feste gegnerische Wellenfolge reichen nicht für eine belastbare allgemeine Siegquote. Die erste gespeicherte Abweichung des schweren 101-Laufs liegt bereits im Mittelalter bei 150 Sekunden, vor dem Einsatz der veränderten Sniper-/Titan-Waffenmarker. Die korrigierte Kollisionsreihenfolge beeinflusst somit schon den frühen Kampf; die spätere Änderung des ganzen Partieverlaufs ist kein isolierter Beleg für die Stärke einer einzelnen Einheit oder Fähigkeit.

Die Beobachtung rechtfertigt eine gezielte weitere Rollenprüfung: dieselbe Linienfolge einmal mit jedem dritten Kauf als Fernkämpfer und die gemischte Folge einmal mit korrekt zum aktuellen Zeitalter gewähltem Turm vergleichen. Anschließend sollten echte Spieler mit normalen Entscheidungspausen dieselben Schwierigkeiten spielen. In diesem QA-Schritt wurden keine Balancewerte verändert.

## Vergleich von 1× und 4×

Ein zusätzliches Paar am neuen Stand verwendet Normal/gemischt, Seed 101 und weiterhin Entscheidungen alle 1,5 Simulationssekunden. Bei 4× deckt ein technischer Frame mehr Simulationszeit ab; Treffer- und Kaufzeitpunkte müssen deshalb nicht pixel- oder framegleich sein.

| Tempo | Ergebnis / Zeit | Kills / Welle | Käufe / Gold | Eigene Basis | Armee am Ende | Meteor / Artillerie |
|---|---|---:|---:|---:|---:|---:|
| 1× | Sieg / 184,917 s | 36 / 4 | 33 / 3.255 | 5.600 / 5.600 | 11 | 0 / 0 |
| 4× | Sieg / 185,400 s | 36 / 4 | 34 / 3.365 | 5.600 / 5.600 | 13 | 0 / 0 |

Der Sieg verschiebt sich um 0,483 Simulationssekunden, etwa 0,26 %. Ein zusätzlicher Bogenschütze wird bezahlt. Die Zwischenstände unterscheiden sich sichtbar: um Sekunde 180 hat die gegnerische Basis 680 HP bei 1× und 932 HP bei 4×. In diesem kontrollierten Fall bleibt der Ausgang samt Epoche, Welle und eigenem Basisschutz ähnlich; es zeigt sich kein großer Nachteil durch Tempo 4×. Das Paar ist keine allgemeine Tempoäquivalenzprüfung sämtlicher Strategien und Frameraten. Die längere tatsächliche UI-Partie verwendet andere Käufe und Entscheidungspausen und wird nicht allein anhand ihrer Dauer mit diesem Bot gleichgesetzt.

## Weitere selbst gespielte Partie nach der Trefferkorrektur

Die zweite vollständige Normal-Partie wurde mit echten Maus-/Tastatureingaben und regulären Preisen gespielt, ohne Gold, EP oder Gegnergesundheit zu setzen. Sie verwendet die korrigierte erste Projektilberührung und die überarbeiteten Scharfschützen-/Titan-Sheets. Die Seite wurde vor den späteren reinen Speicher-/Debugkorrekturen geladen; diese sind separat durch die neue Browserregression geprüft. Der Renaissance-Kandidatenvergleich während einer Pause änderte ausschließlich kurzzeitig die angezeigte Textur, danach wurde das ursprüngliche Bild wiederhergestellt; die Simulation blieb unverändert.

Ergebnis: **Sieg nach 451.728 ms (7:31), 104 Kills, Moderne**, eigene Basis 10.000/10.000, gegnerische Basis 0. Der eigene Epochenfortschritt erfolgte ausschließlich über verdiente Erfahrung. Meteorregen und Artillerie wurden nach ihren regulären Abklingzeiten benutzt. Der niedrigste hier beobachtete eigene Zustand war in der Renaissance 6.913/7.600 HP. Diese Partie baute keine Türme; deren Bau, Upgrade und Verkauf sind in der früheren UI-Partie und den gezielten Browsertests dokumentiert.

Der anschließende Klick auf „Noch eine Schlacht“ erzeugte eine frische Steinzeit-Partie: 825 ms, 1× Tempo, 190 Gold nach genau einem 50-Gold-Keulenkrieger, EP0, UID1, 0 Kills, leere Turmplätze und beide Basen 4.200/4.200. Der danach gesetzte Pausenzustand hielt die Partie an. Nachweise: `art/qa/manual-playthrough.jsonl`, `manual-latest-victory.jpg`, `manual-latest-restart.jpg` und die Bilder der einzelnen Epochen. Die frühere vollständige 8:44-Partie hat zusätzlich alle fünf Epochen erreicht.

## Gesperrter Browserspeicher

Eine zusätzliche unabhängige Prüfung reproduzierte einen Spielstartabsturz durch einen alten ungeschützten Developer-Mode-Zugriff auf localStorage. BattleScene nutzt nun dieselbe ausfallsichere Einstellungsverwaltung wie das Menü. Eine gezielte Browserregression blockiert sämtliche Speicherzugriffe und prüft Sitzungspräferenz, regulären Start, exakten Rekrutierungspreis, Zeit/Bewegung, F2/F3, Pause, Rückkehr ins Menü und neue Schlacht. Die Oberfläche verbraucht nur von ihr bearbeitete Tasten; Debugbefehle erreichen ihren eigenen Handler. Diese Regression ist bestanden; TypeScript einschließlich QA-Konfiguration und 74/74 Jest sind grün. Die vorherige vollständige 15er-Suite ist um diesen 16. Test ergänzt.


## Abschließender vollständiger Funktionslauf

Nach der Speicher- und Dialogkorrektur wurde der Laufzeitcode eingefroren und nochmals vollständig geprüft. Die unten stehenden Ergebnisse ersetzen die früheren 15er-/16er-Zwischenstände als aktuellen Funktionsnachweis; die historischen Prüfungen und Spielberichte bleiben oben erhalten.

| Prüfung | Ergebnis |
|---|---|
| Gesamte Playwright-Suite | **19 von 19 bestanden**, 1,1 Minuten, ein Worker |
| Jest | **74 von 74 bestanden**, sechs Testsuiten |
| TypeScript der Spielquellen | Erfolgreich |
| Separate TypeScript-Prüfung der QA- und Buildkonfiguration | Erfolgreich |
| ESLint | Erfolgreich |

Der vollständige Lauf enthält die zusätzliche Speicherverweigerungsprüfung und drei Dialogprüfungen für Pause, Sieg und Niederlage. Der Fokus ist sofort auf der ersten Aktion sichtbar, wechselt über Pfeiltasten bzw. Tab/Shift+Tab und folgt Mausbewegungen. Enter aktiviert dieselbe Aktion. Spielzeit, Käufe und Fähigkeiten bleiben im Dialog gesperrt; Space/Escape setzen die Pause weiter wie vorgesehen fort, F2/F3 erreichen die Debugsteuerung. Beide Ergebnisarten prüfen jeweils Neustart und Rückkehr durch das Hauptmenü mit frischen Einheitenidentitäten, regulären Preisen und genau einem Kaufhandler. Sichtprüfungen der drei Dialogbilder bestätigen die Bedienhilfe ohne Textüberschneidungen. Mit `QA_CAPTURE_EVIDENCE=1` nimmt die Suite diese Bilder als `art/qa/pause-keyboard-focus.png`, `art/qa/victory-keyboard-focus.png` und `art/qa/defeat-keyboard-focus.png` neu auf; ein normaler `npm test` lässt die aufgezeichneten Dateien unverändert.

Ein zusätzlicher eigener Bedienlauf begann frisch mit dem endgültigen Dialogcode: Schwer wurde per Tastatur gewählt, Q/W/E rekrutierten drei regulär bezahlte Einheiten, anschließend führte Space → Pfeil ab → Enter zurück ins Hauptmenü. Das persönlich geprüfte Bild [manual-end-pause-keyboard.jpg](../art/qa/manual-end-pause-keyboard.jpg) zeigt Fokus und Bedienhilfe. Diese kurze aktuelle Prüfung ist von den beiden früheren vollständig erspielten Siegen getrennt.

Die Quellen-Hashes dieses Funktionsstands stehen in [final-function-validation.json](../art/qa/final-function-validation.json). Die anschließende Übernahme reiner Hintergrundbilder verändert die geprüfte Bedien- und Kampflogik nicht. Die folgende Produktionsabnahme wurde nach der letzten Hintergrundübernahme separat durchgeführt; die Funktionssuite wurde dafür nicht erneut wiederholt.


## Abschließende Produktionsabnahme

Geprüft am **9. September 2026 um 04:17 (Europe/Berlin)**. Renaissance, Moderne und Zukunft verwenden die zuletzt abgenommenen Blender-Hintergründe. Die veröffentlichte Moderne-Datei besitzt SHA-256 `c9c3a4d85f95ea39ac716c9669c10ee717d8785370dd41747e8462314441e8f8`, die Zukunft-Datei `a996b5c56821a60b48b33e25746bbabf769dd8d7af25d824b7ecf206752cfa39`.

| Prüfung | Ergebnis |
|---|---|
| Vergleich mit eingefrorenem Funktionsstand | Alle 41 aufgezeichneten Quell-, Daten- und QA-Dateien einschließlich Waffenmarker unverändert |
| Runtime-Assetvertrag | 70 vollständige PNGs, 20 Einheitentypen mit je acht Waffenpositionen, getrennte Fraktionsbilder |
| Grafik-Verifier | 85 von 85 Bildern und 85 von 85 gespeicherten Quellen, keine Beanstandungen |
| Produktionsbuild | Erfolgreich; **73 Dateien / 20.892.182 Bytes** |
| Gebaute Runtime-Dateien | Alle 71 bytegenau identisch zu den abgenommenen Public-Exporten |
| Produktionsstart | Alle 71 Runtime-Anfragen HTTP 200; keine Laufzeitfehler; keine Entwicklungsbrücke |
| Eigene Sichtprüfung | Deutsches HUD, beide Basen und drei reguläre Käufe; 63 Gold = 240 − 185 + 8 Einkommen |
| Laufende Vorschau | [Spiel öffnen](http://127.0.0.1:5191/AgeOfMax/), eigener versteckter Prozess PID **32256** |

Der Vorschauprozess bleibt für den Nutzer absichtlich aktiv. Startzeit, Kommando, Arbeitsverzeichnis und PID stehen in [final-preview-server.json](../art/qa/final-preview-server.json). Es wurde kein fremder Prozess beendet. Der separate Smoke-Test-Browser wurde nach seinem Lauf geschlossen; der Server bleibt erreichbar.

[Produktionsnachweis mit Dateigrößen und Hashes](../art/qa/final-production-validation.json), [Runtime-Asset- und Quellenvergleich](../art/qa/final-production-assets.json), [tatsächliches Produktionsbild](../art/qa/production-battle.jpg). Der Quellenverbund entspricht weiterhin `22125e733639fa6ed281981fc15bd8e5db0b2f8f618950d8552eb1cd82cf286b`. Die bereits bestandene 19er-Browser- und 74er-Jest-Suite gilt daher für denselben Funktionscode. Nach der reinen Hintergrundübernahme wurden ausschließlich Grafikvertrag, Build, Dateivergleich und Produktionsstart geprüft.

Diese Abnahme bestätigt den beschriebenen Funktions- und Auslieferungsstand. Sie erklärt das weiterhin offene AAA-Ziel nicht für erreicht.


## Nachfolgende Entwicklung: angekündigte Taktikwellen

Dieser Entwicklungsstand wurde am **9. September 2026** nach der oben dokumentierten Produktionsabnahme geprüft. Die laufende Vorschau auf Port 5191 und `dist/` bleiben die gespeicherte **19/74-Produktionsbaseline**. Die hier untersuchte neue Aufklärung und Wellenplanung laufen im Entwicklungsstand auf Port 5190.

**23/23 Browserprüfungen, 120/120 Jest-Tests in sieben Suiten, TypeScript einschließlich QA-/Buildkonfiguration und ESLint bestehen.** Die vier zusätzlichen Browsertests prüfen echte I-/Maus-/Escape-Bedienung, laufende Simulation bei nichtmodaler Aufklärung, Pausensperren, unveränderte Ankündigungen trotz bezahlter Käufe und Spieleraufstieg, den vorab angekündigten Gegneraufstieg sowie reale Spawn-IDs und abgewiesene Versuche ohne Nachholwarteschlange. Drei Fälle verwenden ausdrücklich vorbereitete EP, Wellenzeiten oder echte Blockiereinheiten; sie sind Funktionsproben und keine erspielten Partien. Alle fünf Aufklärungskarten wurden bei 900 Pixeln persönlich angesehen. [Funktionsnachweis](../art/qa/wave-tactics-v1/runtime-validation-20260909T024200853Z.json). Mit `QA_CAPTURE_EVIDENCE=1` nimmt die Suite diese Karten als `art/qa/wave-tactics-v1/intel-{epoch}-900.png` für `stone`, `castle`, `renaissance`, `modern` und `future` neu auf; ein normaler `npm test` lässt die aufgezeichneten Dateien unverändert.

Der reine Plan-Audit prüft **480 Pläne** (fünf Epochen × drei Schwierigkeiten × Wellen 1–32) und 15 Taktikvergleiche bei gleicher Truppenmenge und gleichem Referenzbudget. Die Planlisten bleiben unveränderlich, unabhängig von JSON-Reihenfolge, epochenrichtig und innerhalb ±8 % des bisherigen Kostenbudgets. Eine fehlende positive Kostenvalidierung und ein zunächst zu schwacher Steinzeit-Durchbruch wurden vor den grünen Läufen korrigiert. [Plan-Audit](../art/qa/wave-tactics-v1/plan-audit-20260909T023346860Z.md).

Die folgende Matrix wiederholt die oben archivierte Reihe `seed-matrix-20260909T015030625Z` mit derselben Kauf- und Fähigkeitenpolitik, denselben Seeds 101/202/303 und 1× Tempo. Jeder Lauf startet bei 0 ms mit regulären Ressourcen; die getrennte feste Testuhr bleibt unverändert. Es wurden keine Balancewerte nachjustiert.

| Profil | Seed | Ergebnis / Sekunden | Käufe / Gold | Kills | Letzte Spielerepoche | Meteor / Artillerie |
|---|---:|---|---:|---:|---|---:|
| Normal / gemischt | 101 | Sieg / 201,650 | 36 / 3.765 | 42 | Mittelalter | 1 / 0 |
| Normal / gemischt | 202 | Sieg / 336,233 | 59 / 8.250 | 75 | Moderne | 2 / 1 |
| Normal / gemischt | 303 | Sieg / 208,417 | 38 / 4.125 | 44 | Renaissance | 1 / 0 |
| Schwer / gemischt | 101 | Sieg / 304,700 | 55 / 8.235 | 81 | Moderne | 3 / 1 |
| Schwer / gemischt | 202 | Sieg / 354,400 | 64 / 10.705 | 93 | Moderne | 2 / 1 |
| Schwer / gemischt | 303 | Sieg / 304,700 | 55 / 8.235 | 81 | Moderne | 3 / 1 |
| Normal / Linie | 101 | Niederlage / 658,167 | 128 / 27.230 | 147 | Zukunft | 10 / 7 |
| Normal / Linie | 202 | Niederlage / 805,817 | 152 / 39.845 | 186 | Zukunft | 13 / 9 |
| Normal / Linie | 303 | Niederlage / 758,467 | 141 / 36.330 | 179 | Zukunft | 12 / 7 |

Alle sechs gemischten Siege bleiben ohne eigenen Basisschaden. Die drei Linienpartien verlieren ihre Basis; der vorherige offene 960-Sekunden-Lauf bleibt ausdrücklich ein abgebrochener Beobachtungszeitraum und wird nicht rückwirkend als Niederlage gezählt. Eigene Kaufblockierungen treten nur bei Linie/202 zweimal und Linie/303 dreimal auf. Es wird kein Turm tatsächlich gebaut; die unveränderte Botpolitik erlaubt höchstens einen Bauversuch für den Steinzeitturm und verwirft ihn außerhalb seiner Epoche ohne Kosten.

Der Laufzeitvergleich erfasst **96 angekündigte Pläne, 1.016 Spawnversuche, 971 Ankünfte und genau 971 beobachtete Einheiten**. Alle tatsächlichen IDs und Zeiten stimmen mit den erfolgreichen angekündigten Versuchen überein. 45 blockierte Gegnerversuche werden korrekt nicht nachgeholt; davon entfallen 40 auf die Linienpartien. Es fehlen keine Spritebeobachtungen. Noch angekündigte Einheiten nach einem Partiende sind keine fehlgeschlagenen Spawns. Der einzelne zusätzliche Kontrolllauf Normal/gemischt/101 reproduziert den gesamten aufgezeichneten Zustand exakt.

Der erfasste Quellenverbund ist in allen Läufen gleich (`4fd160e90090dbb4580e18f79c18fc4e88ae81712ce1a41fc09ed058a7333c78`). Die Bot-Hashliste umfasst nicht die UI; der separate Funktionsnachweis vor der Matrix bestätigt zusätzlich, dass UIScene, BootScene und BattleScene bis zum Ende unverändert geblieben sind.

**Die Stichprobe belegt keine allgemein höhere Schwierigkeit oder höheren Spielspaß.** Normal/gemischt gewinnt weiterhin dreimal, mit längeren und unterschiedlicheren Verläufen; Schwer/gemischt gewinnt jetzt dreimal statt zweimal. Nach der Szenenerzeugung stehen aber 2.170 statt 1.736 Aufrufe von `Math.random` im Protokoll. Meteorpositionen nutzen denselben Generator. Gleiche Seed-Namen bedeuten deshalb zwischen den Versionen nicht dieselbe Zufallsfolge im Kampf; die Ursache der zusätzlichen 434 Aufrufe wurde nicht isoliert. Der Bot reagiert zudem nicht auf die neue Aufklärung. Der Vergleich beschreibt den integrierten neuen Spielstand unter zwei festen Kaufregeln, nicht den isolierten Effekt einzelner Taktiken oder die Erfahrung menschlicher Spieler. Eine unabhängige Zweitprüfung bestätigt diese Grenzen und die Spawnkonsistenz.

[Vollständiger Vergleich mit Epochenzeiten, Basiswerten, Preisen, Blockierungen und Rohdaten](../art/qa/wave-tactics-matrix-20260909T024324538Z/comparison.json), [kompakte Vergleichstabelle](../art/qa/wave-tactics-matrix-20260909T024324538Z/comparison.md), [Matrix samt exakter Wiederholung](../art/qa/wave-tactics-matrix-20260909T024324538Z/summary.json).


## Selbst erspielter Sieg mit angekündigten Taktikwellen

Der Hauptauftrag hat die neue Wellenfassung vollständig über echte Maus- und Tastatureingaben gespielt: **Normal, Sieg nach 506.361 ms (8:26), 122 Kills, alle fünf Spieler-Epochen erreicht**. Die eigene Zukunftsbasis endet bei **13.055/14.000 HP**, die gegnerische Modernenbasis bei 0/10.000. Rekrutierungen wurden regulär bezahlt, Aufstiege ausschließlich mit verdienter Erfahrung ausgelöst; Meteorregen, Artillerie, Aufklärung und Pausen wurden über ihre normalen Befehle verwendet. Ein Pfeilturm wurde tatsächlich gebaut.

Der kleinste beobachtete eigene Mittelalterzustand war **3.542/5.600 HP**. Dies ist der niedrigste aufgezeichnete Pausenschnappschuss dieser Epoche, keine lückenlose Messung jedes Frames. Die Partie zeigt einen verteidigten Basiseinbruch und anschließende Erholung; sie wird getrennt von den automatischen, schadensfreien gemischten Botpartien geführt.

Die Partie war **vor der späteren Castle-Hintergrundübernahme geladen** und behielt dieses ältere Mittelalterbild sowie die bisherigen acht Animationsframes. Der aktualisierte Castle-Hintergrund wurde unabhängig als Grafik und im nachfolgenden Produktionspaket geprüft. Währenddessen überarbeiteter Feldhandbuchtext wurde in diese laufende Partie nicht nachgeladen. Der eingefrorene Gameplaycode entspricht dem neuen Wellenstand.

Der echte anschließende Sieg-Neustart per Enter, Q, I, Escape und Leertaste steht in Zeile 49 des Eingabeprotokolls: **1.275 ms, 198 Gold = 240 − 50 + 8, EP 0, Steinzeit, 1× Tempo, ein Keulenkrieger mit UID 1, leere Turmplätze und volle eigene Basis**. Die Aufklärung lässt sich erneut öffnen und schließen; die Pause funktioniert.

[Erspielter Sieg mit Eingaben und Quellen](../art/qa/wave-tactics-v1/manual-earned-victory.json), [persönlich geprüftes Siegbild](../art/qa/tactics-earned-future.jpg), [Neustartbild](../art/qa/tactics-victory-restart.jpg), [vollständiges Eingabeprotokoll](../art/qa/manual-playthrough.jsonl).

## Separates Produktionspaket der Taktikwellenfassung

Das Paket unter `art/qa/releases/wave-tactics-v1/package/` wurde nach dem aktuellen Castle-Export gebaut und am **9. September 2026 ab 04:51 (Europe/Berlin)** unabhängig geprüft. Die frühere Produktion in `dist/` und auf Port 5191 wurde dabei weder überschrieben noch neu gebaut.

| Paketbezogene Prüfung | Ergebnis |
|---|---|
| Paketumfang | **73 Dateien / 20.928.485 Bytes** |
| Laufzeitassets | **71 von 71 HTTP 200**, Antwortbytes identisch zu Paket und aktuellen Public-Exporten |
| Entwicklerzugriff | Brückenkennung aus dem JavaScript entfernt; im laufenden Browser nicht vorhanden |
| Reguläre Rekrutierung | Normal: Q/W/E kaufen drei Truppen für 185 Gold; echtes Bild zeigt 55 Gold vor dem ersten Einkommen |
| Aufklärung und Handbuch | I, Escape, deutsche Texte, Porträts und Zähler persönlich im Produktionsbild geprüft |
| Pause | Bild vor/nach gesperrten Kampfbefehlen bytegleich |
| Rückweg und neue Schwierigkeit | Tastatur-Pausenmenü zurück ins Hauptmenü, danach echte neue Schwer-Partie |
| Reguläres Spielende | Ein bezahlter Keulenkrieger, dann keine weitere Verteidigung: natürliche Niederlage bei angezeigten **02:22**, keine Zustandsinjektion |
| Ergebnis-Neustart | Enter und Q: frische Schwer-Partie, **150 Gold = 200 − 50**, EP 0, 1×, volle Basen, ein Keulenkrieger, neue Zehnerwelle |
| Ergebnissperre | Bild vor/nach gesperrten I/Q/Tempo-Befehlen bytegleich |
| Browserfehler | Keine |
| Laufende neue Vorschau | [Taktikwellenfassung öffnen](http://127.0.0.1:5192/AgeOfMax/), vorhandener Prozess PID **25484** |

Es wurden ausschließlich echte Maus- und Tastatureingaben benutzt. Die Produktionsprüfung setzte weder Ressourcen noch Kampfzeit, Basisgesundheit oder Ergebniszustand. Der eigene Prüf-Chrome auf Port 9226 wurde danach geschlossen; die beiden Vorschauprozesse bleiben aktiv. Ein Produktionssieg wird hier nicht behauptet: Der vollständige Sieg der aktuellen Kampfregeln ist im vorstehenden eigenen UI-Spielbericht dokumentiert.

[Abgeschlossene Produktionsprüfung mit allen Datei- und HTTP-Hashes](../art/qa/releases/wave-tactics-v1/production-validation.json), [echtes Aufklärungsbild](../art/qa/releases/wave-tactics-v1/production-scout.jpg), [Feldhandbuch](../art/qa/releases/wave-tactics-v1/production-handbook.jpg), [reguläre Niederlage](../art/qa/releases/wave-tactics-v1/production-defeat.jpg), [Ergebnis-Neustart](../art/qa/releases/wave-tactics-v1/production-result-restart-scout.jpg).


Nach Abschluss der unabhängigen Paketprüfung wurde die identische Fassung am **9. September um 04:54 (Europe/Berlin)** in `dist/` übernommen. Alle 73 installierten Dateien wurden gegen den Prüfbericht gehasht; alle 73 Dateien der vorherigen Produktion bleiben byteidentisch in `art/qa/releases/wave-tactics-v1/previous-dist/`. Ein anschließender HTTP-Abruf von **Port 5191** bestätigt den neuen JavaScript-Build. Die Beschreibung der unberührten früheren Produktion oben bezieht sich auf den Zeitraum der separaten Prüfung, vor dieser dokumentierten Übernahme. [Lokale Übernahme](../art/qa/releases/wave-tactics-v1/integration.json), [vorherige Paketdateien](../art/qa/releases/wave-tactics-v1/previous-package-manifest.json).


## Steinzeitlager in der Produktionsvorschau

Am **9. September 2026 um 05:21 (Europe/Berlin)** wurde das geprüfte Steinzeitlager aus echten Blender-Geometrien in die Hauptvorschau auf Port 5191 übernommen. Das Paket enthält **73 Dateien / 20.987.732 Bytes**. Gegenüber der zuvor geprüften Taktikwellenfassung unterscheidet sich ausschließlich `assets/reborn/backgrounds/stone.png`; die übrigen 72 Dateien einschließlich Spielcode und HTML sind byteidentisch. Der bisherige vollständige Paketstand ist unter `art/qa/releases/stone-v2/previous-dist/` erhalten.

Der Hauptauftrag hat alle 73 ausgelieferten HTTP-Dateien gegen die geprüften Paket-Hashes abgeglichen. Ein frischer Produktionsbrowser lud alle 71 Runtimeassets ohne Fehler und ohne Entwicklerbrücke. Über die reguläre Oberfläche wurden eine normale Schlacht gestartet, Q/W/E bezahlt rekrutiert, die Aufklärung geöffnet und geschlossen sowie pausiert. Das tatsächliche Schlachtbild wurde persönlich geprüft: neue Felsstützen mit aufliegender Deckplatte, gefaltete Zelthäute und eine lesbare freie Kampfbahn. Dieser kurze Asset-Abnahmelauf ist kein weiterer vollständiger Sieg; die vorstehende 8:26-Partie bleibt der vollständige aktuelle Kampfregel-Test. Die unveränderten 23 Browser- und 120 Regeltests gelten für denselben Spielcode.

[Geprüfte Übernahme und vollständiges Dateimanifest](../art/qa/releases/stone-v2/integration.json), [HTTP- und echte UI-Prüfung](../art/qa/releases/stone-v2/production-validation.json), [Produktions-Schlachtbild](../art/qa/releases/stone-v2/production-stone-battle.jpg), [Aufklärung](../art/qa/releases/stone-v2/production-stone-scout.jpg).


## Schwierigkeitsbalance mit Spielertypen

Stand: 11. September 2026. Ziel: Leicht, Normal und Schwer sollen sich für unterschiedlich geübte Spieler klar unterscheiden, jede Schlacht soll mehrere Epochen zeigen und keine darf endlos festlaufen. Grundlage sind ausschließlich komplette Partien der echten Phaser-Simulation.

### Ausgangslage

Gemessen wurde mit denselben acht Spielertypen, Seeds und Grenzen wie im Ergebnis unten, nur mit den alten Werten als Variante `baseline` ([Übersicht](../art/qa/balance-v2-baseline/summary-4x.md), 240 Partien bei 4×, keine Laufzeitfehler). Eine erste Reihe mit den frühen Bot-Versionen (180 Partien ohne Tagesform) hatte dieselben drei Probleme gezeigt.

| Befund | Messung |
|---|---|
| Leicht war trivial | Alle sieben aktiven Spielertypen gewannen 10/10, im Median ohne Basisschaden. Gelegenheits- und Durchschnittsspieler, Rusher und Experten siegten im Median nach 2:09 bis 2:29, meist noch in der Steinzeit. |
| Normal und Schwer unterschieden sich für geübte Spieler kaum | Der Experte gewann beide 10/10 nach 3:07 bzw. 3:17. Eine überlegene Armee blieb vor der gegnerischen Festung stehen und besiegte jede einzeln erscheinende Welleneinheit sofort. |
| Das Spätspiel lief fest | In der Zukunft gab der Gegner pro Welle etwa 1,8× so viel Gold aus, wie der Spieler verdiente. Türme hielten die eigene Basis, die eigene Armee kam nicht durch. Nach 20 Minuten waren auf Normal 18 und auf Schwer 21 der je 80 Partien offen, darunter alle zehn Turm-Partien auf Schwer. Die gegnerische Festung blieb dabei teils über zehn Minuten unverändert. |

### Methode

`tools/balance-matrix.mjs` startet jede Partie frisch über die Entwicklungsbrücke und steuert sie ausschließlich über dieselben UI-Ereignisse wie ein Spieler: Rekrutieren, Bauen, Ausbauen, Verkaufen, Fähigkeiten und Aufstieg. Die Partie läuft auf der internen Spieluhr ohne Darstellung. Zufall, Testuhr und Bot-Entscheidungen sind pro Seed festgelegt; derselbe Code mit demselben Seed ergibt feldgleiche Berichte. Vor der ersten Wertänderung wurde geprüft, dass der Umbau auf die Tabelle `DIFFICULTY` alle 180 Partien der ersten Reihe feldgleich reproduziert.

| Spielertyp | Verhalten |
|---|---|
| Untätig | kauft nichts; Referenz für die Grundbedrohung |
| Anfänger | reagiert langsam, kauft planlos nach Kartenreihenfolge, steigt spät auf, baut selten |
| Gelegenheit | vernünftige Mischung, ein Turm, etwas späterer Aufstieg |
| Durchschnitt | Rollenmischung, zwei Türme, rechtzeitige Fähigkeiten |
| Rusher | frühere QA-Rotation, gibt sofort alles aus, baut nicht |
| Experte | liest die Aufklärung, kontert, baut und verbessert Türme, setzt Fähigkeiten gezielt |
| Turm-Spieler | füllt und verbessert zuerst alle drei Bauplätze, schickt Truppen danach einzeln |
| Sammler | wie der Turm-Spieler, spart danach aber Gold und greift geschlossen an |

Jede Partie erhält innerhalb ihres Typs eine gesetzte Tagesform (Reaktionszeit, Aufstiegsverzögerung, Kaufqualität). Ohne diese Streuung kippten Siegquoten wegen der festen Wellenzeiten sprunghaft zwischen 0 % und 100 %. Unterwegs fiel ein Modellfehler auf: Der erste Anfänger-Bot kaufte höchstens eine Einheit pro Entscheidung und hortete bis zu 5.000 Gold, während seine Basis fiel. Alle Tabellen dieses Abschnitts verwenden den korrigierten Bot. Gemessen werden Siege, Niederlagen, nach 20 Spielminuten offene Partien, Siegzeit und tiefster eigener Basisstand. Breite Reihen laufen mit 4×; Stichproben mit 1× prüfen, dass das Tempo die Ergebnisse nicht verfälscht. Insgesamt wurden für diese Kalibrierung rund 9.300 Partien gespielt; die Erkundungsreihen liegen nicht im Repository.

### Änderungen

Alle Schwierigkeitswerte stehen jetzt in der Tabelle `DIFFICULTY` in `src/game/combatRules.ts`. Ein Regressionstest stellt sicher, dass ein höherer Schwierigkeitsgrad in keinem Wert freundlicher ist als ein niedrigerer.

| Wert (vorher in Klammern) | Leicht | Normal | Schwer |
|---|---:|---:|---:|
| Startgold | 300 (360) | 240 (240) | 150 (200) |
| Anteil des Kopfgelds | 0,42 (0,35) | 0,38 (0,35) | 0,33 (0,35) |
| Lebenspunkte und Schaden gegnerischer Truppen | ×0,92 (0,82) | ×1,10 (1,00) | ×1,15 (1,08) |
| Wellengröße | -1 (-2) | 0 (0) | +2 (+2) |
| Gegnerische Technologie alle | 155 s (155) | 145 s (135) | 125 s (118) |
| Lebenspunkte der Gegnerfestung | ×1,5 (1) | ×1,5 (1) | ×1,5 (1) |
| Festungsgeschütz | ×0,75 (neu) | ×1,0 (neu) | ×1,25 (neu) |
| Spätverstärkung pro Welle | +8 % (neu) | +12 % (neu) | +12 % (neu) |

Für alle Schwierigkeiten gilt zusätzlich:

- Das Einkommen pro Sekunde beträgt je Epoche 8 / 15 / 26 / 42 / 68 statt 8 / 13 / 20 / 29 / 40. Erst damit kann eine gleich weit entwickelte Armee die großen Zukunftswellen schlagen.
- Die gegnerische Festung besitzt ein Geschütz. Es schießt alle 1,5 s auf den nächsten Angreifer, der höchstens 280 px von ihr entfernt steht, mit 20 / 35 / 50 / 65 / 80 Schaden je Gegnerepoche mal Schwierigkeitsfaktor und 45 px Flächenwirkung. Unter 25 % Festungs-Lebenspunkten verstummt es. So reibt ein früher Belagerungsring nicht mehr jede Welle einzeln auf, eine fast gewonnene Belagerung lässt sich aber zu Ende bringen. Das Geschoss verwendet die vorhandenen Projektilgrafiken der jeweiligen Epoche.
- Spätverstärkung: Ab der zweiten Welle der letzten gegnerischen Epoche rückt jede weitere Welle um den Tabellenwert stärker an (Lebenspunkte und Schaden, kumulativ). Die Aufklärung kündigt den Zuschlag als „Stärke +X %“ an. Damit endet jede Partie. Die Zusammensetzung der Wellen bleibt angekündigt und reagiert weiterhin nicht auf den Spieler.
- Feldhandbuch und Ergebnisansicht erklären die Antwort auf befestigte Stellungen: Gold sammeln und geschlossen angreifen. Endet eine Niederlage, nachdem die Gegnerfestung mehr als zur Hälfte zerstört war, nennt die Ergebnisansicht genau diesen Tipp.

Geprüft und verworfen wurden eine Drosselung von Maschinengewehr und Laserturm (keine Wirkung auf die Patts), ein Geschütz auch für die eigene Festung (verzögerte nur Niederlagen), eine kleinere Wellenobergrenze (kein stabiler Vorteil), ein im Spätspiel stärkeres Geschützprofil (erzeugte Patts) und eine schnellere gegnerische Technologie auf Schwer (Anfänger nach drei Minuten überrannt).

### Ergebnis

Offizielle Messung mit dem finalen Code in `art/qa/balance-v2/`, 240 Partien bei 4× (Seeds 1 bis 10) ohne Laufzeitfehler. Zelle: Siege von zehn Partien, Median der Siegzeit (N: Median der Spieldauer, wenn kein Sieg gelang) und, wenn die Mehrheit gewann, Median des tiefsten eigenen Basisstands.

| Spielertyp | Leicht | Normal | Schwer |
|---|---|---|---|
| Untätig | 0/10, N 2:19 | 0/10, N 2:01 | 0/10, N 2:15 |
| Anfänger | 10/10, 8:13, 100 % | 3/10, 8:52 | 2/10, 8:49 |
| Gelegenheit | 10/10, 9:31, 100 % | 9/10, 8:55, 94 % | 4/10, 9:29 |
| Durchschnitt | 10/10, 6:18, 100 % | 9/10, 7:15, 100 % | 4/10, 8:52 |
| Rusher | 10/10, 5:02, 100 % | 10/10, 5:12, 95 % | 8/10, 8:46, 70 % |
| Experte | 10/10, 4:35, 100 % | 10/10, 5:29, 100 % | 10/10, 8:14, 94 % |
| Turm-Spieler | 9/10, 11:12, 100 %, 1 offen | 3/10, 11:07 | 0/10, N 15:41 |
| Sammler | 10/10, 8:49, 100 % | 9/10, 9:43, 100 % | 9/10, 9:18, 93 % |

Vergleich mit der Ausgangslage (gleiche Bots, Seeds und Grenzen, 4×; vorher → nachher):

| Kennzahl | Leicht | Normal | Schwer |
|---|---|---|---|
| Siege aktiver Spielertypen (von 70) | 70 → 69 | 41 → 53 | 23 → 37 |
| Offene Partien nach 20 Minuten | 0 → 1 | 18 → 0 | 21 → 0 |
| Anfänger | 10/10 nach 3:18 → 10/10 nach 8:13 | 1/10 → 3/10 | 0/10 → 2/10 |
| Median-Siegzeit Durchschnitt | 2:16 → 6:18 | 6:14 → 7:15 | 6:03 → 8:52 |
| Median-Siegzeit Experte | 2:29 → 4:35 | 3:07 → 5:29 | 3:17 → 8:14 |

Schwer endet heute öfter mit einem Sieg, weil keine Partie mehr festläuft. Der Experte braucht dort aber zweieinhalbmal so lange wie vorher, und Anfänger bis Durchschnittsspieler gewinnen höchstens 4 von 10 Partien.

Stichprobe bei 1× mit den Seeds 21 bis 26, 108 Partien ohne Laufzeitfehler, keine davon offen:

| Spielertyp | Leicht | Normal | Schwer |
|---|---|---|---|
| Anfänger | 6/6, 8:52 | 4/6, 10:16 | 0/6, N 4:16 |
| Gelegenheit | 6/6, 9:15 | 6/6, 8:30 | 0/6, N 11:44 |
| Durchschnitt | 6/6, 8:48 | 6/6, 8:06 | 3/6, 8:46 |
| Experte | 6/6, 5:13 | 6/6, 7:30 | 5/6, 8:44 |
| Turm-Spieler | 6/6, 11:23 | 1/6, 10:23 | 0/6, N 16:08 |
| Sammler | 6/6, 9:09 | 6/6, 9:28 | 3/6, 9:36 |

- **Leicht:** Aktive Spielertypen gewinnen 69 von 70 Partien bei 4× und alle 36 bei 1×; die Mediane der Siegzeit liegen zwischen 4:35 und 11:23. 65 der 69 Siege bei 4× gelingen in der Renaissance oder später. Wer nichts tut, verliert nach gut zwei Minuten.
- **Normal:** Die Referenz. Gelegenheits- und Durchschnittsspieler gewinnen 9 von 10 (4×) bzw. 6 von 6 (1×) Partien nach 7 bis 9 Minuten, Anfänger 3 von 10 bzw. 4 von 6. Experten gewinnen sicher, im Median nach 5:29 (4×, vorher 3:07) bzw. 7:30 (1×).
- **Schwer:** Verlässlich gewinnt nur zielstrebiges Spiel: Experte 10 von 10 bzw. 5 von 6, Sammler 9 von 10 bzw. 3 von 6. Durchschnittsspieler gewinnen 4 von 10 bzw. 3 von 6. Jeder Sieg auf Schwer gelingt erst in der Zukunft.
- Auf Normal und Schwer blieb keine offizielle Partie offen. Auf Leicht blieb eine Partie eines sehr langsamen Turm-Spielers (Tagesform 0,01 von 1) nach 20 Minuten offen, mit unberührter eigener Basis und der Gegnerfestung bei 24 %. Ohne Zeitgrenze nachgespielt endete sie nach 28:06 mit einer Niederlage ([Nachspiel](../art/qa/balance-v2-long/summary-4x.md)).

### Echte Eingaben

Zusätzlich wurde mit dem finalen Code je Schwierigkeitsgrad eine komplette Partie über echte Maus- und Tastatureingaben gespielt: Menüs per Klick, Rekrutierung, Aufstieg und Fähigkeiten per Tastatur, Tempo 4×. Das Eingabemuster rekrutiert in fester Reihenfolge, schickt Einheiten einzeln nach und kam in diesen drei Partien nicht zum Turmbau. Gold, Erfahrung, Wellen und Lebenspunkte wurden nur gelesen, kein Seitenfehler trat auf.

| Schwierigkeit | Ergebnis | Zeit | Besiegte Gegner | Epoche | Tiefster Basisstand |
|---|---|---:|---:|---|---:|
| Leicht | Sieg | 7:44 | 101 | Moderne | 100 % |
| Normal | Sieg | 10:18 | 155 | Zukunft | 61 % |
| Schwer | Niederlage | 12:19 | 206 | Zukunft | 0 % |

Auf Schwer stand die Gegnerfestung ab etwa zehn Minuten unverändert bei 74 %; die einzeln nachrückenden Truppen verloren gegen +48 % Wellenstärke. Die Ergebnisansicht zeigte passend dazu den Tipp zur starken Front, weil die Festung noch mehr als zur Hälfte stand. Das passt zu den Bot-Ergebnissen: Wer Truppen nur einzeln nachschickt, verliert auf Schwer (Turm-Spieler 0/10).

Ebenfalls mit dem finalen Code sichtgeprüft: das Festungsgeschoss im Flug und sein Einschlag bei 1× in einer echten Normal-Partie, die Anzeige „Stärke +12 %“ in der Aufklärung und der Niederlagen-Tipp zum Sturm auf die Festung (beide technische Einrichtung) sowie das Feldhandbuch: [Geschoss](../art/qa/balance-v2/ui-fortress-gun-1x.png), [Einschlag](../art/qa/balance-v2/ui-fortress-gun-1x-hit.png), [Aufklärung](../art/qa/balance-v2/ui-scout-surge-hard.png), [Niederlagen-Tipp](../art/qa/balance-v2/ui-result-tip.png), [Feldhandbuch](../art/qa/balance-v2/ui-help.png), [Sieg Leicht](../art/qa/balance-v2/play-easy-end.png), [Sieg Normal](../art/qa/balance-v2/play-medium-end.png), [Niederlage Schwer](../art/qa/balance-v2/play-hard-end.png).

Prüfstand: 164 von 164 Jest-Tests (neu: Festungsgeschütz, Spätverstärkung, Reihenfolge der Schwierigkeitstabelle), TypeScript für Spielquellen und QA-/Build-Konfiguration, ESLint und 23 von 23 Playwright-Prüfungen auf dem finalen Code. Zwei Browserprüfungen und `tools/combat-playthrough.mjs` lesen Startgold, Einkommen, Wellengröße und Epochenzeiten jetzt aus den Spielregeln statt aus festen Zahlen.

### Grenzen

- Die Spielertypen sind Modelle. Sie ersetzen keine Partien echter Menschen; besonders Anfänger spielen vielfältiger als jeder Bot.
- Leicht bleibt bewusst nachsichtig: Anfänger gewinnen dort jede Partie, im Median mit 100 % (4×) bzw. 96 % (1×) ihrer Festung.
- Wer sich nur verschanzt und Truppen einzeln nachschickt, verliert auf Normal und Schwer durch die Spätverstärkung (Turm-Spieler 3/10 bzw. 0/10). Die geschlossene Gruppe ist die vorgesehene Antwort.
- Auf Schwer können Anfänger bei 1× schon nach etwa vier Minuten überrannt werden.
- 1× und 4× stimmen in der Summe überein, einzelne Partien verlaufen verschieden. Die 1×-Stichprobe umfasst sechs Seeds je Zelle.

### Reproduktion

```powershell
# QA-Server in einem eigenen Terminal
node node_modules/vite/bin/vite.js --config e2e/vite.config.ts --host 127.0.0.1 --port 5190 --strictPort

# Breite Reihe: drei Schwierigkeiten × acht Spielertypen × zehn Seeds bei 4×
$env:QA_REPORT_GROUP = 'balance-check'
node tools/balance-matrix.mjs

# Stichprobe bei 1×
$env:QA_SPEED = '1'; $env:QA_STRATEGIES = 'novice,casual,average,expert,turtle,massing'; $env:QA_SEEDS = '21,22,23,24,25,26'
node tools/balance-matrix.mjs

# Ausgangslage: alte Werte als Variante, sonst wie die Reihe bei 4×
$env:QA_SPEED = $null; $env:QA_STRATEGIES = $null; $env:QA_SEEDS = $null
$env:QA_REPORT_GROUP = 'balance-check-baseline'; $env:QA_VARIANTS = 'art/qa/balance-v2-baseline/variants.json'
node tools/balance-matrix.mjs
```

Jede Gruppe erhält unter `art/qa/<Gruppe>/` die Übersichten `summary-<Tempo>x.md` und `summary-<Tempo>x.json` sowie die Rohdaten jeder Partie mit 30-Sekunden-Schnappschüssen in `matches-<Tempo>x.jsonl`. Ein weiterer Lauf in derselben Gruppe hängt an diese Rohdaten an; für einen sauberen Vergleich daher eine neue Gruppe wählen. Die Belege dieses Abschnitts liegen in `art/qa/balance-v2/`, `art/qa/balance-v2-baseline/` und `art/qa/balance-v2-long/`. Für Balance-Experimente nimmt `QA_VARIANTS` eine JSON-Datei mit Varianten entgegen, zum Beispiel `[{"name": "probe", "patch": {"/src/game/combatRules.ts": {"DIFFICULTY.medium": {"enemyStats": 1.15}}}}]`. Die Ausgangslage verwendet [`variants.json`](../art/qa/balance-v2-baseline/variants.json).
