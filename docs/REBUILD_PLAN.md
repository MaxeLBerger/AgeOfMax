# Age of Max: eigenständiger Neuaufbau

## Auftrag und Qualitätsmaßstab

Das Ziel ist ein visuell und spielerisch überzeugendes Strategiespiel über fünf Epochen. AAA-Qualität ist der Anspruch, keine automatisch durch einen Build erreichte Eigenschaft. Der Umbau wird eigens geplant; kein vorgefertigter Blender- oder Spiele-Skill wird verwendet. Bestehende Spielfunktionen werden geprüft und tatsächlich nutzbar gemacht. Finale Bewertung braucht echte Partien, visuelle Kontrolle und nachvollziehbare technische Ergebnisse.

## Befund des Ausgangsstands

Phaser/TypeScript, fünf Epochen, zwanzig Einheiten und fünfzehn Verteidigungen sind vorhanden. Die Darstellung vermischt Bildstile und Größen; Zukunftseinheiten sind farbige Quadrate. Audio wird aufgerufen, aber nicht geladen. Kampf- und Wirtschaftscode enthält funktionale Brüche: fehlendes passives Einkommen, Sekunden/Millisekunden-Verwechslung beim Basenangriff, Nahkämpfer treffen Fernkämpfer nicht regulär, widersprüchliche Bewegung, veraltete Zustände wiederverwendeter Objekte. Tests prüfen überwiegend Logs und Canvas-Sichtbarkeit und belegen keine funktionierende Partie.

## Entwurf

### Spielerlebnis

Der Kern bleibt ein seitliches Age-of-War-Strategiespiel: Gold in Frontkämpfer, Fernkampf, schwere Durchbrüche oder dauerhafte Verteidigung investieren; gegnerische Wellen lesen; Spezialangriffe im entscheidenden Moment einsetzen; Erfahrung für einen bewussten Epochenwechsel nutzen. Vorbereitung, Angriff und Erholung bilden einen verständlichen Rhythmus. Drei Schwierigkeitsgrade verändern Druck und Fehlertoleranz. Eine Partie soll Entscheidungen und Gegenwehr enthalten, statt durch einen Zeitfehler sofort zu enden oder durch fehlendes Einkommen festzustecken.

Einheitliche Simulationszeit steuert Bewegung, Kampf, Einkommen, Wellen, Projektile und Fähigkeiten. Pause stoppt die Simulation vollständig. Neustart setzt alle Zustände und Event-Abonnements zurück. Sieg und Niederlage führen zu einer Ergebnisansicht mit erneuter Partie oder Hauptmenü.

### Art Direction und Blender

Ein detailliertes, stilisiertes Miniatur-Diorama verbindet alle Epochen. Die Landschaft erhält Tiefe, atmosphärische Fernberge, gerichtetes warmes Licht und kühle Schatten. Figuren und Bauwerke erhalten lesbare Silhouetten, abgestimmte Proportionen, geschichtete Konstruktion, unterschiedliche Materialien und eindeutige Waffen. Bronze, Elfenbein, gedämpfte Naturfarben und Türkis bilden die gemeinsame Palette.

Die Grafiken entstehen tatsächlich in Blender und werden mit reproduzierbaren Skripten sowie editierbaren `.blend`-Dateien geliefert. Orthografische gerenderte Sprites integrieren die Blender-Produktion in Phaser. Fünf Schlachtfelder, fünf Basen, zwanzig animierte Einheiten und fünfzehn Türme bilden den vollständigen Inhalt. Die Kamera und der Fußanker sind vereinheitlicht. 8 horizontale Frames à 256 × 256 pro Einheit: 0–3 Bewegung, 4–7 Angriff. Hintergründe 1600 × 900, Basen 512 × 512, Türme 256 × 256. Laufzeitansicht 1280 × 720, Kampflinie y=500.

### Oberfläche und Ton

Deutsche Oberfläche mit klarer Hierarchie: kompakte Ressourcen und Wellenanzeige, große lesbare Rekrutierungskarten, sichtbare Preise, Fähigkeiten mit Abklingzeiten, Epochenfortschritt und verständliche Bauplatz-Auswahl. Gold/Bronze-Akzente auf dunklem Marineblau, ruhige elfenbeinfarbene Schrift. Maus und Tastatur sind gleichwertig. Tooltips erklären Rollen und Werte. Settings speichern Musik, Effekte und reduzierte Bewegung. Audio muss hörbar funktionieren und sauber freigegeben werden.

## Produktionsfolge

1. Ausgangszustand lesen, starten und dokumentieren; fundamentale Kampf- und Wirtschaftssysteme reparieren.
2. Blender-Pipeline, Landschaft, Steinzeiteinheiten und Basen produzieren und im echten Spiel visuell prüfen.
3. Alle Epochen vervollständigen; Größen, Animation, Beleuchtung, Teams und Lesbarkeit im Kampf abstimmen.
4. Menüs, HUD, Audio, Spezialeffekte, Fortschritt und Ergebnisfluss integrieren.
5. Build, Typprüfung, gezielte Logik- und Browserprüfungen durchführen; Fehler beheben.
6. Echte Partien über Bedienung spielen: Rekrutierung, Bau/Upgrade/Verkauf, Fähigkeiten, Aufstieg, Pause, Sieg/Niederlage und Neustart. Mehrere Strategien und Schwierigkeitsgrade prüfen und nachbalancieren.
7. Screenshots und Messungen des tatsächlichen Endstands liefern; offene Qualitätslücken ausdrücklich dokumentieren.

