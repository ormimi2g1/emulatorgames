import type { Difficulty } from '../../data/types';

export const W = 800;
export const H = 450;
export const ROCKET_X = 140;

export interface Planet {
  name: string;
  color: string;
  ring?: boolean;
  fact: string;
}

export const PLANETS: Planet[] = [
  { name: 'Mars', color: '#e0603f', fact: 'Mars is called the Red Planet because its dust is rusty red.' },
  { name: 'Jupiter', color: '#d9a066', fact: 'Jupiter is the biggest planet. More than a thousand Earths could fit inside!' },
  { name: 'Saturn', color: '#e8c872', ring: true, fact: 'Saturn has beautiful rings made of ice and rock.' },
];

export const TUNING: Record<Difficulty, { speed: number; rockEvery: number; starsPerPlanet: number }> = {
  'little-explorer': { speed: 140, rockEvery: 3.2, starsPerPlanet: 6 },
  adventurer: { speed: 190, rockEvery: 2.0, starsPerPlanet: 8 },
  'super-hero': { speed: 250, rockEvery: 1.3, starsPerPlanet: 10 },
};

export interface Thing {
  kind: 'star' | 'rock' | 'planet';
  x: number;
  y: number;
  r: number;
  hit?: boolean;
}

export type SpaceEvent = { type: 'star' } | { type: 'bump' } | { type: 'planet'; planet: Planet } | { type: 'done' };

/** The flying game, without any drawing, so it can be tested. */
export class SpaceGame {
  y = H / 2;
  vy = 0;
  stars = 0;
  starsSincePlanet = 0;
  bumps = 0;
  planetsVisited = 0;
  things: Thing[] = [];
  wobble = 0;
  t = 0;
  private nextStar = 0.5;
  private nextRock: number;
  private planetOut = false;
  readonly tune: (typeof TUNING)[Difficulty];

  constructor(difficulty: Difficulty, private rand: () => number) {
    this.tune = TUNING[difficulty];
    this.nextRock = this.tune.rockEvery;
  }

  get done() {
    return this.planetsVisited >= PLANETS.length;
  }

  /** dir: -1 up, 1 down, 0 none. targetY: pointer target, if any. */
  step(dt: number, dir: number, targetY?: number): SpaceEvent[] {
    const ev: SpaceEvent[] = [];
    if (this.done) return ev;
    this.t += dt;
    const accel = 1400;
    if (targetY !== undefined) {
      const want = Math.max(-320, Math.min(320, (targetY - this.y) * 6));
      this.vy += (want - this.vy) * Math.min(1, dt * 10);
    } else if (dir) this.vy += dir * accel * dt;
    else this.vy *= Math.max(0, 1 - dt * 6);
    this.vy = Math.max(-320, Math.min(320, this.vy));
    this.y = Math.max(30, Math.min(H - 30, this.y + this.vy * dt));
    this.wobble = Math.max(0, this.wobble - dt);

    const speed = this.tune.speed * (this.wobble > 0 ? 0.5 : 1);
    for (const th of this.things) th.x -= speed * dt * (th.kind === 'planet' ? 0.6 : 1);
    this.things = this.things.filter((th) => th.x > -th.r - 20 && !(th.hit && th.kind === 'star'));

    if (!this.planetOut) {
      this.nextStar -= dt;
      this.nextRock -= dt;
      if (this.nextStar <= 0) {
        this.nextStar = 0.6 + this.rand() * 0.6;
        this.things.push({ kind: 'star', x: W + 20, y: 40 + this.rand() * (H - 80), r: 14 });
      }
      if (this.nextRock <= 0) {
        this.nextRock = this.tune.rockEvery * (0.7 + this.rand() * 0.6);
        this.things.push({ kind: 'rock', x: W + 30, y: 40 + this.rand() * (H - 80), r: 22 });
      }
    }

    for (const th of this.things) {
      if (th.hit) continue;
      const d = Math.hypot(th.x - ROCKET_X, th.y - this.y);
      if (th.kind === 'star' && d < th.r + 24) {
        th.hit = true;
        this.stars++;
        this.starsSincePlanet++;
        ev.push({ type: 'star' });
        if (this.starsSincePlanet >= this.tune.starsPerPlanet && !this.planetOut) {
          this.planetOut = true;
          this.things.push({ kind: 'planet', x: W + 120, y: H / 2, r: 90 });
        }
      } else if (th.kind === 'rock' && d < th.r + 18 && this.wobble <= 0) {
        th.hit = true;
        this.bumps++;
        this.wobble = 1;
        ev.push({ type: 'bump' });
      } else if (th.kind === 'planet' && th.x - th.r < ROCKET_X + 20) {
        th.hit = true;
        ev.push(...this.visitPlanet());
      }
    }
    return ev;
  }

  visitPlanet(): SpaceEvent[] {
    const planet = PLANETS[this.planetsVisited];
    this.planetsVisited++;
    this.planetOut = false;
    this.starsSincePlanet = 0;
    this.things = [];
    this.nextRock = this.tune.rockEvery;
    const ev: SpaceEvent[] = [{ type: 'planet', planet }];
    if (this.done) ev.push({ type: 'done' });
    return ev;
  }
}

export function rateTrip(bumps: number): number {
  if (bumps <= 2) return 3;
  if (bumps <= 6) return 2;
  return 1;
}
