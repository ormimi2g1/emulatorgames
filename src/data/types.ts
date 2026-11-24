/** Shared data model. Everything here is stored locally in IndexedDB (see docs/DATA.md). */

export type AgeRange = '' | '3-4' | '5-6' | '7-8' | '9-10';
export type Difficulty = 'little-explorer' | 'adventurer' | 'super-hero';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AccessibilityPrefs {
  highContrast: boolean;
  reducedMotion: boolean;
  /** Bigger on-screen buttons in games. */
  largeControls: boolean;
  leftHanded: boolean;
}

export interface RecentPlay {
  gameId: string;
  at: number;
}

export interface ChildProfile {
  id: string;
  nickname: string;
  avatarId: string;
  ageRange: AgeRange;
  difficulty: Difficulty;
  favorites: string[];
  recent: RecentPlay[];
  /** 'all' = every enabled game. Otherwise only the listed game ids. */
  assignedGames: 'all' | string[];
  accessibility: AccessibilityPrefs;
  achievements: string[];
  createdAt: number;
  isDemo?: boolean;
}

export interface AppSettings {
  theme: ThemeMode;
  /** Games turned off by the parent for every profile. */
  disabledGames: string[];
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface ParentAuthRecord {
  version: 1;
  algorithm: 'PBKDF2-SHA256';
  iterations: number;
  pinSalt: string;
  pinHash: string;
  recoverySalt: string;
  recoveryHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface LockoutState {
  failures: number;
  lockedUntil: number;
}

export const DEFAULT_ACCESSIBILITY: AccessibilityPrefs = {
  highContrast: false,
  reducedMotion: false,
  largeControls: false,
  leftHanded: false,
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  disabledGames: [],
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
};