## Abschlussprüfung

- Jede der fünf Epochen nutzt echte neue Blender-Inhalte ohne Platzhalter oder fehlende Dateien.
- Lauf- und Angriffsanimationen entsprechen dem Spielzustand; keine schwebenden, abgeschnittenen oder falsch skalierten Einheiten.
- Kämpfe, Reichweiten, Angriffstakte, Gold, Erfahrung, Wellen, Evolution und Fähigkeiten ergeben funktionierende Partien.
- Beide Spielergebnisse und der Neustart funktionieren ohne Reload; Pause hält sämtliche relevanten Spielzustände an.
- Maus und Tastatur, drei Schwierigkeitsgrade, Einstellungen und skalierte Browseransichten funktionieren.
- Keine Laufzeitfehler oder fehlgeschlagenen notwendigen Asset-Ladevorgänge; getestete Laufzeitperformance wird dokumentiert.
- Spieltests enthalten tatsächliche Entscheidungen über die Oberfläche. Erzwungene Testzustände werden als technische Tests gekennzeichnet und ersetzen keine gespielten Partien.
- Visuelle Wirkung und Spielspaß werden separat von grünen Techniktests beurteilt. Ein nicht belegter AAA-Anspruch bleibt offen.

## Abnahme des bisherigen Neuaufbaus

Die geplanten fünf Epochen sind mit eigenen Blender-Quellen und vollständigen Laufzeitbildern integriert. Zwanzig Einheitentypen besitzen beide Fraktionen, fünf Basen beide Teams, alle fünfzehn spielbaren Türme eigene Modelle. Renaissance, Moderne und Zukunft erhalten zusätzlich ausgearbeitete Architekturrevisionen; Titan und Scharfschütze wurden nach dem ersten Export gesondert überarbeitet. Die Bildrevisionen werden mit realem HUD verglichen und aus den kanonischen Blender-Dateien erneut exportiert.

Der aktuelle Entwicklungsstand besteht 23 Browserprüfungen und 120 Logiktests; TypeScript und ESLint sind erfolgreich. Drei vollständige eigenständig über Maus/Tastatur gespielte Normal-Partien endeten nach 8:44 mit 125 Kills, nach 7:31 mit 104 Kills und mit der neuen Wellentaktik nach 8:26 mit 122 Kills im Sieg. Die erste und dritte erreichten alle fünf Epochen. Echte Käufe, verdiente Erfahrung, Fähigkeiten, Basisverteidigung und Neustart sind protokolliert. Die dritte Partie musste einen beobachteten Basiseinbruch auf 3542/5600 im Mittelalter auffangen. Gezielte technische Szenen- und Ergebnisprüfungen sind ausdrücklich von diesen Partien getrennt.

Angekündigte gegnerische Taktiken sind inzwischen integriert. Die Aufklärung zeigt die festgelegte Zusammensetzung, kommende Gegnerepoche und passende Hinweise; die Formation reagiert nicht heimlich auf Spielerentscheidungen. Ein unabhängiger Vergleich mit neun reproduzierbaren Botpartien bestätigt den korrekten Ablauf, hat aber klare Grenzen: Der Bot liest die Aufklärung nicht, baut keine Türme und ersetzt keine menschliche Beurteilung der Schwierigkeit. Die mittelalterliche Kulisse wurde zusätzlich durch eine zusammenhängende, tatsächlich in Blender gebaute Hangfestung mit Wehrgängen, Tortunnel und Brücke ersetzt.

**Das AAA-Ziel bleibt offen.** Die nächste konkrete Grafikarbeit betrifft vollständige Körperbewegungen mit acht Bewegungs- und acht Angriffsphasen, Fußkontakt und gebundenen Händen/Waffen. Erste Blender-Studien für Keulenträger und Ritter sind visuell geprüft; Gewehrschütze und Scharfschütze folgen als eigener Schusswaffen-Batch. Sie sind noch keine Laufzeitassets. Die Migration muss alle 40 Fraktions-Sheets, 20 Waffenmarkerreihen, Exporter, Bootprüfung und Animationsauswahl zusammen erfüllen; Schaden bleibt beim sichtbaren Kontakt nach 160 Millisekunden, der Angriff dauert 320 Millisekunden. Zusätzlich wird die Steinzeitlandschaft um eine glaubwürdigere Siedlung, organische Steine und abwechslungsreichere Vegetation ausgearbeitet. Die vorhandene spielbare Version bleibt während dieser Kandidatenarbeit nutzbar.

Stärker ausgearbeitete Charakterdetails, sauberer Fußkontakt auch bei gedrosselter Formation und unabhängige Spieltests bleiben Qualitätsaufgaben. Das ist eine gestalterische und spielerische Bewertung; grüne technische Prüfungen ersetzen sie nicht. Die erhaltenen editierbaren Blender-Szenen und die eigenständigen Überarbeitungsskripte ermöglichen weitere gezielte Iterationen.

Details und reproduzierbare Belege stehen in [QA_REBUILD.md](QA_REBUILD.md) und [BLENDER_ART.md](BLENDER_ART.md).
