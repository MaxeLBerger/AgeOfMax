---
name: init-aow
description: Initialisiert den AoW-Workspace, prüft MCP, setzt Dev-Skripte und Smokes.
---

Ziele:
- Verifiziere, dass die Task „mcp:serve" läuft und http://localhost:3000/health OK meldet.
- Richte im Workspace (Root, nicht im simple-mcp-server) Vite+TS ein und installiere: phaser, @playwright/test, eslint, prettier, @typescript-eslint/{parser,eslint-plugin}.
- Ergänze package.json-Skripte: "dev","build","preview","test","lint".
- Erzeuge (falls fehlend):
  - src/main.ts
  - src/scenes/BootScene.ts
  - src/scenes/UIScene.ts
  - src/scenes/BattleScene.ts
  - src/game/types.ts
  - data/epochs.json, data/units.json, data/turrets.json (Platzhalterwerte)
  - e2e/aow.spec.ts (3 Smokes wie in den Instructions)
- Starte „pnpm dev" (neues Terminal) und führe einmal „pnpm test" headless aus.
- Gib am Ende eine kompakte Statusübersicht (Dateien, Ports, Test-Resultate).

Hinweise:
- Nutze niemals das MCP-Server-Terminal für andere Kommandos.
- Falls Ports belegt, wähle automatisch Alternativen (5173→5174 etc.).