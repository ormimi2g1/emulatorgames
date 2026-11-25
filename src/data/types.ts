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
  /** Screen-time rules. Missing = unlimited (older profiles). */
  playtime?: PlaytimeRules;
  /** Parent pressed "Pause play now": no games until switched off. */
  playPaused?: boolean;
}

/** Per-player screen-time rules, set in the Parent Zone. */
export interface PlaytimeRules {
  /** false = unlimited mode (time is still counted for the dashboard). */
  enabled: boolean;
  weekdayMinutes: number;
  weekendMinutes: number;
  /** Permitted playing hours, "HH:MM" local time. Equal values = any time. */
  startTime: string;
  endTime: string;
  /** Break reminder after this many minutes of play. 0 = off. */
  breakEveryMinutes: number;
  breakMinutes: number;
  /** Daily cap for single games, in minutes. Missing or 0 = no extra cap. */
  gameMinutes: Record<string, number>;
}

export const DEFAULT_PLAYTIME: PlaytimeRules = {
  enabled: false,
  weekdayMinutes: 60,
  weekendMinutes: 90,
  startTime: '07:00',
  endTime: '20:00',
  breakEveryMinutes: 30,
  breakMinutes: 5,
  gameMinutes: {},
};

export interface AppSettings {
  theme: ThemeMode;
  /** Games turned off by the parent for every profile. */
  disabledGames: string[];
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  /** Button mapping for the original games. */
  controls: ControlSettings;
}

/** Keyboard codes (KeyboardEvent.code) and gamepad button indexes for the original games. */
export interface ControlSettings {
  keys: { jump: string; action: string; pause: string };
  pad: { jump: number; action: number; pause: number };
  /** On-screen button see-through level, 0.3 to 1. */
  touchOpacity: number;
  vibration: boolean;
}

export const DEFAULT_CONTROLS: ControlSettings = {
  keys: { jump: 'Space', action: 'KeyX', pause: 'Escape' },
  pad: { jump: 0, action: 1, pause: 9 },
  touchOpacity: 0.9,
  vibration: true,
};

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
  controls: DEFAULT_CONTROLS,
};

export interface RetroGame {
  id: string;
  system: string;
  title: string;
  fileName: string;
  size: number;
  sha256: string;
  ageMin: number;
  ageMax: number;
  difficulty: Difficulty;
  /** Parent switched it on for kids. Only possible after a successful test launch. */
  enabled: boolean;
  /** The emulator started this game successfully at least once. */
  tested: boolean;
  /** 'all' = every player, otherwise the listed profile ids. */
  assignedProfiles: 'all' | string[];
  hasArt: boolean;
  addedAt: number;
  updatedAt: number;
}

/** Slot 0 is the automatic "keep my spot" save; 1-3 are manual slots. */
export interface SaveState {
  id: string;
  romId: string;
  profileId: string;
  slot: number;
  data: ArrayBuffer;
  savedAt: number;
}

export const SAVE_SLOTS = [1, 2, 3] as const;
export const AUTO_SLOT = 0;
