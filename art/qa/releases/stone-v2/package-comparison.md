# Stone-v2: isoliertes Produktionspaket

Status: bereit für unabhängige Übernahme und HTTP-/HUD-Prüfung durch Root. Dieses Paket wurde nicht nach `dist` kopiert; kein Browser oder Port wurde gestartet.

| Vergleich | Ergebnis |
|---|---|
| Abgenommenes Ausgangspaket | `art/qa/releases/wave-tactics-v1/package` |
| Neues Paket | `art/qa/releases/stone-v2/package` |
| Dateianzahl | jeweils 73 |
| Ausgangsgröße | 20.928.485 Bytes |
| Neue Größe | 20.987.732 Bytes |
| Differenz | +59.247 Bytes |
| Einzige geänderte Datei | `assets/reborn/backgrounds/stone.png` |
| Alle übrigen Dateien | 72 von 72 byteidentisch, einschließlich JavaScript und index.html |
| Laufendes dist | Vorher-/Nachher-Manifest unverändert |
| Ausgangspaket | Vorher-/Nachher-Manifest unverändert |

Die neue PNG umfasst 1.839.104 Bytes und hat SHA-256 `4f6a38d257a0c1076f01b5ea5ebe7f19f9fed97d00c7bb0b053bf98453435fe4`. Sie entspricht exakt dem öffentlichen Asset und dem freigegebenen Blender-Kandidaten. Die alte PNG umfasste 1.779.857 Bytes, SHA-256 `81eb79b9204a718fd33df699e466c7d78cc6255771fd23119fdbd20d80a269e4`.

Das nicht referenzierte neue Animationsmodul verändert das Produktions-JavaScript nicht; dessen Byteidentität wurde direkt geprüft. Der vollständige Vergleich aller Dateinamen, Größen und SHA-256-Werte steht in `package-comparison.json`. Die vor dem Build erfassten geschützten Manifeste stehen in `prebuild-protected-manifest.json`; Vite-Ausgabe in `build.log`.

Buildbefehl:

```powershell
node node_modules/vite/bin/vite.js build --outDir art/qa/releases/stone-v2/package
```

Die Prüfung durch `tools/verify-stone-package.mjs` besteht alle neun Kriterien. Die HTTP-Auslieferung und erneute persönliche HUD-Prüfung dieses Produktionspakets erfolgen anschließend im Hauptauftrag.
