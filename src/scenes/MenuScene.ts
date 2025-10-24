import Phaser from 'phaser';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add.text(centerX, 120, 'AGE OF MAX', {
      fontSize: '72px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, 190, 'A Strategy Game Tribute', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Start Button
    const startBtn = this.createButton(centerX, 300, 'START GAME', 0x4a90e2);
    startBtn.on('pointerdown', () => {
      this.scene.start('DifficultyScene');
    });

    // Credits Button
    const creditsBtn = this.createButton(centerX, 400, 'CREDITS', 0x7e57c2);
    creditsBtn.on('pointerdown', () => {
      this.scene.start('CreditsScene');
    });

    // Settings Button
    const settingsBtn = this.createButton(centerX, 500, 'SETTINGS', 0x26a69a);
    settingsBtn.on('pointerdown', () => {
      this.scene.start('SettingsScene');
    });

    // Version info
    this.add.text(centerX, height - 30, 'v1.0.0 | Made with Phaser 3', {
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, text: string, color: number): Phaser.GameObjects.Rectangle {
    const width = 320;
    const height = 60;

    const bg = this.add.rectangle(x, y, width, height, color)
      .setInteractive({ useHandCursor: true });
    
    const label = this.add.text(x, y, text, {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(color, 0.8);
      this.tweens.add({
        targets: [bg, label],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2'
      });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(color, 1);
      this.tweens.add({
        targets: [bg, label],
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2'
      });
    });

    return bg;
  }
}
