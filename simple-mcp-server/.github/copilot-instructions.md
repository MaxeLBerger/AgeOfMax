# Copilot Project Instructions – AoW Remake

- Stack: Vite + TypeScript + Phaser 3 (Arcade Physics), E2E: Playwright.
- Struktur: /src (Code), /assets (gfx/sfx), /data (balancing JSON), /e2e (Playwright).
- Szenen: BootScene (Preload), UIScene (HUD/Toolbar), BattleScene (Lane, 2 Basen, Units, Turrets).
- Ökonomie: Gold-Tick, XP durch Kills/Schaden, Epochenwechsel (Stone→Castle→Renaissance→Modern→Future).
- Specials: AoE „Raining Rocks", Linear „Artillery Strike".
- Qualität: ESLint/Prettier strikt, keine any, typsichere JSON-Daten.
- Tests: 3 Smokes (Start/Toolbar sichtbar; Unit-Spawn senkt Gegner-Base-HP <=10s; Epochenwechsel erreicht).
- Legal: Nur eigene/CC0-Assets; keinerlei 1:1-Übernahme des Originals (UI/Audio/Art).