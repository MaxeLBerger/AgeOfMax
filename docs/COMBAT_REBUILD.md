# Kampfsystem: Regeln und Nachweise

## Spielschleife

Eine Partie beginnt mit 12 Sekunden Aufbauzeit. Gegnerische Wellen bestehen aus
28 Sekunden Rekrutierung und 16 Sekunden Nachschubpause. Bereits aktive Truppen
kämpfen in der Pause weiter. Normal startet mit 240 Gold; passives Einkommen steigt
mit den fünf Epochen von 8 über 13, 20 und 29 auf 40 Gold pro Spielsekunde.

Der Spieler entscheidet mit ausreichender Kampferfahrung selbst über den
Epochenwechsel. Schwellen: 2200 / 4400 / 7800 / 13000 XP. Überzählige XP bleiben
erhalten. Ein Wechsel erhält den bisherigen Zustand der eigenen Basis und ergänzt
10 Prozent ihres neuen Maximums. Die gegnerische Basis wird dabei nicht verändert.
Die Gegner entwickeln sich auf Normal alle 135 Spielsekunden weiter, angewendet
zum Beginn der nächsten Welle. Easy: 155 Sekunden; Hard: 118 Sekunden.

Pro Seite können höchstens 24 Einheiten aktiv sein. Ein Kauf wird nur dann
berechnet, wenn tatsächlich ein Platz und ein Sprite verfügbar sind. Jede Epoche
besitzt vier Einheiten; nur die aktuell freigeschalteten Einheiten und Türme sind
bestellbar. Bestehende ältere Truppen und Türme bleiben erhalten.

## Angekündigte Taktiken

Der nächste Wellenplan steht während der Vorbereitung bzw. direkt beim Beginn
der Nachschubpause fest. Er enthält bereits die zum angekündigten Angriff
gehörende Gegnerepoche. Käufe und Epochenwechsel des Spielers verändern diesen
Plan nicht. Die Aufklärung ist mit I, Klick oder Mauszeiger auf der Wellenanzeige
erreichbar; sie zeigt die roten Gegnerporträts, Mengen, Epoche und einen
Taktikhinweis. Sie unterbricht die Simulation nicht.

Die Folge wechselt zwischen Mischformation, Durchbruch, Schützenformation und
Belagerung. Die Steinzeit verwendet mangels Belagerungswaffen eine Mischformation
an dieser Stelle; der moderne Durchbruch setzt auf Panzer. Mengen und
Eintrittszeitpunkte folgen weiterhin den bisherigen Wellenregeln. Die
Rekrutierungskosten einer Formation liegen zwischen 92 und 108 Prozent des
früheren festen Plans derselben Welle, Epoche und Schwierigkeit. Mindestens drei
Truppentypen und 30 Prozent Fronttruppen verhindern einseitige Extremformationen.
Das ist eine Begrenzung des Kostenbudgets, kein Beweis gleicher Kampfstärke.

Jeder geplante Eintritt wird genau einmal versucht. Wenn das Armee- oder
Spawnlimit den Eintritt verhindert, wird kein versteckter Nachholstapel erzeugt.
Die Aufklärung unterscheidet deshalb geplante Einheiten und tatsächlich
eingetroffene Verstärkung. Bereits gefallene Gegner bleiben in der Zahl der
eingetroffenen Einheiten enthalten.

Die gezielte Prüfung ergänzt 46 Logiktests und vier Browsertests. Der
unabhängige Planaudit prüft 480 Kombinationen aus fünf Epochen, drei
Schwierigkeiten und 32 Wellen sowie die tatsächliche Gewichtung der Taktiken.
Die technischen Spawns, angekündigte Epoche, unveränderliche Pläne, Bedienung
und alle fünf Aufklärungskarten bei 900 Pixeln wurden separat im Browser geprüft.

## Rollen

