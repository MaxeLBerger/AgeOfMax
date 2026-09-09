import { readFile, writeFile } from 'node:fs/promises';
const file='docs/QA_REBUILD.md';
let doc=await readFile(file,'utf8');
const summary=JSON.parse(await readFile('art/qa/seed-matrix-20260909T015030625Z/summary.json','utf8'));
const fmt=(n, digits=0)=>n.toLocaleString('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const epoch=['Steinzeit','Mittelalter','Renaissance','Moderne','Zukunft'];
const rows=summary.runs.map(r=>'| '+(r.options.difficulty==='hard'?'Schwer':'Normal')+' / '+(r.options.mode==='mixed'?'gemischt':'Linie')+' | '+r.options.seed+' | '+(r.winner==='player'?'Sieg':r.winner==='enemy'?'Niederlage':'Nach 16 Minuten offen')+' | '+fmt(r.seconds,3)+' | '+r.recruits+' / '+fmt(r.unitGold)+' | '+r.kills+' | '+epoch[r.finalEpoch]+' | '+fmt(r.minimumBase.fraction*100,0)+' % | '+r.meteorCasts+' / '+r.artilleryCasts+' |').join('\n');
doc+=`

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

Die ersten drei Nachproben und der Geschwindigkeitsvergleich stehen in [seed-after-precision-20260909T014939302Z/summary.json](../art/qa/seed-after-precision-20260909T014939302Z/summary.json). Weil sich Schwer/gemischt/101 vom Verlust zum Sieg änderte, wurde anschließend die ganze Neuner-Matrix frisch geladen und wiederholt. Alle Läufe verwenden den Quellenverbund \`5c4077b107a81ef5133060bee0234a731fd2d0f619b8ea9afa34ce25dbff0278\`. [Neue vollständige Matrix](../art/qa/seed-matrix-20260909T015030625Z/summary.json).

| Schwierigkeit / Strategie | Seed | Ergebnis | Zeit (s) | Käufe / Gold | Kills | Letzte Epoche | Kleinster eigener HP-Anteil | Meteor / Artillerie |
|---|---:|---|---:|---:|---:|---|---:|---:|
${rows}

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
`;
await writeFile(file,doc);
console.log('Final matrix, changed-version validation and speed comparison documented.');
