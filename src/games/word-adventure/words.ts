import type { Difficulty } from '../../data/types';
import { shuffle } from '../shared/MiniGame';

export interface Word {
  word: string;
  emoji: string;
}

export const WORDS: Word[] = [
  { word: 'CAT', emoji: '🐱' },
  { word: 'DOG', emoji: '🐶' },
  { word: 'SUN', emoji: '☀️' },
  { word: 'BUS', emoji: '🚌' },
  { word: 'HAT', emoji: '🎩' },
  { word: 'BEE', emoji: '🐝' },
  { word: 'PIG', emoji: '🐷' },
  { word: 'COW', emoji: '🐮' },
  { word: 'FISH', emoji: '🐟' },
  { word: 'STAR', emoji: '⭐' },
  { word: 'CAKE', emoji: '🎂' },
  { word: 'FROG', emoji: '🐸' },
  { word: 'MOON', emoji: '🌙' },
  { word: 'TREE', emoji: '🌳' },
  { word: 'BOAT', emoji: '⛵' },
  { word: 'DUCK', emoji: '🦆' },
];

export const ROUNDS = 8;
const ALPHABET = 'ABCDEFGHIJKLMNOPRSTUW';

export type Round =
  | { kind: 'letter'; letter: string; choices: string[]; word: Word }
  | { kind: 'spell'; word: Word; tiles: string[] };

export function makeRounds(difficulty: Difficulty, rand: () => number): Round[] {
  const words = shuffle(WORDS, rand);
  return Array.from({ length: ROUNDS }, (_, i) => {
    const w = words[i % words.length];
    if (difficulty === 'little-explorer') {
      const letter = w.word[0];
      const others = shuffle([...ALPHABET].filter((c) => c !== letter), rand).slice(0, 2);
      return { kind: 'letter', letter, choices: shuffle([letter, ...others], rand), word: w };
    }
    // Spell the word: its letters plus one extra, shuffled.
    const extra = shuffle([...ALPHABET].filter((c) => !w.word.includes(c)), rand)[0];
    return { kind: 'spell', word: w, tiles: shuffle([...w.word, extra], rand) };
  });
}

export function rateWords(firstTry: number, rounds = ROUNDS): number {
  if (firstTry >= rounds - 1) return 3;
  if (firstTry >= Math.ceil(rounds / 2)) return 2;
  return 1;
}

/** Reads a word aloud with the device's own voice, when it has one. Works offline on most devices. */
export function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch {
    /* no voice available */
  }
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
