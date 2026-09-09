import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';

/** A quiet original modal score, with epoch-dependent percussion and timbre. */
export class MusicManager {
  private engine = SoundEngine.get();
  private bus?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private step = 0;
  private epoch = 0;
  private volume = 0.35;
  private listener: (settings: { musicVolume?: number }) => void;

  constructor(scene: Phaser.Scene) {
    this.volume = scene.registry.get('settings')?.musicVolume ?? 0.35;
    this.listener = settings => this.setVolume(settings.musicVolume ?? this.volume);
    scene.game.events.on('settingsChanged', this.listener);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.stop(); scene.game.events.off('settingsChanged', this.listener); });
  }
  playMenuMusic(): void { this.start(0); }
  playBattleMusic(epoch: number): void { this.start(epoch); }
  playVictoryMusic(): void { this.start(6); }
  playDefeatMusic(): void { this.start(0); }
  private start(epoch: number): void {
    this.stop(); this.epoch = epoch; this.step = 0; this.bus = this.engine.bus(this.volume);
    this.timer = setInterval(() => this.tick(), 440);
  }
  private tick(): void {
    const context = this.engine.getContext(); if (!context || context.state !== 'running' || !this.bus) return;
    const bus = this.bus, step = this.step++ % 64;
    const roots = [98, 87.307, 130.813, 110];
    const root = roots[Math.floor(step / 16)], melody = [0, 7, 12, 14, 7, 3, 10, 7, 0, 3, 7, 14, 12, 7, 3, 0];
    if (step % 8 === 0) {
      this.engine.tone(bus, root, 4.2, 0.13, 'sine');
      this.engine.tone(bus, root * 1.4983, 3.9, 0.045, 'triangle', 0.04);
      this.engine.tone(bus, root * 2.3784, 3.2, 0.025, 'sine', 0.15);
    }
    if (step % 2 === 0) {
      const note = root * 2 * 2 ** (melody[(step / 2) % 16] / 12);
      this.engine.tone(bus, note, 1.3, 0.08, this.epoch >= 4 ? 'sine' : 'triangle');
      this.engine.tone(bus, note, 1.7, 0.024, 'sine', 0.22);
    }
    if (this.epoch > 0 && step % 4 === 0) {
      this.engine.tone(bus, 82, 0.38, 0.18, 'sine', 0, 38);
      this.engine.hiss(bus, 0.11, 0.055, 850);
    }
    if (this.epoch >= 2 && step % 4 === 2) this.engine.hiss(bus, 0.13, 0.045, 2400);
    if (this.epoch >= 4 && step % 2 === 1) this.engine.hiss(bus, 0.045, 0.025, 5000);
  }
  setVolume(value: number): void { this.volume = Phaser.Math.Clamp(value, 0, 1); if (this.bus) this.bus.gain.value = this.volume; }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; this.bus?.disconnect(); this.bus = undefined; }
}
