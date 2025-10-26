# XP Gain Visual Feedback

**Priority:** HIGH  
**Category:** Gameplay  
**Effort:** Small  
**Impact:** Player has no feedback on progression

## Description
No visual indication when XP is earned

## Details
- Floating +XP text above killed units
- XP bar fill animation
- Particle effect on XP gain
- XP milestone notifications

## Status
pending

## Suggested Implementation

```typescript

// XP Visual Feedback System
class XPFeedbackSystem {
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
    
    // Particle effect
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

// Usage in BattleScene when unit dies:
// this.xpFeedback.showXPGain(unit.x, unit.y, xpAmount);

```

## Files to Modify
- src/scenes/BattleScene.ts
- src/game/types.ts
- src/utils/ (new utility files)

## Testing Checklist
- [ ] Feature works as expected
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] UI/UX is polished
- [ ] Code is documented
