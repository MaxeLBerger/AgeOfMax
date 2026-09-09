# Vergleich angekündigter Taktikwellen

2026-09-09T02:47:02.877Z

23/23 Browserprüfungen und120/120 Logiktests wurden vor dieser Messung bestanden. Diese neun deterministischen Botpartien messen eine andere Frage: Verhalten des neuen Wellenstands bei unveränderter Kaufpolitik. Die bestehende Produktion wurde nicht verändert.

| Profil/Seed | Vorher, Sekunden | Jetzt, Sekunden | Käufe | Abschüsse | Spielerepoche0–4 | kleinster Basisanteil | Meteor/Artillerie |
|---|---|---|---|---|---|---|---|
| medium/mixed/101 | Sieg 184.9 | Sieg 201.6 | 33 → 36 | 36 → 42 | 1 → 1 | 100.0% → 100.0% | 0/0 → 1/0 |
| medium/mixed/202 | Sieg 184.9 | Sieg 336.2 | 33 → 59 | 36 → 75 | 1 → 3 | 100.0% → 100.0% | 0/0 → 2/1 |
| medium/mixed/303 | Sieg 184.9 | Sieg 208.4 | 33 → 38 | 36 → 44 | 1 → 2 | 100.0% → 100.0% | 0/0 → 1/0 |
| hard/mixed/101 | Sieg 314.7 | Sieg 304.7 | 55 → 55 | 81 → 81 | 3 → 3 | 100.0% → 100.0% | 4/1 → 3/1 |
| hard/mixed/202 | Niederlage 749.1 | Sieg 354.4 | 125 → 64 | 216 → 93 | 4 → 3 | 0.0% → 100.0% | 12/8 → 2/1 |
| hard/mixed/303 | Sieg 362.9 | Sieg 304.7 | 64 → 55 | 94 → 81 | 3 → 3 | 100.0% → 100.0% | 4/1 → 3/1 |
| medium/line/101 | Limit 960.0 | Niederlage 658.2 | 176 → 128 | 249 → 147 | 4 → 4 | 100.0% → 0.0% | 17/11 → 10/7 |
| medium/line/202 | Niederlage 891.4 | Niederlage 805.8 | 164 → 152 | 219 → 186 | 4 → 4 | 0.0% → 0.0% | 16/10 → 13/9 |
| medium/line/303 | Niederlage 741.5 | Niederlage 758.5 | 140 → 141 | 173 → 179 | 4 → 4 | 0.0% → 0.0% | 12/8 → 12/7 |

Alle Läufe starten bei0ms mit regulärem Startgold; keine freien Ressourcen. Einheitliche Quellen: true. Ein exakter Kontrolllauf stimmt einschließlich Zustand und Zufallsständen überein: true.

96 angekündigte Pläne, 1016 tatsächliche Versuche, 971 erfolgreiche Spawns und 971 beobachtete Gegner. Blockierte Gegner-Versuche: 45. Fehlende Spritebeobachtungen: 0. Beanstandungen im ID-/Kosten-/Ankündigungs-/Taktvertrag: 0.

## Aussagegrenzen

- Nine strategy/seed samples plus one exact replay are deterministic technical probes, not a representative human win-rate estimate.
- Identical seeded Math.random and Phaser RND states before scene creation; post-create Math.random calls rose from1736 to2170. The additional434 creation calls mean the same seed is not an identical combat-random sequence across versions. Phaser RND post-create states match.
- Meteor impact positions consume Math.random, so the post-create RNG shift is a material confound. The cause of the434 additional creation calls has not been isolated.
- The bot fingerprint covers its listed combat files and omits UI; a separate pre-matrix functional source snapshot confirms UIScene, BootScene and BattleScene are unchanged afterward. All source proof is included in this report.
- This comparison changes the integrated announced-wave system as a version, including formation composition and dispatch order; it does not isolate each mechanism or prove a global difficulty direction.
- The fixed bot does not read or react to the newly announced tactic. It buys every1500 game-ms according to its unchanged roster and uses its old threat-triggered abilities.
- Line mode means clubman/swordsman/duelist/tank/mech only. All profiles retain the policy of at most one stone-tower attempt after recruitment; no tower was built in this matrix, and out-of-epoch attempts are rejected without cost.
- Old Normal Line seed101 reached the960s observation limit, so its duration is right-censored; it was neither a win nor a loss.
- Active-sprite observations are passive and could miss a same-frame birth and death; attempt/arrival counters remain complete. This matrix reports missing observations explicitly.

Vollständige Kosten, Basiswerte, Epochenzeiten, Kaufblockierungen und jede tatsächlich gespielte Welle stehen in comparison.json; Rohdaten liegen pro Partie daneben.
