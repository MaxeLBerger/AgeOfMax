import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { DifficultyScene } from './scenes/DifficultyScene';
import { CreditsScene } from './scenes/CreditsScene';
import { SettingsScene } from './scenes/SettingsScene';
// Register gameplay scenes up-front for reliability across dev/prod
import { UIScene } from './scenes/UIScene';
import { BattleScene } from './scenes/BattleScene';

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
  // Register all scenes up-front. This avoids lazy-loading chunk issues in
  // some hosting environments and simplifies scene transitions.
  scene: [BootScene, MenuScene, DifficultyScene, CreditsScene, SettingsScene, UIScene, BattleScene]
};

new Phaser.Game(config);