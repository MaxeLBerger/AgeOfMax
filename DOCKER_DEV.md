# Docker Development Environment - Age of Max

## 🚀 Quick Start für Vibe Coding mit Docker

Dieses Setup ermöglicht es dir, den kompletten Development-Stack in Docker zu betreiben:
- Game Dev Server mit Hot-Reload
- MCP Server für automatische Code-Analyse
- Auto-Fixer für automatische Issue-Behebung

### Starten des Dev-Environments

```powershell
# Starte alle Development Services
docker-compose --profile dev up -d

# Logs anschauen
docker-compose logs -f

# Nur Game Dev Server starten
docker-compose --profile dev up game-dev

# Nur MCP Server starten
docker-compose --profile dev up mcp-server

# Alles stoppen
docker-compose --profile dev down
```

### Services & Ports

| Service | Port | Beschreibung |
|---------|------|--------------|
| **game-dev** | 5173 | Vite Dev Server mit Hot-Reload |
| **mcp-server** | 3000 | MCP Analysis Server |
| **auto-fixer** | - | Automatische Issue-Behebung |

## 🎮 Zugriff auf die Services

### Game Development
```
http://localhost:5173
```
Dein Spiel läuft hier im Development-Mode. Änderungen am Code werden automatisch neu geladen!

### MCP Server API
```
http://localhost:3000/health
http://localhost:3000/mcp
```

### MCP Tools testen

```powershell
# Game analysieren
curl -X POST http://localhost:3000/mcp `
  -H "Content-Type: application/json" `
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "analyze-game",
      "arguments": {}
    }
  }'

# HIGH Priority Issues abrufen
curl -X POST http://localhost:3000/mcp `
  -H "Content-Type: application/json" `
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get-issues-by-priority",
      "arguments": {"priority": "HIGH"}
    }
  }'

# Fix-Code generieren
curl -X POST http://localhost:3000/mcp `
  -H "Content-Type: application/json" `
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "generate-fix",
      "arguments": {"issueTitle": "XP Gain Visual Feedback"}
    }
  }'
```

## 🤖 Automatische Issue-Behebung

Der `auto-fixer` Service analysiert automatisch alle Issues und erstellt:
1. GitHub Issue Files (Markdown)
2. Fix-Code für jedes Issue
3. Utility-Dateien in `src/utils/`

### Manueller Aufruf des Auto-Fixers

```powershell
# In den auto-fixer Container einsteigen
docker exec -it age-of-max-fixer sh

# Script manuell ausführen
node scripts/auto-fix-runner.js
```

### Auto-Fix mit automatischer Anwendung

```powershell
# Setze AUTO_FIX=true in docker-compose.yml:
# environment:
#   - AUTO_FIX=true

docker-compose --profile dev up auto-fixer
```

## 📂 Volume Mounting

Alle Änderungen im Container werden direkt in deinen lokalen Files gespeichert:

```yaml
volumes:
  - .:/app              # Komplettes Projekt
  - /app/node_modules   # Node modules bleiben im Container
```

Das bedeutet:
- ✅ Änderungen am Code werden sofort im Container aktiv
- ✅ Generierte Files erscheinen lokal in deinem Projekt
- ✅ Hot-Reload funktioniert out-of-the-box
- ✅ Du kannst VS Code lokal nutzen, während Docker im Hintergrund läuft

## 🔧 MCP Server Tools Übersicht

### 1. `analyze-game`
Komplette Analyse aller Issues und des Fortschritts.

**Input:** Keine Parameter  
**Output:** 
```json
{
  "totalIssues": 14,
  "byPriority": {
    "HIGH": 5,
    "MEDIUM": 5,
    "LOW": 4
  },
  "completionPercentage": 85
}
```

### 2. `get-issues-by-priority`
Filtert Issues nach Priorität.

**Input:** `{ "priority": "HIGH" | "MEDIUM" | "LOW" }`  
**Output:** Array von Issue-Objekten

### 3. `get-issues-by-category`
Filtert Issues nach Kategorie.

**Input:** `{ "category": "Audio" | "Gameplay" | "UI/UX" | "Content" }`  
**Output:** Array von Issue-Objekten

### 4. `generate-fix`
Generiert TypeScript-Code zur Behebung eines Issues.

