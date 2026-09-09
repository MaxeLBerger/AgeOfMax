import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';

export class SoundEffectsManager {
  private engine = SoundEngine.get();
  private bus?: GainNode;
  private volume = 0.7;
  private lastPlayed = new Map<string, number>();
  private settingsListener: (settings: { sfxVolume?: number }) => void;

  constructor(private scene: Phaser.Scene) {
    this.volume = scene.registry.get('settings')?.sfxVolume ?? 0.7;
    this.bus = this.engine.bus(this.volume);
    this.settingsListener = settings => this.setVolume(settings.sfxVolume ?? this.volume);
    scene.game.events.on('settingsChanged', this.settingsListener);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopAll());
  }

  play(key: string, intensity = 0.5): void {
    if (!this.bus || this.volume <= 0) return;
    const now = this.engine.getContext()?.currentTime || 0;
    const limit = key === 'gold_collect' || key === 'xp_gain' ? 0.3 : 0.065;
    if (now - (this.lastPlayed.get(key) ?? -10) < limit) return;
    this.lastPlayed.set(key, now);
    const bus = this.bus, v = intensity * 0.3;
    const tone = (f: number, d: number, a = 1, type: OscillatorType = 'sine', delay = 0, end?: number) => this.engine.tone(bus, f, d, v * a, type, delay, end);
    const noise = (d: number, a: number, f: number) => this.engine.hiss(bus, d, v * a, f);
    switch (key) {
      case 'unit_spawn': tone(220, 0.14, 0.6, 'triangle'); tone(330, 0.23, 0.35, 'sine', 0.055); break;
      case 'sword_clash': noise(0.09, 0.9, 4200); tone(720, 0.13, 0.24, 'triangle', 0, 510); tone(1370, 0.065, 0.12); break;
      case 'arrow_fire': noise(0.12, 0.28, 1900); tone(380, 0.07, 0.2, 'triangle', 0, 140); break;
      case 'gun_shot': noise(0.13, 0.95, 3200); tone(95, 0.15, 0.55, 'sine', 0, 38); break;
      case 'heavy_shot': noise(0.3, 1.15, 1500); tone(78, 0.38, 0.9, 'sine', 0, 28); tone(52, 0.3, 0.25, 'triangle', 0.04); break;
      case 'laser_fire': tone(1300, 0.14, 0.4, 'sine', 0, 260); tone(2100, 0.07, 0.08, 'triangle', 0, 700); break;
      case 'plasma_fire': tone(280, 0.28, 0.5, 'triangle', 0, 65); tone(780, 0.18, 0.18, 'sine', 0, 190); noise(0.22, 0.28, 1200); break;
      case 'wood_impact': noise(0.075, 0.6, 1100); tone(150, 0.11, 0.5, 'triangle', 0, 60); break;
      case 'explosion': noise(0.65, 1.5, 900); tone(65, 0.7, 1.1, 'sine', 0, 24); break;
      case 'base_damage': noise(0.17, 0.5, 1100); tone(74, 0.25, 0.8, 'triangle', 0, 42); break;
      case 'gold_collect': tone(880, 0.13, 0.2); tone(1320, 0.18, 0.13, 'sine', 0.05); break;
      case 'xp_gain': tone(660, 0.09, 0.13); break;
      case 'epoch_advance': [196, 246.94, 293.66, 392, 493.88, 587.33].forEach((f, i) => tone(f, 1.2, 0.38, 'triangle', i * 0.1)); break;
      case 'ability_cast': noise(0.45, 0.5, 1200); tone(110, 0.75, 0.7, 'triangle', 0, 440); break;
      case 'turret_fire': noise(0.1, 0.5, 1800); tone(150, 0.12, 0.3, 'triangle', 0, 65); break;
      case 'victory': [261.63, 329.63, 392, 523.25].forEach((f, i) => tone(f, 1.5, 0.5, 'triangle', i * 0.18)); break;
      case 'defeat': [220, 174.61, 146.83].forEach((f, i) => tone(f, 1.8, 0.4, 'triangle', i * 0.22)); break;
      default: tone(440, 0.08, 0.2);
    }
  }
  playUnitSpawn(_epoch: number): void { this.play('unit_spawn', 0.35); }
  playCombat(weapon: string): void { this.play(({ melee: 'sword_clash', wood: 'wood_impact', ranged: 'arrow_fire', gun: 'gun_shot', heavy: 'heavy_shot', laser: 'laser_fire', plasma: 'plasma_fire', explosive: 'explosion' } as Record<string, string>)[weapon] || 'sword_clash', 0.4); }
  playGoldCollect(): void { this.play('gold_collect', 0.35); }
  playXPGain(): void { this.play('xp_gain', 0.25); }
  playEpochAdvance(): void { this.play('epoch_advance', 0.7); }
  setVolume(value: number): void { this.volume = Phaser.Math.Clamp(value, 0, 1); if (this.bus) this.bus.gain.value = this.volume; }
  stopAll(): void {
    this.scene.game.events.off('settingsChanged', this.settingsListener);
    this.bus?.disconnect(); this.bus = undefined; this.lastPlayed.clear();
  }
}
