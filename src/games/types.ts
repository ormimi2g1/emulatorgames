import type { Difficulty } from '../data/types';

export type GameCategory = 'adventure' | 'retro' | 'racing' | 'puzzles' | 'learn';
export type GameStatus = 'available' | 'coming-soon';
export type ControlType = 'keyboard' | 'touch' | 'gamepad';

/** What the arcade hands to a running game. */
export interface GameContext {
  profileId: string;
  difficulty: Difficulty;
  reducedMotion: boolean;
  volume: { master: number; music: number; sfx: number; muted: boolean };
  onComplete: (result: { stars?: number; achievements?: string[] }) => void;
  onExitRequest: () => void;
}

/**
 * Standard lifecycle every game implements. `destroy` MUST release
 * audio, listeners, timers and game loops so nothing runs in the background.
 */
export interface GameInstance {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  save(): Promise<unknown>;
  load(data: unknown): Promise<void>;
  destroy(): void;
}

export interface GameModule {
  mount(container: HTMLElement, ctx: GameContext): Promise<GameInstance>;
}

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  /** Ages, inclusive. */
  ageMin: number;
  ageMax: number;
  difficulties: Difficulty[];
  controls: ControlType[];
  players: { min: number; max: number };
  offline: boolean;
  saves: boolean;
  status: GameStatus;
  version: string;
  /** Phase on the roadmap in which this game is scheduled to arrive. */
  plannedPhase?: number;
  /** Lazily loaded game code. Required when status is 'available'. */
  load?: () => Promise<GameModule>;
}
