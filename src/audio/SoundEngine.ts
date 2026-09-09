/** Original procedural score and effects. No network, asset or autoplay dependency. */
export class SoundEngine {
  private static shared?: SoundEngine;
  static get(): SoundEngine { return this.shared ??= new SoundEngine(); }
  private context?: AudioContext;
  private noise?: AudioBuffer;
  private limiter?: DynamicsCompressorNode;
  private constructor() {
    const unlock = () => {
      const context = this.getContext();
      void context?.resume().then(() => {
        if (context.state === 'running') { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); }
      });
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  getContext(): AudioContext | undefined {
    if (this.context) return this.context;
    if (!window.AudioContext) return undefined;
    try {
      this.context = new AudioContext();
      this.limiter = this.context.createDynamicsCompressor();
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 12;
      this.limiter.ratio.value = 4;
      this.limiter.attack.value = 0.004;
      this.limiter.release.value = 0.18;
      this.limiter.connect(this.context.destination);
      this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      let seed = 71323;
      for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741823.5 - 1; }
    } catch { return undefined; }
    return this.context;
  }

  bus(volume: number): GainNode | undefined {
    const context = this.getContext(); if (!context) return;
    const gain = context.createGain(); gain.gain.value = volume; gain.connect(this.limiter ?? context.destination); return gain;
  }

  tone(bus: AudioNode, frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0, endFrequency?: number): void {
    const context = this.getContext(); if (!context) return;
    const time = context.currentTime + delay;
    const source = context.createOscillator(); source.type = type; source.frequency.setValueAtTime(frequency, time);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), time + duration);
    const envelope = context.createGain(); envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + Math.min(0.018, duration / 6));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(envelope); envelope.connect(bus); source.start(time); source.stop(time + duration + 0.03);
    source.onended = () => { source.disconnect(); envelope.disconnect(); };
  }

  hiss(bus: AudioNode, duration: number, volume: number, frequency: number, delay = 0): void {
    const context = this.getContext(); if (!context || !this.noise) return;
    const source = context.createBufferSource(); source.buffer = this.noise;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = frequency;
    const envelope = context.createGain(); const time = context.currentTime + delay;
    envelope.gain.setValueAtTime(volume, time); envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(bus); source.start(time); source.stop(time + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }
}
