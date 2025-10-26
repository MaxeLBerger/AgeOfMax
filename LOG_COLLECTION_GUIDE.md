# LOG COLLECTION ANLEITUNG

## Automatische Log-Sammlung für MCP-Analyse

### Schritt-für-Schritt Anleitung

#### 1. Spiel starten
```bash
npm run dev
```
Das Spiel öffnet sich im Browser (normalerweise http://localhost:5173)

#### 2. Developer Tools öffnen
- Drücke **F12** in deinem Browser
- Gehe zum **Console** Tab

#### 3. Developer Mode aktivieren
- Klicke ins Spiel-Fenster
- Drücke **F3**
- Du solltest eine Benachrichtigung sehen: "Developer Mode: ON"

#### 4. Log-Collector-Skript ausführen
1. Öffne die Datei `collect-logs.js` in diesem Projekt
2. Kopiere den GESAMTEN Inhalt (Strg+A, Strg+C)
3. Füge ihn in die Browser-Console ein (Strg+V)
4. Drücke **Enter**

Du solltest sehen:
```
=== MCP LOG COLLECTOR STARTED ===
Collecting logs for 60 seconds...
Please spawn units and play normally!
 Log collector initialized
 Console.log intercepted
 Timer started: 60 seconds
```

#### 5. Spiele 60 Sekunden
- Spawne verschiedene Units (U-Taste oder Mausklick)
- Lass sie kämpfen
- Versuche verschiedene Epochen zu erreichen
- Je mehr Units du spawnst, desto besser!

#### 6. Automatischer Download
Nach 60 Sekunden:
- Das Skript analysiert automatisch alle Logs
- Zeigt Ergebnisse in der Console an
- Lädt automatisch eine JSON-Datei herunter: `game-logs-[timestamp].json`

#### 7. Datei teilen
Die heruntergeladene Datei findest du in deinem Downloads-Ordner.

**Option A: Datei hochladen**
- Ziehe die JSON-Datei einfach in den Chat

**Option B: Inhalt kopieren**
1. Öffne die JSON-Datei mit einem Texteditor
2. Kopiere den gesamten Inhalt
3. Füge ihn in den Chat ein

## Was das Skript macht

### Während der 60 Sekunden:
-  Fängt alle console.log() Aufrufe ab
-  Parst Texture-Selection-Logs
-  Parst Unit-Spawn-Logs
-  Speichert Timestamps für jedes Event

### Nach 60 Sekunden:
-  Vergleicht Texture-Selection mit Spawn-Logs
-  Findet Mismatches (falsche Texturen)
-  Berechnet Match-Rate
-  Exportiert alles als strukturierte JSON

### Beispiel Console-Output:
```
=== LOG COLLECTION COMPLETE ===
Duration: 60.0s
Total Console Logs: 234
Texture Selection Logs: 45
Spawn Logs: 45

=== TEXTURE SELECTION LOGS ===
1. Clubman (clubman)  clubman_2 [2/2]
2. Archer (archer)  archer [1/2]
3. Spearman (spearman)  spearman [1/1]
...

=== SPAWN LOGS ===
1. Clubman (player) | Texture: clubman_2 | HP: 96/96 | Epoch: stone
2. Archer (player) | Texture: archer | HP: 60/60 | Epoch: castle
3. Spearman (enemy) | Texture: spearman | HP: 120/120 | Epoch: stone
...

=== VERIFICATION ANALYSIS ===
 MATCH 1: Clubman  clubman_2
 MATCH 2: Archer  archer
 MATCH 3: Spearman  spearman
...

=== SUMMARY ===
Total Matches: 45
Total Mismatches: 0
Match Rate: 100.00%

 ALL TEXTURE VERIFICATIONS PASSED!

 Downloaded: game-logs-2025-10-26T00-42-15.json
```

## Troubleshooting

### Problem: Skript startet nicht
**Lösung:**
- Stelle sicher, dass du den KOMPLETTEN Inhalt von collect-logs.js kopiert hast
- Checke ob Fehler in der Console angezeigt werden

### Problem: Keine Logs werden gesammelt
**Lösung:**
- Drücke F3 im Spiel um Developer Mode zu aktivieren
- Texture-Selection-Logs erscheinen nur im Developer Mode
- Spawn-Logs erscheinen immer

### Problem: Download funktioniert nicht
**Lösung:**
- Checke Browser-Popup-Blocker
- Checke ob Downloads erlaubt sind
- Alternativ: Kopiere den JSON-Output aus der Console:
  ```javascript
  copy(JSON.stringify(window.gameLoggerResults, null, 2))
  ```
  Dann in Chat einfügen

### Problem: Zu wenig Daten
**Lösung:**
- Spawne mehr Units während der 60 Sekunden
- Aktiviere Developer Mode VOR dem Skript-Start
- Stelle sicher, dass das Spiel im Fokus ist

## JSON-Struktur

Die exportierte Datei enthält:

```json
{
  "summary": {
    "duration": 60,
    "totalLogs": 234,
    "textureSelectionCount": 45,
    "spawnCount": 45,
    "matches": 45,
    "mismatches": 0,
    "matchRate": "100.00",
    "issues": []
  },
  "textureLogs": [
    {
      "timestamp": 1729894935123,
      "unitName": "Clubman",
      "unitId": "clubman",
      "selectedTexture": "clubman_2",
      "variantIndex": 2,
      "totalVariants": 2,
      "fullMessage": " Texture Selection: Clubman (clubman)  clubman_2 [2/2 variants]"
    }
  ],
  "spawnLogs": [
    {
      "timestamp": 1729894935124,
      "unitName": "Clubman",
      "side": "player",
      "texture": "clubman_2",
      "hp": "96/96",
      "damage": "8",
      "speed": "40",
      "epoch": "stone",
      "fullMessage": " Spawned Clubman (player) | Texture: clubman_2 | ..."
    }
  ],
  "allLogs": []
}
```

## Was ich damit mache

Mit der JSON-Datei kann ich:
1.  Jede Unit-Texture-Zuordnung verifizieren
2.  Mismatches identifizieren
3.  Timing-Probleme erkennen
4.  Fehlende Texturen finden
5.  Variant-Distribution analysieren

## Alternative: Manuelles Logging

Falls das Skript nicht funktioniert, kannst du auch manuell loggen:

1. Starte das Spiel mit F3 (Developer Mode)
2. Spawne Units
3. Kopiere die relevanten Logs aus der Console
4. Teile sie im Chat

Beispiel was ich brauche:
```
 Texture Selection: Clubman (clubman)  clubman_2 [2/2 variants]
 Spawned Clubman (player) | Texture: clubman_2 | HP: 96/96 | DMG: 8 | SPD: 40 | Epoch: stone
```

---

**Bereit?** Dann starte jetzt:
1. `npm run dev`
2. F12  Console Tab
3. F3 im Spiel
4. Skript einfügen
5. 60 Sekunden spielen
6. JSON-Datei teilen!
