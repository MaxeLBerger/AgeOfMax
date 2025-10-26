
// Gold Visual Feedback System
export class GoldFeedbackSystem {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  showGoldGain(x: number, y: number, amount: number, isPassive: boolean = false) {
    const color = isPassive ? '#FFA500' : '#FFD700';
    const text = this.scene.add.text(x, y, `+${amount}💰`, {
      fontSize: '18px',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold'
    });
    
    // Floating animation
    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
    
    // Coin animation (only if coin texture exists)
    if (!isPassive && this.scene.textures.exists('coin')) {
      const coin = this.scene.add.sprite(x, y, 'coin');
      this.scene.tweens.add({
        targets: coin,
        y: y - 30,
        alpha: 0,
        scale: 1.5,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => coin.destroy()
      });
    }
  }
  
  animateCounterIncrement(counterText: Phaser.GameObjects.Text, newValue: number) {
    // Scale pulse effect
    this.scene.tweens.add({
      targets: counterText,
      scale: 1.2,
      duration: 150,
      yoyo: true,
      ease: 'Power2'
    });
  }
}

