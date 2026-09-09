
// Kill Streak System
export class KillStreakManager {
  private scene: Phaser.Scene;
  private currentStreak: number = 0;
  private lastKillTime: number = 0;
  private readonly STREAK_TIMEOUT = 5000; // 5 seconds
  private streakText?: Phaser.GameObjects.Text;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  registerKill(gold: number, now: number = this.scene.time.now): number {
    
    // Reset streak if timeout expired
    if (now - this.lastKillTime > this.STREAK_TIMEOUT) {
      this.currentStreak = 0;
    }
    
    this.currentStreak++;
    this.lastKillTime = now;
    
    // Calculate bonus multiplier
    const multiplier = this.getMultiplier();
    const bonusGold = Math.floor(gold * (multiplier - 1));
    
    // Show streak feedback
    if (this.currentStreak > 1) {
      this.showStreakFeedback();
    }
    
    return bonusGold;
  }
  
  private getMultiplier(): number {
    if (this.currentStreak >= 10) return 2.0;
    if (this.currentStreak >= 5) return 1.5;
    if (this.currentStreak >= 3) return 1.2;
    return 1.0;
  }
  
  private showStreakFeedback() {
    // Remove old streak text
    if (this.streakText) {
      this.streakText.destroy();
    }
    
    const multiplier = this.getMultiplier();
    const streakMsg = `${this.currentStreak}er-Serie  ·  +${Math.floor((multiplier - 1) * 100)} % Gold`;
    
    this.streakText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      205,
      streakMsg,
      {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '15px',
        color: '#e2c183',
        stroke: '#15242c',
        strokeThickness: 2,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.streakText,
      scale: this.scene.registry.get('settings')?.reducedMotion ? 1 : 1.08,
      duration: 200,
      yoyo: true,
      repeat: 2
    });
    
    // Auto-hide after 3 seconds
    const text = this.streakText;
    this.scene.time.delayedCall(3000, () => {
      if (text.active) text.destroy();
      if (this.streakText === text) this.streakText = undefined;
    });
  }
  
  reset() {
    this.currentStreak = 0;
    this.lastKillTime = 0;
    if (this.streakText) {
      this.streakText.destroy();
    }
  }
}
