import Phaser from 'phaser';

export class GoldFeedbackSystem {
  constructor(private scene: Phaser.Scene) {}
  showGoldGain(x: number, y: number, amount: number, isPassive = false): void {
    if (isPassive) return;
    const text = this.scene.add.text(x, y - 58, `+${Math.round(amount)} Gold`, {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#e3c589', stroke: '#192227', strokeThickness: 2
    }).setOrigin(0.5).setDepth(1600);
    this.scene.tweens.add({ targets: text, y: y - (this.scene.registry.get('settings')?.reducedMotion ? 58 : 78), alpha: 0,
      duration: 1150, onComplete: () => text.destroy() });
  }
}
