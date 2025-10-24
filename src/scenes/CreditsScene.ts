import Phaser from 'phaser';

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CreditsScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add.text(centerX, 80, 'CREDITS', {
      fontSize: '48px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Game info
    this.add.text(centerX, 170, 'AGE OF MAX', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(centerX, 210, 'A tribute to the classic Age of War series', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Developer
    this.add.text(centerX, 280, 'DEVELOPED BY', {
      fontSize: '20px',
      color: '#888888'
    }).setOrigin(0.5);

    const githubText = this.add.text(centerX, 320, 'Maximilian Haak', {
      fontSize: '28px',
      color: '#4a90e2',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    githubText.on('pointerover', () => githubText.setColor('#6ab0f2'));
    githubText.on('pointerout', () => githubText.setColor('#4a90e2'));
    githubText.on('pointerdown', () => {
      window.open('https://github.com/MaximilianHaak', '_blank');
    });

    this.add.text(centerX, 355, 'github.com/MaximilianHaak', {
      fontSize: '16px',
      color: '#666666'
    }).setOrigin(0.5);

    // Technology
    this.add.text(centerX, 420, 'BUILT WITH', {
      fontSize: '20px',
      color: '#888888'
    }).setOrigin(0.5);

    this.add.text(centerX, 460, 'Phaser 3  TypeScript  Vite', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Support
    const supportBtn = this.createButton(centerX, 540, 'SUPPORT THE PROJECT', 0x26a69a);
    supportBtn.on('pointerdown', () => {
      // You can replace this with your actual donation link
      window.open('https://github.com/sponsors/MaximilianHaak', '_blank');
    });

    // Back button
    const backBtn = this.add.text(50, height - 50, ' BACK', {
      fontSize: '24px',
      color: '#888888'
    }).setInteractive({ useHandCursor: true });
    
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private createButton(x: number, y: number, text: string, color: number): Phaser.GameObjects.Container {
    const width = 320;
    const height = 50;

    const bg = this.add.rectangle(0, 0, width, height, color)
      .setInteractive({ useHandCursor: true });
    
    const label = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [bg, label]);

    bg.on('pointerover', () => {
      bg.setFillStyle(color, 0.8);
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2'
      });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(color, 1);
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2'
      });
    });

    return container;
  }
}
