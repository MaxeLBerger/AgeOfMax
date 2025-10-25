# TEXTURE VERIFICATION TEST - Anleitung

## Übersicht
Dieses Dokument beschreibt, wie du den vollständigen Texture-Logging-Test durchführst, um sicherzustellen, dass alle Units mit den richtigen Texturen spawnen.

## Voraussetzungen
- Das Spiel muss gebaut sein: \
pm run build\
- Dev-Server muss laufen: \
pm run dev\
- Browser-Developer-Tools (F12) geöffnet

## Test-Methode 1: Automatisches Test-Skript

### Schritt 1: Spiel starten
\\\ash
npm run dev
\\\

Das Spiel öffnet sich auf http://localhost:5173 (oder höherem Port)

### Schritt 2: Browser-Console öffnen
- Drücke F12 in deinem Browser
- Gehe zum "Console" Tab

### Schritt 3: Developer Mode aktivieren
- Drücke F3 im Spiel
- Du solltest eine Benachrichtigung sehen: "Developer Mode: ON"

### Schritt 4: Test-Skript ausführen
1. Öffne die Datei \	est-texture-verification.js\
2. Kopiere den gesamten Inhalt
3. Füge ihn in die Browser-Console ein
4. Drücke Enter

### Schritt 5: Spiele 30 Sekunden
- Spawne verschiedene Units (U-Taste oder Mausklick)
- Lass Units kämpfen
- Warte 30 Sekunden

### Schritt 6: Ergebnisse analysieren
Nach 30 Sekunden wird automatisch ein Report angezeigt:

\\\
===== TEXTURE VERIFICATION =====
 MATCH 1: Clubman  clubman_2
 MATCH 2: Archer  archer
 MISMATCH 3: 
   Expected: Spearman with texture spearman
   Got: Clubman with texture clubman
...

===== VERIFICATION SUMMARY =====
Total Matches: 25
Total Mismatches: 0
Match Rate: 100.00%
\\\

## Test-Methode 2: Manuelles Logging prüfen

### Schritt 1: Spiel mit Developer Mode starten
\\\ash
npm run dev
\\\

Drücke F3 nach dem Laden

### Schritt 2: Units spawnen und Console beobachten
Spawne Units und beobachte die Console-Logs:

**Texture Selection Logs (nur Developer Mode):**
\\\
 Texture Selection: Clubman (clubman)  clubman_2 [2/2 variants]
[TEXTURE] Texture Selection: Clubman (clubman)  clubman_2 [2/2 variants]
\\\

**Spawn Logs (immer):**
\\\
 Spawned Clubman (player) | Texture: clubman_2 | HP: 96/96 | DMG: 8 | SPD: 40 | Epoch: stone
[SPAWN] Spawned Clubman (player) | Texture: clubman_2 | HP: 96/96 | DMG: 8 | SPD: 40 | Epoch: stone
\\\

### Schritt 3: Manuell vergleichen
Für jedes Spawn-Event:
1. Finde das vorherige Texture Selection Log
2. Vergleiche die selected Texture mit der Spawn Texture
3. Sie MÜSSEN übereinstimmen!

## Test-Methode 3: gameLogger API verwenden

Du kannst den gameLogger direkt in der Browser-Console verwenden:

\\\javascript
// Statistiken abrufen
window.gameLogger.getStats()

// Alle Texture-Logs abrufen
window.gameLogger.getLogs('texture')

// Alle Spawn-Logs abrufen
window.gameLogger.getLogs('spawn')

// Alle Logs exportieren
console.log(window.gameLogger.exportLogs())

// Logs löschen
window.gameLogger.clear()
\\\

## Test-Methode 4: Playwright E2E Test

### Voraussetzung
\\\ash
npm install  # Falls noch nicht geschehen
\\\

### Test ausführen
\\\ash
npx playwright test e2e/texture-verification.spec.ts
\\\

**Hinweis:** Der Playwright-Test funktioniert aktuell noch nicht vollständig, da die Console-Log-Erfassung angepasst werden muss.

## Erwartete Ergebnisse

###  ERFOLGREICHER Test
- Alle Texture Selection Logs haben entsprechende Spawn Logs
- selectedTexture === spawn texture für jedes Paar
- Match Rate: 100%
- Keine Mismatches

###  FEHLGESCHLAGENER Test
- Texture Selection Log zeigt "clubman_2"
- Aber Spawn Log zeigt "clubman" oder anderes
- Match Rate < 100%
- Mismatches werden gelistet

## Debugging bei Fehlern

### Problem: gameLogger ist undefined
**Lösung:** 
- Stelle sicher, dass das Spiel vollständig geladen ist
- Checke die Browser-Console auf Fehler
- Baue das Projekt neu: \
pm run build\

### Problem: Keine Texture Selection Logs
**Lösung:**
- Developer Mode muss aktiviert sein (F3)
- Checke ob die Benachrichtigung "Developer Mode: ON" erscheint
- Texture-Logs erscheinen nur im Developer Mode

### Problem: Keine Spawn Logs
**Lösung:**
- Units spawnen! (U-Taste oder Mausklick)
- Console öffnen bevor Units spawnen
- Check ob \gameLogger.getLogs('spawn')\ leer ist

