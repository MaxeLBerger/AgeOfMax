import type { Page } from '@playwright/test';

/** Observe actual output buses without changing the audio routed to the speakers. */
export async function installAudioProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const buses: Array<{ bus: GainNode; analyser: AnalyserNode; connected: boolean }> = [];
    const originalConnect = AudioNode.prototype.connect as (...args: any[]) => any;
    const originalDisconnect = AudioNode.prototype.disconnect as (...args: any[]) => void;
    (AudioNode.prototype as any).connect = function(this: AudioNode, destination: AudioNode | AudioParam, ...args: number[]) {
      if (this instanceof GainNode && (destination === this.context.destination || destination instanceof DynamicsCompressorNode)) {
        let record = buses.find(candidate => candidate.bus === this);
        if (!record) {
          const analyser = this.context.createAnalyser();
          analyser.fftSize = 2048;
          originalConnect.call(this, analyser);
          record = { bus: this, analyser, connected: true };
          buses.push(record);
        }
        record.connected = true;
      }
      return originalConnect.call(this, destination, ...args);
    };
    (AudioNode.prototype as any).disconnect = function(this: AudioNode, ...args: any[]) {
      if (args.length === 0) {
        const record = buses.find(candidate => candidate.bus === this);
        if (record) record.connected = false;
      }
      return originalDisconnect.apply(this, args);
    };
    Object.assign(window, { __audioProbe: buses });
  });
}

export async function audioSnapshot(page: Page, volume: number) {
  return page.evaluate(volume => {
    const buses = (window as any).__audioProbe as Array<{ bus: GainNode; analyser: AnalyserNode; connected: boolean }>;
    return buses.filter(record => record.connected && Math.abs(record.bus.gain.value - volume) < 0.005).map(record => {
      const samples = new Float32Array(record.analyser.fftSize);
      record.analyser.getFloatTimeDomainData(samples);
      let energy = 0;
      for (const sample of samples) energy += sample * sample;
      return { state: record.bus.context.state, gain: record.bus.gain.value, rms: Math.sqrt(energy / samples.length) };
    });
  }, volume);
}
