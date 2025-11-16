
// Background Music System
export class MusicManager {
  private scene: Phaser.Scene;
  private currentMusic?: Phaser.Sound.BaseSound;
  private volume: number = 0.3;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  playMenuMusic() {
    this.switchMusic('menu_music');
  }
  
  playBattleMusic(epoch: number) {
    const musicTracks: Record<number, string> = {
      1: 'battle_ancient',
      2: 'battle_medieval',
      3: 'battle_renaissance',
      4: 'battle_modern',
      5: 'battle_future'
    };
    const track = musicTracks[epoch] || 'battle_ancient';
    this.switchMusic(track);
  }
  
  playVictoryMusic() {
    this.switchMusic('victory_music');
  }
  
  playDefeatMusic() {
    this.switchMusic('defeat_music');
  }
  
  private switchMusic(key: string) {
    // Stop current music
    if (this.currentMusic) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          this.currentMusic?.stop();
          this.startMusic(key);
        }
      });
    } else {
      this.startMusic(key);
    }
  }
  
  private startMusic(key: string) {
    try {
      this.currentMusic = this.scene.sound.add(key, {
        loop: true,
        volume: 0
      });
      this.currentMusic.play();
      
      // Fade in
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: this.volume,
        duration: 2000
      });
    } catch (error) {
      console.warn(`Music not found: ${key}`);
    }
  }
  
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      // Use property assignment to avoid BaseSound typing issues
      (this.currentMusic as any).volume = this.volume;
    }
  }
  
  stop() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = undefined;
    }
  }
}