**Input:** `{ "issueTitle": "XP Gain Visual Feedback" }`  
**Output:** 
```json
{
  "fixCode": "class XPFeedbackSystem { ... }",
  "files": ["src/scenes/BattleScene.ts", "src/game/types.ts"]
}
```

### 5. `create-issue-files`
Erstellt Markdown-Files für GitHub Issues.

**Input:** `{ "outputDir": "./generated-issues" }` (optional)  
**Output:** 
```json
{
  "created": 14,
  "directory": "/app/generated-issues"
}
```

## 📝 Workflow für Vibe Coding

### 1. Environment starten
```powershell
docker-compose --profile dev up -d
```

### 2. Game öffnen
Browser: `http://localhost:5173`

### 3. Issues analysieren
```powershell
# PowerShell Script
$mcpUrl = "http://localhost:3000/mcp"
$body = @{
  jsonrpc = "2.0"
  id = 1
  method = "tools/call"
  params = @{
    name = "analyze-game"
    arguments = @{}
  }
} | ConvertTo-Json

Invoke-RestMethod -Uri $mcpUrl -Method POST -Body $body -ContentType "application/json"
```

### 4. GitHub Issues erstellen
```powershell
$body = @{
  jsonrpc = "2.0"
  id = 2
  method = "tools/call"
  params = @{
    name = "create-issue-files"
    arguments = @{}
  }
} | ConvertTo-Json

Invoke-RestMethod -Uri $mcpUrl -Method POST -Body $body -ContentType "application/json"
```

Jetzt hast du Markdown-Files in `generated-issues/`, die du direkt als GitHub Issues erstellen kannst!

### 5. Fix-Code generieren und anwenden
```powershell
# Fix für "XP Gain Visual Feedback" generieren
$body = @{
  jsonrpc = "2.0"
  id = 3
  method = "tools/call"
  params = @{
    name = "generate-fix"
    arguments = @{
      issueTitle = "XP Gain Visual Feedback"
    }
  }
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri $mcpUrl -Method POST -Body $body -ContentType "application/json"

# Fix-Code anschauen
$result.result.structuredContent.fixCode
```

Der generierte Code wird automatisch in `src/utils/` gespeichert, wenn `AUTO_FIX=true` gesetzt ist.

### 6. Code im VS Code bearbeiten
Öffne die generierten Files in VS Code und integriere sie in `BattleScene.ts`:

```typescript
import { XPFeedbackSystem } from '../utils/xp-gain-visual-feedback';

// In BattleScene.create():
this.xpFeedback = new XPFeedbackSystem(this);

// Wenn Unit stirbt:
this.xpFeedback.showXPGain(unit.x, unit.y, xpAmount);
```

### 7. Hot-Reload sehen
Speichere die Datei → Browser lädt automatisch neu!

## 🐛 Troubleshooting

### Port bereits belegt
```powershell
# Ports ändern in docker-compose.yml
ports:
  - "5174:5173"  # Ändere 5173 zu einem freien Port
```

### Container startet nicht
```powershell
# Logs checken
docker-compose logs game-dev
docker-compose logs mcp-server

# Container neu bauen
docker-compose --profile dev build --no-cache
docker-compose --profile dev up -d
```

### Node Modules fehlen
```powershell
# Im Container neu installieren
docker exec -it age-of-max-dev npm install
docker exec -it age-of-max-mcp npm install
```

### MCP Server antwortet nicht
```powershell
# Health Check
curl http://localhost:3000/health

# MCP Server neu starten
docker-compose restart mcp-server
```

## 🎯 Production Build

```powershell
# Production Container bauen und starten
docker-compose --profile production up -d

# Game erreichbar unter:
# http://localhost:8080
```

## 📊 Logs & Monitoring

```powershell
# Alle Logs
docker-compose logs -f

# Nur Game Dev Server
docker-compose logs -f game-dev

# Nur MCP Server
docker-compose logs -f mcp-server

# Nur Auto-Fixer
docker-compose logs -f auto-fixer

# Letzte 100 Zeilen
docker-compose logs --tail=100
```

## 🧹 Cleanup

```powershell
# Services stoppen
docker-compose --profile dev down

# Services stoppen + Volumes löschen
docker-compose --profile dev down -v

# Images löschen
docker-compose --profile dev down --rmi all

# Alles löschen (inkl. Build Cache)
docker system prune -a
```

---

**Happy Vibe Coding! 🎮✨**
