import { readFile, writeFile, readdir, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function files(dir) {
 const entries=await readdir(dir,{withFileTypes:true});const result=[];
 for(const entry of entries) {
  const file=path.join(dir,entry.name).replaceAll('\\','/');
  if(entry.isDirectory()) { if(entry.name!=='__tests__')result.push(...await files(file)); }
  else if(/\.(ts|json)$/.test(file) && !file.endsWith('.test.ts'))result.push(file);
 }
 return result;
}
const paths=[...await files('src'),...await files('data'),...await files('e2e'),'playwright.config.ts','vite.config.ts','public/assets/reborn/weapon-sockets.json'].sort();
const hashes=Object.fromEntries(await Promise.all(paths.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const report={checkedAt:new Date().toISOString(),scope:'Final function code, data, QA sources and weapon markers; background PNG promotion is checked separately.',
 checks:{playwright:{passed:19,total:19,durationDisplay:'1.1m',workers:1},jest:{passed:74,total:74,suites:6,durationSeconds:4.831},sourceTypeScript:'passed',qaAndBuildTypeScript:'passed',eslint:'passed'},
 productionBuild:'Deferred until final background promotion, as requested.',
 sourceFingerprint:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),hashes};
await writeFile('art/qa/final-function-validation.json',JSON.stringify(report,null,2));
await appendFile('docs/QA_REBUILD.md',`

## Abschließender vollständiger Funktionslauf

Nach der Speicher- und Dialogkorrektur wurde der Laufzeitcode eingefroren und nochmals vollständig geprüft. Die unten stehenden Ergebnisse ersetzen die früheren 15er-/16er-Zwischenstände als aktuellen Funktionsnachweis; die historischen Prüfungen und Spielberichte bleiben oben erhalten.

| Prüfung | Ergebnis |
|---|---|
| Gesamte Playwright-Suite | **19 von 19 bestanden**, 1,1 Minuten, ein Worker |
| Jest | **74 von 74 bestanden**, sechs Testsuiten |
| TypeScript der Spielquellen | Erfolgreich |
| Separate TypeScript-Prüfung der QA- und Buildkonfiguration | Erfolgreich |
| ESLint | Erfolgreich |

Der vollständige Lauf enthält die zusätzliche Speicherverweigerungsprüfung und drei Dialogprüfungen für Pause, Sieg und Niederlage. Der Fokus ist sofort auf der ersten Aktion sichtbar, wechselt über Pfeiltasten bzw. Tab/Shift+Tab und folgt Mausbewegungen. Enter aktiviert dieselbe Aktion. Spielzeit, Käufe und Fähigkeiten bleiben im Dialog gesperrt; Space/Escape setzen die Pause weiter wie vorgesehen fort, F2/F3 erreichen die Debugsteuerung. Beide Ergebnisarten prüfen jeweils Neustart und Rückkehr durch das Hauptmenü mit frischen Einheitenidentitäten, regulären Preisen und genau einem Kaufhandler. Sichtprüfungen der drei Dialogbilder bestätigen die Bedienhilfe ohne Textüberschneidungen.

Ein zusätzlicher eigener Bedienlauf begann frisch mit dem endgültigen Dialogcode: Schwer wurde per Tastatur gewählt, Q/W/E rekrutierten drei regulär bezahlte Einheiten, anschließend führte Space → Pfeil ab → Enter zurück ins Hauptmenü. Das persönlich geprüfte Bild [manual-end-pause-keyboard.jpg](../art/qa/manual-end-pause-keyboard.jpg) zeigt Fokus und Bedienhilfe. Diese kurze aktuelle Prüfung ist von den beiden früheren vollständig erspielten Siegen getrennt.

Die Quellen-Hashes dieses Funktionsstands stehen in [final-function-validation.json](../art/qa/final-function-validation.json). Die noch laufende Übernahme reiner Hintergrundbilder verändert die geprüfte Bedien- und Kampflogik nicht. **Der Produktionsbuild samt Startprobe und abschließendem Grafikvertrag wird nach der letzten Hintergrundübernahme separat geprüft.** Es wurde dafür noch kein neuer Build als abgeschlossen ausgegeben.
`);
const readme='README.md';let text=await readFile(readme,'utf8');
text=text.replace('In Menüs navigieren Tab und Pfeiltasten; Enter bestätigt die Auswahl.', 'In Menüs navigieren Tab und Pfeiltasten; Enter bestätigt die Auswahl. Das gilt auch für Pause und Ergebnisansicht. Shift+Tab wählt die vorherige Aktion; der hervorgehobene Fokus folgt auch der Maus.');
await writeFile(readme,text);
console.log(JSON.stringify({report:'art/qa/final-function-validation.json',fingerprint:report.sourceFingerprint,files:paths.length,checks:report.checks}));
