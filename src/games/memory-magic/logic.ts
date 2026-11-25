import type { Difficulty } from '../../data/types';
import { shuffle } from '../shared/MiniGame';

export interface Symbol {
  id: string;
  emoji: string;
  name: string;
}

export const SYMBOLS: Symbol[] = [
  { id: 'apple', emoji: '🍎', name: 'apple' },
  { id: 'dog', emoji: '🐶', name: 'puppy' },
  { id: 'star', emoji: '⭐', name: 'star' },
  { id: 'rainbow', emoji: '🌈', name: 'rainbow' },
  { id: 'rocket', emoji: '🚀', name: 'rocket' },
  { id: 'cat', emoji: '🐱', name: 'kitten' },
  { id: 'flower', emoji: '🌻', name: 'sunflower' },
  { id: 'fish', emoji: '🐠', name: 'fish' },
  { id: 'cake', emoji: '🧁', name: 'cupcake' },
  { id: 'frog', emoji: '🐸', name: 'frog' },
];

export const PAIRS: Record<Difficulty, number> = { 'little-explorer': 4, adventurer: 6, 'super-hero': 8 };
export const COLUMNS: Record<Difficulty, number> = { 'little-explorer': 4, adventurer: 4, 'super-hero': 4 };

export interface Card {
  key: number;
  symbol: Symbol;
}

export function makeDeck(pairs: number, rand: () => number): Card[] {
  const picked = shuffle(SYMBOLS, rand).slice(0, pairs);
  return shuffle([...picked, ...picked], rand).map((symbol, key) => ({ key, symbol }));
}

/** 3 stars for a near-perfect memory, never fewer than 1. */
export function rateMemory(moves: number, pairs: number): number {
  if (moves <= Math.ceil(pairs * 1.5)) return 3;
  if (moves <= pairs * 2.5) return 2;
  return 1;
}
