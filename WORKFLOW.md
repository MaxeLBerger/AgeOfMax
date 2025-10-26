# Automatischer Fix-Workflow für Age of Max 🎮

## 🚀 Komplett-Setup in 3 Schritten

### 1️⃣ Docker Dev Environment starten
```powershell
.\start-dev-docker.ps1
```

Das Script:
- ✅ Prüft Docker
- ✅ Startet alle Services
- ✅ Testet MCP Server
- ✅ Analysiert dein Game
- ✅ Erstellt GitHub Issue Files

**Oder manuell:**
```powershell
docker-compose --profile dev up -d
```

### 2️⃣ Browser öffnen
```
http://localhost:5173  # Dein Game mit Hot-Reload
http://localhost:3000  # MCP Server API
```

### 3️⃣ Code schreiben und automatisch testen! 🎉

Jede Änderung wird sofort im Browser sichtbar!

---

## 🔄 Automatischer Fix-Workflow

### Variante A: Vollautomatisch (mit Auto-Fix)

```powershell
# In docker-compose.yml aktivieren:
# environment:
#   - AUTO_FIX=true

docker-compose --profile dev up auto-fixer
```

**Was passiert:**
1. Alle Issues werden analysiert
2. HIGH Priority Issues werden identifiziert
3. Fix-Code wird automatisch generiert
4. Code wird in `src/utils/` gespeichert
5. Du musst nur noch integrieren!

### Variante B: Interaktiv (empfohlen)

```powershell
# In den Auto-Fixer Container
docker exec -it age-of-max-fixer sh

# Script starten
node scripts/auto-fix-runner.js
```

**Interaktives Menü:**
```
1. Analyze game and show all issues
2. Get HIGH priority issues
3. Get MEDIUM priority issues
4. Get LOW priority issues
5. Generate fix for specific issue
6. Create GitHub issue files
7. Auto-fix all HIGH priority issues
8. Exit
```

### Variante C: Über MCP API

```powershell
# PowerShell Helper Function
function Call-MCP {
    param($tool, $args = @{})
    
    $body = @{
        jsonrpc = "2.0"
        id = (Get-Random)
        method = "tools/call"
        params = @{
            name = $tool
            arguments = $args
        }
    } | ConvertTo-Json -Depth 10
    
    Invoke-RestMethod -Uri "http://localhost:3000/mcp" -Method POST -Body $body -ContentType "application/json"
}

# Beispiel: Game analysieren
Call-MCP -tool "analyze-game"

# Beispiel: HIGH Priority Issues
Call-MCP -tool "get-issues-by-priority" -args @{priority="HIGH"}

# Beispiel: Fix generieren
Call-MCP -tool "generate-fix" -args @{issueTitle="XP Gain Visual Feedback"}

# Beispiel: GitHub Issues erstellen
Call-MCP -tool "create-issue-files"
```

---

## 📋 Kompletter Workflow für ein Feature

### Beispiel: "XP Gain Visual Feedback" implementieren

#### Schritt 1: Fix-Code generieren
```powershell
$fix = Call-MCP -tool "generate-fix" -args @{issueTitle="XP Gain Visual Feedback"}
$fix.result.structuredContent.fixCode
```

#### Schritt 2: Code-Datei wird erstellt
```
src/utils/xp-gain-visual-feedback.ts
```

#### Schritt 3: In BattleScene integrieren

**Öffne:** `src/scenes/BattleScene.ts`

**Füge hinzu:**
```typescript
import { XPFeedbackSystem } from '../utils/xp-gain-visual-feedback';

export class BattleScene extends Phaser.Scene {
  private xpFeedback!: XPFeedbackSystem;
  
  create() {
    // ... existing code ...
    
    // Initialize XP Feedback System
    this.xpFeedback = new XPFeedbackSystem(this);
  }
  
  // In your kill handler:
  private handleUnitKill(unit: Unit) {
    const xpGained = unit.getData('xpValue') || 10;
    this.player.xp += xpGained;
    
    // Show XP feedback!
    this.xpFeedback.showXPGain(unit.x, unit.y, xpGained);
  }
}
```

#### Schritt 4: Speichern und testen!
- Browser lädt automatisch neu
- Töte einen Unit
- Siehst du "+10 XP" aufsteigen? ✅

#### Schritt 5: Issue abschließen
```powershell
# Markiere Issue als erledigt in GitHub
# Oder aktualisiere mcp-analysis-issues.json
```

---

## 🎯 Alle verfügbaren MCP Tools

### 1. **analyze-game**
Komplette Game-Analyse mit allen Metrics.

**Beispiel:**
```powershell
Call-MCP -tool "analyze-game"
```

**Output:**
```json
{
  "totalIssues": 14,
  "byPriority": { "HIGH": 5, "MEDIUM": 5, "LOW": 4 },
  "completionPercentage": 85
}
```

---

### 2. **get-issues-by-priority**
Filtere Issues nach Priorität.

**Beispiel:**
```powershell
Call-MCP -tool "get-issues-by-priority" -args @{priority="HIGH"}
```

**Prioritäten:** `HIGH`, `MEDIUM`, `LOW`

---

### 3. **get-issues-by-category**
Filtere Issues nach Kategorie.

**Beispiel:**
```powershell
Call-MCP -tool "get-issues-by-category" -args @{category="Audio"}
```

**Kategorien:** `Audio`, `Gameplay`, `UI/UX`, `Content`

---

### 4. **generate-fix**
Generiere TypeScript-Code für ein bestimmtes Issue.

