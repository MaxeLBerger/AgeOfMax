
// XP Visual Feedback System
export class XPFeedbackSystem {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  showXPGain(x: number, y: number, amount: number) {
    const text = this.scene.add.text(x, y, `+${amount} XP`, {
      fontSize: '20px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold'
    });
    
    // Floating animation
    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
    
    // Particle effect (only if sparkle texture exists)
    if (this.scene.textures.exists('sparkle')) {
      const particles = this.scene.add.particles(x, y, 'sparkle', {
        speed: { min: 50, max: 100 },
        scale: { start: 0.5, end: 0 },
        lifespan: 1000,
        quantity: 5,
        tint: 0xFFD700
      });
      
      this.scene.time.delayedCall(1000, () => particles.destroy());
    }
  }
}

// Usage in BattleScene when unit dies:
// this.xpFeedback.showXPGain(unit.x, unit.y, xpAmount);

