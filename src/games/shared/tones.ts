/** Tiny Web Audio sound effects for the mini-games. Synthesized, no audio files. */
export type Tone = 'tap' | 'flip' | 'good' | 'great' | 'oops' | 'win' | 'star' | 'bump' | 'boost';

const NOTES: Record<Tone, [number, number, number?][]> = {
  tap: [[660, 0.05]],
  flip: [[520, 0.06], [700, 0.06, 0.04]],
  good: [[784, 0.08], [1047, 0.12, 0.07]],
  great: [[523, 0.1], [659, 0.1, 0.08], [784, 0.1, 0.16], [1047, 0.18, 0.24]],
  oops: [[330, 0.12], [294, 0.16, 0.1]],
  win: [523, 659, 784, 1047, 784, 1047, 1319].map((f, i) => [f, 0.18, i * 0.12] as [number, number, number]),
  star: [[988, 0.06], [1319, 0.09, 0.05]],
  bump: [[200, 0.08]],
  boost: [[400, 0.06], [600, 0.06, 0.05], [900, 0.1, 0.1]],
};

export interface ToneVolume {
  master: number;
  sfx: number;
  muted: boolean;
}

export class Tones {
  private ctx?: AudioContext;
  private out?: GainNode;

  constructor(volume: ToneVolume) {
    const AC = typeof window !== 'undefined' ? window.AudioContext : undefined;
    if (!AC || volume.muted || volume.master * volume.sfx <= 0) return;
    try {
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = volume.master * volume.sfx * 0.3;
      this.out.connect(this.ctx.destination);
    } catch {
      this.ctx = undefined;
    }
  }

  play(t: Tone) {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const [f, d, delay = 0] of NOTES[t]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = t === 'bump' ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const s = now + delay;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(1, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + d);
      osc.connect(g).connect(this.out);
      osc.start(s);
      osc.stop(s + d + 0.02);
    }
  }

  close() {
    void this.ctx?.close();
    this.ctx = undefined;
  }
}
