/**
 * Sound effects and a gentle music loop, synthesized with the Web Audio API.
 * No audio files: everything is original and generated in code.
 */
export type SfxName = 'jump' | 'star' | 'crystal' | 'hurt' | 'power' | 'spring' | 'cheer' | 'checkpoint' | 'win' | 'break' | 'special' | 'bump';

interface Note {
  f: number;
  d: number;
  t?: number;
  type?: OscillatorType;
}

const SFX: Record<SfxName, Note[]> = {
  jump: [{ f: 420, d: 0.08 }, { f: 620, d: 0.08, t: 0.05 }],
  star: [{ f: 988, d: 0.07 }, { f: 1319, d: 0.1, t: 0.06 }],
  crystal: [523, 659, 784, 1047, 1319].map((f, i) => ({ f, d: 0.14, t: i * 0.08 })),
  hurt: [{ f: 330, d: 0.12, type: 'triangle' }, { f: 262, d: 0.16, t: 0.1, type: 'triangle' }],
  power: [392, 523, 659, 784].map((f, i) => ({ f, d: 0.1, t: i * 0.06 })),
  spring: [{ f: 300, d: 0.06 }, { f: 600, d: 0.08, t: 0.05 }, { f: 900, d: 0.12, t: 0.1 }],
  cheer: [{ f: 784, d: 0.08 }, { f: 1047, d: 0.12, t: 0.07 }],
  checkpoint: [{ f: 659, d: 0.1 }, { f: 880, d: 0.18, t: 0.1 }],
  win: [523, 659, 784, 1047, 784, 1047, 1319].map((f, i) => ({ f, d: 0.18, t: i * 0.12 })),
  break: [{ f: 180, d: 0.08, type: 'square' }, { f: 120, d: 0.1, t: 0.05, type: 'square' }],
  special: [{ f: 523, d: 0.06 }, { f: 784, d: 0.06, t: 0.04 }, { f: 1047, d: 0.1, t: 0.08 }],
  bump: [{ f: 220, d: 0.06, type: 'triangle' }],
};

// A cheerful pentatonic tune, one bar per world.
const MELODIES: number[][] = [
  [523, 587, 659, 784, 659, 587, 523, 440, 523, 659, 784, 880, 784, 659, 587, 523],
  [392, 440, 523, 587, 523, 440, 392, 330, 392, 523, 587, 659, 587, 523, 440, 392],
  [330, 392, 440, 523, 587, 523, 440, 392, 440, 523, 659, 587, 523, 440, 392, 330],
];

export interface Volume {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

export class Sound {
  private ctx?: AudioContext;
  private sfxGain?: GainNode;
  private musicGain?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private nextTime = 0;
  private step = 0;
  private melody: number[];

  constructor(volume: Volume, world: number) {
    this.melody = MELODIES[(world - 1) % MELODIES.length];
    const AC = typeof window !== 'undefined' ? window.AudioContext : undefined;
    if (!AC || volume.muted) return;
    try {
      this.ctx = new AC();
      const master = this.ctx.createGain();
      master.gain.value = volume.master;
      master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = volume.sfx * 0.35;
      this.sfxGain.connect(master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = volume.music * 0.12;
      this.musicGain.connect(master);
    } catch {
      this.ctx = undefined;
    }
  }

  private tone(out: GainNode, n: Note, at: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.value = n.f;
    const start = at + (n.t ?? 0);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(1, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + n.d);
    osc.connect(g).connect(out);
    osc.start(start);
    osc.stop(start + n.d + 0.02);
  }

  play(name: SfxName) {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    for (const n of SFX[name]) this.tone(this.sfxGain, n, now);
  }

  startMusic() {
    if (!this.ctx || !this.musicGain || this.timer) return;
    void this.ctx.resume();
    this.nextTime = this.ctx.currentTime + 0.1;
    const beat = 0.28;
    // Schedule a little ahead so the music stays smooth.
    this.timer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      while (this.nextTime < this.ctx.currentTime + 0.6) {
        const f = this.melody[this.step % this.melody.length];
        this.tone(this.musicGain!, { f, d: beat * 0.9, type: 'triangle' }, this.nextTime);
        if (this.step % 4 === 0) this.tone(this.musicGain!, { f: f / 2, d: beat * 1.8, type: 'sine' }, this.nextTime);
        this.nextTime += beat;
        this.step++;
      }
    }, 150);
  }

  suspend() {
    void this.ctx?.suspend();
  }

  resume() {
    if (!this.ctx) return;
    void this.ctx.resume().then(() => {
      if (this.ctx) this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
    });
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    void this.ctx?.close();
    this.ctx = undefined;
  }
}