- Speerträger kontern Sturmtruppen mit 1,7-fachem Schaden.
- Reiter, Ritter und Superschwere verursachen 1,25-fachen Schaden gegen spezialisierte Fernkämpfer.
- Balliste, Kanone, Grenadier und Plasmatrupp verursachen Flächenschaden und 2,2-fachen Basisschaden.
- Panzer und Mech halten mit mehr HP und kürzerer Reichweite die Front vor Fernkämpfern.
- Scharfschützen haben besondere Reichweite und verursachen 1,4-fachen Schaden gegen Linientruppen.
- Türme bleiben stationär; Speerfallen verursachen Direktschaden. Schwere Türme schießen Flächenmunition, die Railgun durchschlägt drei Ziele.

Meteorregen ist von Beginn an nutzbar und richtet sich auf aktive Gegner. Artillerie
wird in der Renaissance freigeschaltet. Beide Fähigkeiten skalieren ihren Schaden
mit der Epoche und verwenden denselben Schaden-, Lebensbalken- und Belohnungspfad
wie Truppen. Kein separates, veraltetes HP-Feld bleibt zurück.

## Technische Korrekturen

Angriffsgeschwindigkeiten in JSON sind Sekunden. Nahkampf, Fernkampf, Basen und
Türme nutzen dieselbe Spielzeit; 1×, 2×, 4× und Pause wirken auch auf Einkommen,
Wellen, Fortschritt und Fähigkeiten. Der bisherige Vergleich von Millisekunden
gegen Sekunden bei Basisangriffen ist entfernt. Fernkämpfer werden beim Kontakt
beschädigt und können nicht durch wiederholtes Wegschieben unverwundbar bleiben.

Projektile prüfen die gesamte Flugstrecke eines Frames auf Treffer. Wiederverwendete
Projektile setzen Besitzer, Trefferliste, Durchschläge, Flächenschaden, Beschleunigung,
Position, Textur und Lebensdauer neu. Tote Einheiten deaktivieren ihre Physik und
geben höchstens einmal Gold/XP. Einheiten behalten keine verzögerten Nahkampfaktionen
über ihre Wiederverwendung hinweg. Ein Neustart entfernt die eigenen UI-Abonnements.

## Verifikation

`node node_modules/jest/bin/jest.js --runInBand` prüft Regeln sowie tatsächliche
Kontrollflüsse von `BattleScene` mit einem kleinen Renderer-/Physikstub. Das umfasst
Angriffstakte, Nahkampf gegen Fernkampf, Stoppen zum Schießen, Tod/HP/Belohnungen,
Pause/Tempo/Einkommen, XP-Überlauf, Neustartabonnements, Armeegrenze, Sieg, Wellenpausen,
Speerfallen und wiederverwendete Projektile. Diese Tests ersetzen keinen Browserlauf.

`node tools/combat-playthrough.mjs` führt auf dem lokalen Entwicklungsserver Port5179
eine separate technische Simulation mit der realen Phaser-Engine aus. Ein einfacher
Bot bestellt bezahlbare Mischtruppen und entwickelt sich nur mit verdienter Erfahrung
weiter. Er erhält keine Gratiswerte. `game.headlessStep` beschleunigt ausschließlich
diese technische Prüfung; sie wird nicht als manueller Spieltest ausgegeben.

Erster Balancing-Lauf: Sieg nach 125 Sekunden, nur zwei Spielerepochen. Dies zeigte
eine zu starke Rückkopplung aus Goldprämien und Truppenzuwachs. Nach Korrektur:
Sieg nach **513,6 Spielsekunden (8:34)** mit allen fünf Spielerepochen, ohne gemeldete
Browserfehler. Die gegnerische Basis fiel während ihrer vierten Epoche. Die eigene
Basis nahm bei diesem konsequenten Bot keine Schäden. Ergebnisdatei dieses Laufs:
`art/qa/combat-playthrough.json`.

Das ist ein erster reproduzierbarer Balancing-Nachweis, kein Beleg für allgemeine
Schwierigkeitsbalance oder AAA-Spielqualität. Weitere Partien nach Integration der
finalen Assetgrößen, mit verschiedenen Schwierigkeiten und menschlichen Entscheidungen,
sind für diese Aussagen erforderlich. Die ursprünglichen technischen Ergebnisse
beschreiben den Stand vor der abschließenden Blender-Integration.
