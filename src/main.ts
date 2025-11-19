import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { DifficultyScene } from './scenes/DifficultyScene';
import { CreditsScene } from './scenes/CreditsScene';
import { SettingsScene } from './scenes/SettingsScene';
// Note: UIScene and BattleScene are now loaded dynamically on demand to
// reduce initial bundle size and speed up first paint.

// Global runtime error surface (helps diagnose production blank screen issues)
if (typeof window !== 'undefined') {
  const installGlobalErrorOverlay = () => {
    let overlay: HTMLDivElement | null = null;
    const ensure = () => {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.zIndex = '999999';
        overlay.style.fontFamily = 'monospace';
        overlay.style.maxHeight = '50vh';
        overlay.style.overflow = 'auto';
        overlay.style.background = 'rgba(0,0,0,0.85)';
        overlay.style.color = '#ff5555';
        overlay.style.padding = '12px 16px';
        overlay.style.boxSizing = 'border-box';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
      }
      return overlay;
    };

    const append = (msg: string) => {
      const el = ensure();
      const line = document.createElement('div');
      line.textContent = msg;
      el.appendChild(line);
    };

    window.addEventListener('error', (e) => {
      append(`[Error] ${e.message} @ ${e.filename}:${e.lineno}`);
    });
    window.addEventListener('unhandledrejection', (e) => {
      append(`[Promise] ${String(e.reason)}`);
    });
  };
  installGlobalErrorOverlay();
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-canvas',
  backgroundColor: '#2d2d2d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  // Only early/lightweight scenes are registered up-front. Heavy gameplay
  // scenes (BattleScene + UIScene) are code-split and added at runtime
  // after the player selects a difficulty.
  scene: [BootScene, MenuScene, DifficultyScene, CreditsScene, SettingsScene]
};

new Phaser.Game(config);