**Beispiel:**
```powershell
Call-MCP -tool "generate-fix" -args @{issueTitle="Gold Gain Visual Feedback"}
```

**Output:** Vollständige TypeScript-Klasse mit Implementierung!

---

### 5. **create-issue-files**
Erstelle Markdown-Files für GitHub Issues.

**Beispiel:**
```powershell
Call-MCP -tool "create-issue-files"
```

**Resultat:** 14 Markdown-Files in `generated-issues/`

Du kannst diese direkt als GitHub Issues erstellen!

---

## 📁 Datei-Struktur nach Auto-Fix

```
AgeOfMax/
├── src/
│   ├── scenes/
│   │   └── BattleScene.ts         # Hier integrierst du die Systeme
│   └── utils/                      # 🆕 Auto-generierte Fix-Files
│       ├── xp-gain-visual-feedback.ts
│       ├── gold-gain-visual-feedback.ts
│       ├── unit-formation-system.ts
│       ├── kill-streak-gold-bonus.ts
│       ├── unit-selection-info.ts
│       ├── sound-effects-system.ts
│       └── background-music-system.ts
├── generated-issues/               # 🆕 GitHub Issue Markdown Files
│   ├── 01_Sound_Effects_System.md
│   ├── 02_Background_Music_System.md
│   ├── 03_XP_Gain_Visual_Feedback.md
│   └── ...
└── simple-mcp-server/
    └── src/
        └── game-analyzer.ts        # Die Engine dahinter
```

---

## 🔥 Pro-Tipps

### Tipp 1: Alle HIGH Priority Issues auf einmal fixen
```powershell
# Im Auto-Fixer Container
node scripts/auto-fix-runner.js

# Wähle Option 7: Auto-fix all HIGH priority issues
```

### Tipp 2: Live-Logs während Development
```powershell
# In einem zweiten Terminal
docker-compose logs -f game-dev mcp-server
```

### Tipp 3: MCP Server neu laden nach Änderungen
```powershell
docker-compose restart mcp-server
```

### Tipp 4: Eigene Fixes zum Game-Analyzer hinzufügen
Öffne: `simple-mcp-server/src/game-analyzer.ts`

Füge neue Generator-Methode hinzu:
```typescript
private generateMyCustomFix(): string {
  return `
    class MyCustomSystem {
      // Your implementation
    }
  `;
}
```

---

## 🐛 Troubleshooting

### Problem: MCP Server antwortet nicht
```powershell
# Health Check
curl http://localhost:3000/health

# Logs checken
docker-compose logs mcp-server

# Neu starten
docker-compose restart mcp-server
```

### Problem: Hot-Reload funktioniert nicht
```powershell
# Game Dev Server neu starten
docker-compose restart game-dev

# Logs checken
docker-compose logs game-dev
```

### Problem: Fix-Code ist nicht korrekt
```powershell
# Manuell bearbeiten in:
src/utils/[issue-name].ts

# Oder Game-Analyzer anpassen in:
simple-mcp-server/src/game-analyzer.ts
```

### Problem: TypeScript Fehler
```powershell
# Im Game Dev Container
docker exec -it age-of-max-dev sh
npm run type-check
```

---

## 📊 Monitoring & Status

### Service Status prüfen
```powershell
docker-compose ps
```

### Logs von allen Services
```powershell
docker-compose logs -f
```

### Nur bestimmte Services
```powershell
docker-compose logs -f game-dev
docker-compose logs -f mcp-server
docker-compose logs -f auto-fixer
```

### Resource Usage
```powershell
docker stats
```

---

## 🧹 Cleanup

### Services stoppen
```powershell
docker-compose --profile dev down
```

### Services + Volumes löschen
```powershell
docker-compose --profile dev down -v
```

### Komplett aufräumen
```powershell
docker-compose --profile dev down --rmi all
docker system prune -a
```

---

## 🎓 Lernressourcen

### Docker Compose Profiles verstehen
```yaml
profiles:
  - dev        # docker-compose --profile dev up
  - production # docker-compose --profile production up
```

### MCP Protocol verstehen
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- Dein MCP Server: `simple-mcp-server/src/`

### Phaser 3 Best Practices
- Systems in separate files (✅ macht der Auto-Fixer)
- Dependency Injection pattern
- Scene lifecycle verstehen

---

## 🚀 Next Steps

1. ✅ **Setup Docker Environment**
   ```powershell
   .\start-dev-docker.ps1
   ```

2. ✅ **Generiere alle Issue Files**
   ```powershell
   Call-MCP -tool "create-issue-files"
   ```

3. ✅ **Fixe HIGH Priority Issues**
   ```powershell
   docker exec -it age-of-max-fixer node scripts/auto-fix-runner.js
   # Wähle Option 7
   ```

4. ✅ **Integriere Fixes in BattleScene**
   - Öffne `src/scenes/BattleScene.ts`
   - Importiere die neuen Systeme
   - Initialisiere in `create()`
   - Nutze die Methoden wo nötig

5. ✅ **Teste im Browser**
   - `http://localhost:5173`
   - Spiele durchspielen
   - Feedback beobachten

6. ✅ **Iteration**
   - Anpassungen machen
   - Speichern → Hot-Reload
   - Repeat!

---

**Happy Coding! 🎮✨**

Fragen? Check:
- `DOCKER_DEV.md` - Detaillierte Docker Doku
- `simple-mcp-server/README.md` - MCP Server Details
- `mcp-analysis-issues.json` - Alle Issues im Detail
