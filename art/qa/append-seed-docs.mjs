import { readFile, writeFile } from 'node:fs/promises';
const file = 'docs/QA_REBUILD.md';
let doc = await readFile(file, 'utf8');
doc = doc.replace('## Bestätigte Ergebnisse', '## Bestätigte Ergebnisse vor der abschließenden Grafik- und Trefferkorrektur');
doc = doc.replace('Die JSON-Dateien und Endbilder heißen `art/qa/combat-{difficulty}-{mode}-{speed}x.*`; der Vergleich ohne Fähigkeiten erhält zusätzlich `-noabilities`.', 'Die damaligen JSON-Dateien und Endbilder bleiben unter `art/qa/combat-{difficulty}-{mode}-{speed}x.*` erhalten. Neue Läufe erhalten zusätzlich Seed, Zeitstempel und Zufallskennung; sie überschreiben keine früheren Ergebnisse.');
doc = doc.replace('sowie `QA_ABILITIES=0` zum Ausschalten beider Spezialfähigkeiten.', 'sowie `QA_ABILITIES=0` zum Ausschalten beider Spezialfähigkeiten. `QA_SEED` aktiviert die unten beschriebene kontrollierte Zufallsfolge und Testuhr; `QA_REPORT_GROUP` legt einen eigenen Unterordner unter `art/qa/` an.');
doc += `

## Kontrollierte Balance-Reihe, vor der Trefferkorrektur

Die neun Läufe in [seed-matrix-20260909T014354814Z/summary.json](../art/qa/seed-matrix-20260909T014354814Z/summary.json) verwenden dieselbe Version von Kampfcode, Daten, Waffenmarkern und Bot. SHA-256 des protokollierten Quellenverbunds: \`2d7ce3f34dc814a6c6d044a620296057c5b3e100f61384ccb414a2f55add1a5e\`. Die einzelnen JSON-Berichte enthalten die Hashes der jeweiligen Dateien, jeden bezahlten Kauf, Armee-Zusammensetzung, Epochenwechsel, Fähigkeitsaufrufe und 30-Sekunden-Schnappschüsse.

Der Browser stoppt noch im Menü. Szenenanlage und technische Simulation laufen danach im selben JavaScript-Aufruf; kein echter Schlachtframe kann sich vor den ersten Messpunkt schieben. Alle neun Starts wurden unmittelbar nach \`create()\` bei Simulationszeit 0, Erfahrung 0, Kills 0, leeren Armeen und regulärem Startgold kontrolliert: Normal 240, Schwer 200. Jeder erfolgreiche Kauf muss den normalen Preis bezahlen. Es werden weder Ressourcen noch Lebenspunkte gesetzt.

Nur innerhalb dieses separaten Testbrowsers werden \`Math.random\` und die tatsächlich geladene Phaser-Zufallsquelle anhand von \`QA_SEED\` initialisiert. Zusätzlich beginnen die direkten Frame-Zeitstempel bei 0 und \`Date.now\` folgt einer festen Testuhr mit 16,667 ms pro unskaliertem Schritt. Das ist nötig, weil Phaser-Tweens intern auch die Wanduhr lesen und ihr Ende den weiteren Verbrauch von Zufallszahlen beeinflussen kann. **Diese Testuhr verändert keinen Laufzeitcode des normalen Spiels.** Alle Vergleichspartien laufen bei 1× mit derselben Entscheidungsfrequenz von 1,5 Simulationssekunden. Ein zusätzlicher exakter Wiederholungslauf Normal/gemischt/101 stimmt in sämtlichen protokollierten Zuständen einschließlich Zufallszustand überein; Metadaten wie Dateiname und Erstellungszeit sind ausgenommen. Eine vollständige Wiederholbarkeitsbehauptung für alle anderen Konfigurationen folgt daraus nicht.

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

\`\`\`powershell
$env:QA_SEED = '101'
$env:QA_DIFFICULTY = 'medium'
$env:QA_MODE = 'mixed'
$env:QA_SPEED = '1'
$env:QA_REPORT_GROUP = 'eigener-vergleich'
node tools/combat-playthrough.mjs
\`\`\`

\`node tools/run-seeded-balance.mjs\` legt eine neue Gruppe an und führt die neun Konfigurationen nacheinander sowie eine zusätzliche Wiederholung von Normal/gemischt/101 aus.
`;
await writeFile(file, doc);
const readmeFile = 'README.md';
let readme = await readFile(readmeFile, 'utf8');
readme = readme.replace('Sie ersetzt keine tatsächlich über die Oberfläche gespielte Partie. Ergebnisse, überprüfte Grenzen', 'Sie ersetzt keine tatsächlich über die Oberfläche gespielte Partie. Mit `QA_SEED` kontrolliert sie Startzeit, Zufallsfolgen und eine getrennte Testuhr; jede Ausführung schreibt neue Berichte statt alte Nachweise zu überschreiben. `node tools/run-seeded-balance.mjs` vergleicht drei Strategien/Schwierigkeiten mit drei Seeds. Ergebnisse, überprüfte Grenzen');
await writeFile(readmeFile, readme);
console.log('QA method and historical matrix documented.');
