# Streckenbasierter Gangvertrag für die 16-Frame-Migration

Die 520 ms gelten bei nominaler Geschwindigkeit. Der sichtbare Gang wird bei
Formationsbremsung aus der tatsächlich zurückgelegten Strecke abgeleitet. Die
Angriffszeit bleibt davon unabhängig: 320 ms, Kontakt nach 160 ms auf Sprite 12.

Vorgeschlagene Datei nach vollständiger Migration: `gait-metadata.json` neben
`weapon-sockets.json`. Dieser Entwurf ändert noch keine Produktionsdatei.

```json
{
  "version": 1,
  "animationLayoutVersion": 3,
  "frameSize": [256, 256],
  "walkFrames": [0, 1, 2, 3, 4, 5, 6, 7],
  "attackFrames": [8, 9, 10, 11, 12, 13, 14, 15],
  "attackFrameDurationMs": 40,
  "contactFrame": 12,
  "contactDelayMs": 160,
  "units": {
    "rifleman": {
      "nominalSpeedPxPerSecond": 44,
      "referenceDisplayScale": 0.43,
      "cycleDistancePixels": 22.88,
      "nominalCycleDurationMs": 520,
      "motionKind": "biped",
      "stanceFraction": 0.6,
      "doubleSupportFrames": [0, 4]
    },
    "sniper": {
      "nominalSpeedPxPerSecond": 36,
      "referenceDisplayScale": 0.43,
      "cycleDistancePixels": 18.72,
      "nominalCycleDurationMs": 520,
      "motionKind": "biped",
      "stanceFraction": 0.6,
      "doubleSupportFrames": [0, 4]
    }
  }
}
```

`cycleDistancePixels` ist die horizontale Strecke in Spielkoordinaten, bereits
mit dem nominalen Sprite-Maßstab. Sie darf nicht nochmals mit 0,43 multipliziert
werden. Änderungen der tatsächlichen `scaleX` benötigen eine proportionale
Anpassung relativ zu `referenceDisplayScale`. Beide Teams verwenden dieselbe
Strecke; der sichtbare Sprite und seine Marker werden horizontal gespiegelt.

Nach dem tatsächlichen Positionsupdate wird `abs(xNeu - xAlt)` aufsummiert.
`phase = (distance / cycleDistancePixels) % 1`, `frame = floor(phase * 8)`.
Phasenversatz zur Entkopplung der Truppe darf als Anfangswert der Distanz
gesetzt werden; der bisherige globale Zeitversatz allein reicht nicht aus.
Teleports, Spawn, Pool-Wiederverwendung und Neustart setzen die Distanzreferenz
zurück. Pause bewegt weder Distanz noch Angriffsuhr. Zeitraffer wirkt bereits
auf Simulation und Bewegung und darf den Gang nicht noch einmal beschleunigen.

Bei halber Bewegung dauert ein Zyklus somit 1040 ms; bei Stillstand bleibt die
Phase stehen. Der Laufzeitvertrag soll keine neue Schrittbewegung erzeugen,
während eine Formation stillsteht. Eine separate, geprüfte Idle-Transition ist
noch offen: Ein unmittelbares Umschalten eines angehobenen Fußes auf Frame 0
kann einen kleinen Fußsprung erzeugen. Bloßes Einfrieren lässt ihn dagegen
gegebenenfalls angehoben. Die beiden Schützen besitzen auf Frames 0 und 4
beide Sohlen am Boden; eine kontrollierte Auslauf-/Standphase ist vor der
Gesamtübernahme im echten Spiel zu prüfen. Es ist nicht korrekt, bereits für
beliebige abrupte Stopps vollständige Rutschfreiheit zu behaupten.

Die Exportgeometrie verwendet die Kameraprojektion:

`worldStride = nominalSpeed * 0.520 / (rawPixelsPerWorldUnit * displayScale)`.

Während 60 % der Phase bewegt sich der Standfuß genau mit negativer nomineller
Weltgeschwindigkeit. In der Schwungphase wird er angehoben und zurückgeführt.
Die Quellenprüfung addiert die virtuelle Vorwärtsbewegung zu den tatsächlich
ausgewerteten Sohlenpunkten und misst deren Restdrift bei 129 Zeitpunkten je Clip.

Für Reiter gilt dieselbe Streckenmetrik, aber eigene Beinphasen und gemessene
Hufkontakte. Ein Dino erhält seine tatsächliche Beinanatomie. Beim Mech gelten
die eigenen Fuß-/Gelenkpunkte. Für Räder und Ketten müssen Umfang beziehungsweise
Gliedabstand aus der Quelle gemessen werden: Eine 520-ms-Schleife ist dort nur
zulässig, wenn sich die Mechanik nach der passenden Strecke nahtlos schließt.
Die Katalogwerte sind deshalb für Fahrzeuge zunächst Zielstrecken, kein Beleg
für einen bereits korrekt konstruierten Radumfang.

Auch bei perfekter 3D-Standphase bleiben acht gerenderte Gangbilder diskrete
Samples. Beim Rifleman sind es 2,86 Spielpixel Bewegung je nominalem 65-ms-Hold,
beim Sniper 2,34 Pixel. Diese begrenzte sichtbare Quantisierung ist separat von
kontinuierlichem Fußgleiten zu beurteilen. Eine spätere höhere Samplezahl oder
Echtzeitskelettanimation wäre dafür eine weitere, eigenständige Migration.

Der nominale Katalog mit echten Quellenprojektionen wird in
`gait-catalog.json` abgelegt; die gemessenen Schützen-Kontakte stehen in
`ranged-family/source-audit.json`. Die vollständige Migration verlangt 20
validierte Einträge und alle 40 passenden Sheets, bevor der Bootvertrag wechselt.
