import Phaser from 'phaser';
import type { DifficultyLevel } from './MenuScene';

export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DifficultyScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add.text(centerX, 100, 'SELECT DIFFICULTY', {
      fontSize: '48px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Easy Button
    const easyBtn = this.createDifficultyButton(centerX, 220, 'EASY', 0x4caf50, [
      'Slower enemy spawns',
      'Lower enemy stats',
      'More starting gold'
    ]);
    easyBtn.on('pointerdown', () => this.startGame('easy'));

    // Medium Button
    const mediumBtn = this.createDifficultyButton(centerX, 360, 'MEDIUM', 0xff9800, [
      'Balanced gameplay',
      'Standard enemy stats',
      'Normal gold generation'
    ]);
    mediumBtn.on('pointerdown', () => this.startGame('medium'));

    // Hard Button
    const hardBtn = this.createDifficultyButton(centerX, 500, 'HARD', 0xf44336, [
      'Faster enemy spawns',
      'Higher enemy stats',
      'Less starting gold'
    ]);
    hardBtn.on('pointerdown', () => this.startGame('hard'));

    // Back button
    const backBtn = this.add.text(50, height - 50, ' BACK', {
      fontSize: '24px',
      color: '#888888'
    }).setInteractive({ useHandCursor: true });
    
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private createDifficultyButton(x: number, y: number, text: string, color: number, features: string[]): Phaser.GameObjects.Rectangle {
    const width = 500;
    const height = 120;

    const bg = this.add.rectangle(x, y, width, height, color)
      .setInteractive({ useHandCursor: true });
    
    const label = this.add.text(x, y - 30, text, {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const desc = this.add.text(x, y + 10, features.join('  '), {
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: width - 40 }
    }).setOrigin(0.5);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(color, 0.8);
      this.tweens.add({
        targets: [bg, label, desc],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2'
      });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(color, 1);
      this.tweens.add({
        targets: [bg, label, desc],
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2'
      });
    });

    return bg;
  }

  private async startGame(difficulty: DifficultyLevel): Promise<void> {
    console.log(`Starting game with difficulty: ${difficulty}`);

    // Show a lightweight loading indicator while dynamic chunks load
    const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 80, 'Lade Spielszenen...', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Pass difficulty to game registry immediately
    this.registry.set('difficulty', difficulty);

    // Dynamically import heavy scenes if not already added
    await this.ensureGameplayScenesLoaded();

    // Start the game scenes
    this.scene.start('BattleScene');
    this.scene.launch('UIScene');
    loadingText.destroy();
    this.scene.stop();
  }

  private async ensureGameplayScenesLoaded(): Promise<void> {
    // BattleScene
    let battleExists = true;
    try { this.scene.get('BattleScene'); } catch { battleExists = false; }
    if (!battleExists) {
      const { BattleScene } = await import('./BattleScene');
      this.scene.add('BattleScene', BattleScene, false);
    }
    // UIScene
    let uiExists = true;
    try { this.scene.get('UIScene'); } catch { uiExists = false; }
    if (!uiExists) {
      const { UIScene } = await import('./UIScene');
      this.scene.add('UIScene', UIScene, false);
    }
  }
}
