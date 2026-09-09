import Phaser from 'phaser';

export class XPFeedbackSystem {
  private lastShown = -Infinity;
  constructor(private scene: Phaser.Scene) {}
  showXPGain(x: number, y: number, amount: number): void {
    // The HUD reports every point; only meaningful awards float over the battle.
    if (amount < 25 || this.scene.time.now - this.lastShown < 180) return;
    this.lastShown = this.scene.time.now;
    const text = this.scene.add.text(x, y - 78, `+${Math.round(amount)} EP`, {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '11px', color: '#a5c9c1', stroke: '#14252b', strokeThickness: 2
    }).setOrigin(0.5).setDepth(1600);
    this.scene.tweens.add({ targets: text, y: y - (this.scene.registry.get('settings')?.reducedMotion ? 78 : 96), alpha: 0,
      duration: 1100, onComplete: () => text.destroy() });
  }
}
