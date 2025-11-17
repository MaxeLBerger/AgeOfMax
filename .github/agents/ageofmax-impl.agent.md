---
name: ageofmax-implementation
description: >
  Spezialist für das AgeOfMax-Spiel (Phaser 3 / TypeScript / Vite). 
  Implementiert Features, behebt Bugs, integriert Assets und hält Jest- und Playwright-Tests grün.
target: github-copilot
# Hinweis: VS Code respektiert target=vscode/github-copilot; Coding Agent ignoriert VS-Code-spezifische Felder einfach. 
tools:
  - read        # Code & Docs lesen
  - search      # Dateien/Strings finden
  - edit        # Codeänderungen durchführen
  - shell       # npm-Skripte, Tests, Builds
  - github/*    # GitHub-MCP-Tools (Issues, PRs, Repo-Metadaten)
  - playwright/*  # Playwright-MCP-Tools für e2e-Unterstützung
argument-hint: "Beschreibe Bug, Feature oder GitHub-Issue-Nummer in AgeOfMax."
---
