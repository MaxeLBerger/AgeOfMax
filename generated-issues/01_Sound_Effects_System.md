# Sound Effects System

**Priority:** HIGH  
**Category:** Audio  
**Effort:** Medium  
**Impact:** Critical for game feel and feedback

## Description
Complete absence of sound effects for combat, units, and UI interactions

## Details
- Unit spawn sounds (different per epoch)
- Combat sounds (swords clashing, gunfire, explosions)
- Projectile sounds (arrows, bullets, rockets)
- Base damage sounds
- Gold collection sound
- XP gain sound
- Epoch advancement fanfare
- Special ability sounds
- Turret fire sounds
- Victory/Defeat sounds

## Status
pending

## Suggested Implementation

```typescript

// Sound Effects System
class SoundEffectsManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private volume: number = 0.5;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadSounds();
  }
  
  private loadSounds() {
    // Define sound effects (you'll need to add actual audio files)
    const soundList = [
      'unit_spawn', 'sword_clash', 'arrow_fire', 'gun_shot',
      'explosion', 'base_damage', 'gold_collect', 'xp_gain',
      'epoch_advance', 'ability_cast', 'turret_fire',
      'victory', 'defeat'
    ];
    
    // Load each sound
    soundList.forEach(key => {
      // this.scene.load.audio(key, `assets/sounds/${key}.mp3`);
    });
  }
  
  play(soundKey: string, volume?: number) {
    try {
      const sound = this.scene.sound.add(soundKey, {
        volume: volume !== undefined ? volume : this.volume
      });
      sound.play();
      this.sounds.set(soundKey, sound);
    } catch (error) {
      console.warn(`Sound not found: ${soundKey}`);
    }
  }
  
  playUnitSpawn(epoch: number) {
    this.play('unit_spawn', 0.3);
  }
  
  playCombat(weaponType: string) {
    const soundMap: Record<string, string> = {
      'melee': 'sword_clash',
      'ranged': 'arrow_fire',
      'gun': 'gun_shot',
      'explosive': 'explosion'
    };
    this.play(soundMap[weaponType] || 'sword_clash', 0.4);
  }
  
  playGoldCollect() {
    this.play('gold_collect', 0.5);
  }
  
  playXPGain() {
    this.play('xp_gain', 0.4);
  }
  
  playEpochAdvance() {
    this.play('epoch_advance', 0.8);
  }
  
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }
  
  stopAll() {
    this.sounds.forEach(sound => sound.stop());
    this.sounds.clear();
  }
}

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
