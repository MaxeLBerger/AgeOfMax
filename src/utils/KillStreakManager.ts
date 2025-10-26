
// Kill Streak System
class KillStreakManager {
  private scene: Phaser.Scene;
  private currentStreak: number = 0;
  private lastKillTime: number = 0;
  private readonly STREAK_TIMEOUT = 5000; // 5 seconds
  private streakText?: Phaser.GameObjects.Text;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  registerKill(gold: number): number {
    const now = Date.now();
    
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
    const streakMsg = `🔥 ${this.currentStreak}x STREAK! +${Math.floor((multiplier - 1) * 100)}% Gold`;
    
    this.streakText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      100,
      streakMsg,
      {
        fontSize: '24px',
        color: '#FF6600',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.streakText,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      repeat: 2
    });
    
    // Auto-hide after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (this.streakText) {
        this.streakText.destroy();
      }
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

