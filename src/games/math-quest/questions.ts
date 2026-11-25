import type { Difficulty } from '../../data/types';
import { shuffle } from '../shared/MiniGame';

export interface Question {
  kind: 'count' | 'add' | 'subtract' | 'multiply';
  a: number;
  b: number;
  answer: number;
  text: string;
  /** Spoken/visible hint objects, for counting and little adders. */
  picture?: string;
  choices: number[];
}

export const DOORS = 8;

const PICTURES = ['⭐', '🍎', '🐟', '🎈', '🌸', '🐞'];

function int(rand: () => number, min: number, max: number) {
  return min + Math.floor(rand() * (max - min + 1));
}

export function makeQuestion(difficulty: Difficulty, rand: () => number): Question {
  let q: Omit<Question, 'choices'>;
  const pic = PICTURES[int(rand, 0, PICTURES.length - 1)];
  if (difficulty === 'little-explorer') {
    if (rand() < 0.5) {
      const n = int(rand, 1, 6);
      q = { kind: 'count', a: n, b: 0, answer: n, text: 'How many?', picture: pic };
    } else {
      const a = int(rand, 1, 3);
      const b = int(rand, 1, 2);
      q = { kind: 'add', a, b, answer: a + b, text: `${a} + ${b} = ?`, picture: pic };
    }
  } else if (difficulty === 'adventurer') {
    if (rand() < 0.6) {
      const a = int(rand, 1, 9);
      const b = int(rand, 1, 10 - a);
      q = { kind: 'add', a, b, answer: a + b, text: `${a} + ${b} = ?` };
    } else {
      const a = int(rand, 2, 10);
      const b = int(rand, 1, a);
      q = { kind: 'subtract', a, b, answer: a - b, text: `${a} − ${b} = ?` };
    }
  } else {
    const r = rand();
    if (r < 0.35) {
      const a = int(rand, 5, 15);
      const b = int(rand, 2, 20 - a);
      q = { kind: 'add', a, b, answer: a + b, text: `${a} + ${b} = ?` };
    } else if (r < 0.7) {
      const a = int(rand, 8, 20);
      const b = int(rand, 2, a);
      q = { kind: 'subtract', a, b, answer: a - b, text: `${a} − ${b} = ?` };
    } else {
      const a = int(rand, 2, 5);
      const b = int(rand, 2, 5);
      q = { kind: 'multiply', a, b, answer: a * b, text: `${a} × ${b} = ?` };
    }
  }
  const wrong = new Set<number>();
  const spread = q.answer > 10 ? 4 : 2;
  while (wrong.size < 2) {
    const w = q.answer + (rand() < 0.5 ? -1 : 1) * int(rand, 1, spread);
    if (w >= 0 && w !== q.answer) wrong.add(w);
  }
  return { ...q, choices: shuffle([q.answer, ...wrong], rand) };
}

export function makeQuest(difficulty: Difficulty, rand: () => number): Question[] {
  return Array.from({ length: DOORS }, () => makeQuestion(difficulty, rand));
}

/** Stars from how many doors opened on the first try. */
export function rateQuest(firstTry: number, doors = DOORS): number {
  if (firstTry >= doors - 1) return 3;
  if (firstTry >= Math.ceil(doors / 2)) return 2;
  return 1;
}