### Problem: Mismatches gefunden
**Mögliche Ursachen:**
1. **Code-Bug:** Texture-Selection und Spawn verwenden unterschiedliche Unit-Daten
2. **Timing-Issue:** Spawn-Log gehört zu anderer Unit
3. **Async-Problem:** Race Condition beim Logging

**Debug-Schritte:**
1. Spawne nur eine Unit und checke die Logs
2. Vergleiche die Timestamps der Logs
3. Checke die Unit-IDs in den Log-Daten
4. Schaue in BattleScene.ts getUnitTexture() und spawnUnit()

## Beispiel-Output (Erfolgreich)

\\\
===== AGE OF MAX - TEXTURE VERIFICATION SCRIPT =====
Waiting 30 seconds for gameplay... Open Developer Mode with F3 and spawn some units!

 Texture Selection: Clubman (clubman)  clubman [1/2 variants]
[TEXTURE] Texture Selection: Clubman (clubman)  clubman [1/2 variants] {...}
 Spawned Clubman (player) | Texture: clubman | HP: 96/96 | DMG: 8 | SPD: 40 | Epoch: stone
[SPAWN] Spawned Clubman (player) | Texture: clubman | HP: 96/96 | DMG: 8 | SPD: 40 | Epoch: stone {...}

 Texture Selection: Archer (archer)  archer_2 [2/2 variants]
[TEXTURE] Texture Selection: Archer (archer)  archer_2 [2/2 variants] {...}
 Spawned Archer (player) | Texture: archer_2 | HP: 60/60 | DMG: 16 | SPD: 38 | Epoch: castle
[SPAWN] Spawned Archer (player) | Texture: archer_2 | HP: 60/60 | DMG: 16 | SPD: 38 | Epoch: castle {...}

... (28 Sekunden später) ...

===== COLLECTING LOGS FROM GAMELOGGER =====

===== LOGGER STATISTICS =====
Total Logs: 20
Texture Logs: 10
Spawn Logs: 10

===== TEXTURE SELECTION LOGS =====
1. Clubman (clubman)  clubman [1/2 variants]
2. Archer (archer)  archer_2 [2/2 variants]
3. Clubman (clubman)  clubman_2 [2/2 variants]
4. Rifleman (rifleman)  rifleman [1/2 variants]
...

===== SPAWN LOGS =====
1. Clubman (player) | Texture: clubman | HP: 96/96 | Epoch: stone
2. Archer (player) | Texture: archer_2 | HP: 60/60 | Epoch: castle
3. Clubman (enemy) | Texture: clubman_2 | HP: 67/96 | Epoch: stone
4. Rifleman (player) | Texture: rifleman | HP: 150/150 | Epoch: modern
...

===== TEXTURE VERIFICATION =====
 MATCH 1: Clubman  clubman
 MATCH 2: Archer  archer_2
 MATCH 3: Clubman  clubman_2
 MATCH 4: Rifleman  rifleman
...

===== VERIFICATION SUMMARY =====
Total Matches: 10
Total Mismatches: 0
Match Rate: 100.00%

 ALL TEXTURE VERIFICATIONS PASSED!

===== EXPORT LOGS (Copy to save) =====
[
  {
    "timestamp": 1729893456789,
    "type": "texture",
    "message": "Texture Selection: Clubman (clubman)  clubman [1/2 variants]",
    "data": {
      "unitName": "Clubman",
      "unitId": "clubman",
      "selectedTexture": "clubman",
      "variantIndex": 1,
      "totalVariants": 2
    }
  },
  ...
]
\\\

## Logs speichern für MCP-Analyse

Um die Logs für spätere MCP-Analyse zu speichern:

1. Führe das Test-Skript aus
2. Kopiere den JSON-Output unter "EXPORT LOGS"
3. Speichere in neue Datei: \logs/game-run-YYYY-MM-DD-HH-MM.json\

\\\ash
# Logs-Verzeichnis erstellen
mkdir -p logs

# Logs speichern (manuell aus Browser-Console kopieren)
# Oder programmatis ch:
\\\

## MCP Server Integration

Der MCP Server kann die gespeicherten Logs analysieren:

\\\ash
# MCP Server verwenden um Logs zu analysieren
# (Wird in späteren Updates implementiert)
\\\

## Zusammenfassung

 **Erfolgreicher Test bedeutet:**
- Texture-System funktioniert korrekt
- Random-Variant-Selection funktioniert
- Logging-System ist synchron
- Keine Race Conditions

 **Fehlgeschlagener Test bedeutet:**
- Bug im Texture-Mapping
- Bug in getUnitTexture() oder spawnUnit()
- Async/Timing-Problem
- Weitere Untersuchung nötig

## Next Steps

Nach erfolgreichem Test:
1. Commit die Änderungen
2. Dokumentiere die Ergebnisse
3. Erweitere das Logging-System (Combat, Epoch, etc.)
4. Implementiere File-based Logging
5. Integriere mit MCP Server

---

**Version:** 1.0  
**Erstellt:** 2025-10-26  
**Autor:** MCP Logger System
