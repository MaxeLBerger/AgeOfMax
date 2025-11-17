import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { DifficultyScene } from './scenes/DifficultyScene';
import { CreditsScene } from './scenes/CreditsScene';
import { SettingsScene } from './scenes/SettingsScene';
// Note: UIScene and BattleScene are now loaded dynamically on demand to
// reduce initial bundle size and speed up first paint.

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