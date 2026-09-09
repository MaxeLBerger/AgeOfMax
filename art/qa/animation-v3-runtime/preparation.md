# Vorbereitung des16-Frame-Runtimevertrags

2026-09-09T03:06:13.184Z

36/36 gezielte Tests, TypeScript und ESLint bestanden. Nur unitAnimation.ts und unitAnimation.test.ts sind neu; keine bestehende Laufzeitintegration oder Produktion geändert.

Der Parser verlangt20 exakte Einheiten, Layout3, gültige endliche Werte und passende Nominalgeschwindigkeiten. Skalierte Zyklusstrecke, tatsächlicher Wegfortschritt, expliziter Reset und Angriffsauswahl sind getrennte reine Funktionen. Das abgestimmte Metadatenformat entspricht GAIT_CONTRACT.md.

Wichtiger Integrationspunkt: Phaser überträgt Arcade-Body-Bewegung erst in POST_UPDATE in die Spritekoordinaten. Die aktuelle Battle.update-Präsentation liegt davor. Den Weg für denselben gerenderten Frame daher erst nach World.postUpdate abtasten.

Stillstand hält die Laufphase unverändert; ein kontrollierter Übergang zum Stand, Lifecycle-Hooks,16Frame-/Socket-Übernahme und echte Browserprüfungen sind weitere Integrationsarbeit. Die synthetischen Testmetadaten sind kein Blender-Kontaktnachweis. Details und Quellenhashes stehen in preparation.json.
