import type { PlaytimeRules } from '../data/types';

/**
 * Screen-time rules, kept free of storage and React so they are easy to test.
 * All times are the device's local time. Time is counted only while a game is
 * open, visible and not paused (see PlaytimeGuard).
 */

/** One player's active playing time for one local day. */
export interface DayUsage {
  /** `${profileId}:${day}` */
  id: string;
  profileId: string;
  /** Local date, YYYY-MM-DD. */
  day: string;
  seconds: number;
  /** Seconds per game id. */
  games: Record<string, number>;
  /** Extra minutes a grown-up added today. */
  extraMinutes: number;
  /** Seconds played since the last break. */
  sinceBreak: number;
  /** Last time a second was counted (ms). */
  lastActiveAt: number;
  /** A break is running until this time (ms). */
  breakUntil: number;
  /** A grown-up allowed play outside the permitted hours until this time (ms). */
  hoursOverrideUntil: number;
}

export const WARN_SECONDS = 5 * 60;

export type StopReason = 'daily' | 'game' | 'hours' | 'paused';

export type Verdict =
  | { kind: 'unlimited' }
  | { kind: 'ok'; remaining: number; warn: boolean }
  | { kind: 'break'; left: number }
  | { kind: 'stop'; reason: StopReason };

export function dayKey(t: number | Date): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isWeekend(t: number | Date): boolean {
  const wd = new Date(t).getDay();
  return wd === 0 || wd === 6;
}

/** "HH:MM" → minutes after midnight, or null when it isn't a time. */
export function parseTime(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export function emptyDay(profileId: string, t: number): DayUsage {
  const day = dayKey(t);
  return { id: `${profileId}:${day}`, profileId, day, seconds: 0, games: {}, extraMinutes: 0, sinceBreak: 0, lastActiveAt: 0, breakUntil: 0, hoursOverrideUntil: 0 };
}

/** Today's allowance in minutes, before any grown-up extensions. */
export function dailyMinutes(rules: PlaytimeRules, t: number): number {
  return isWeekend(t) ? rules.weekendMinutes : rules.weekdayMinutes;
}

/**
 * Seconds left until the permitted hours end, Infinity when there is no
 * window, or 0 when `t` is outside the window. Windows may cross midnight
 * (for example 18:00 to 02:00).
 */
export function secondsLeftInHours(rules: PlaytimeRules, t: number): number {
  const start = parseTime(rules.startTime);
  const end = parseTime(rules.endTime);
  if (start === null || end === null || start === end) return Infinity;
  const d = new Date(t);
  const nowMin = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  const inside = start < end ? nowMin >= start && nowMin < end : nowMin >= start || nowMin < end;
  if (!inside) return 0;
  const untilEnd = end > nowMin ? end - nowMin : end + 24 * 60 - nowMin;
  return Math.round(untilEnd * 60);
}

/** Can this player play `gameId` right now, and for how long? */
export function evaluate(rules: PlaytimeRules | undefined, paused: boolean, usage: DayUsage, gameId: string | null, now: number): Verdict {
  if (paused) return { kind: 'stop', reason: 'paused' };
  if (!rules?.enabled) return { kind: 'unlimited' };
  const override = usage.hoursOverrideUntil > now;
  const hoursLeft = override ? Infinity : secondsLeftInHours(rules, now);
  if (hoursLeft <= 0) return { kind: 'stop', reason: 'hours' };
  let remaining = (dailyMinutes(rules, now) + usage.extraMinutes) * 60 - usage.seconds;
  if (remaining <= 0) return { kind: 'stop', reason: 'daily' };
  const cap = gameId ? rules.gameMinutes[gameId] ?? 0 : 0;
  if (cap > 0 && gameId) {
    const gameLeft = (cap + usage.extraMinutes) * 60 - (usage.games[gameId] ?? 0);
    if (gameLeft <= 0) return { kind: 'stop', reason: 'game' };
    remaining = Math.min(remaining, gameLeft);
  }
  if (usage.breakUntil > now) return { kind: 'break', left: Math.ceil((usage.breakUntil - now) / 1000) };
  remaining = Math.min(remaining, hoursLeft);
  return { kind: 'ok', remaining, warn: remaining <= WARN_SECONDS };
}

/** Count `sec` seconds of active play and start a break when one is due. */
export function addPlay(usage: DayUsage, rules: PlaytimeRules | undefined, gameId: string, sec: number, now: number): DayUsage {
  let since = usage.sinceBreak;
  // A long enough pause away from games counts as a break.
  const restMs = Math.max(1, rules?.breakMinutes ?? 5) * 60_000;
  if (usage.lastActiveAt && now - usage.lastActiveAt >= restMs) since = 0;
  since += sec;
  let breakUntil = usage.breakUntil;
  if (rules?.enabled && rules.breakEveryMinutes > 0 && since >= rules.breakEveryMinutes * 60) {
    breakUntil = now + Math.max(1, rules.breakMinutes) * 60_000;
    since = 0;
  }
  return {
    ...usage,
    seconds: usage.seconds + sec,
    games: { ...usage.games, [gameId]: (usage.games[gameId] ?? 0) + sec },
    sinceBreak: since,
    lastActiveAt: now,
    breakUntil,
  };
}

/** A grown-up adds minutes. Also lifts the hours window and any break for that long. */
export function extend(usage: DayUsage, minutes: number, now: number): DayUsage {
  return {
    ...usage,
    extraMinutes: usage.extraMinutes + minutes,
    hoursOverrideUntil: Math.max(usage.hoursOverrideUntil, now) + minutes * 60_000,
    breakUntil: 0,
    sinceBreak: 0,
  };
}

export function formatMinutes(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

export interface UsageSummary {
  today: number;
  week: number;
  total: number;
  /** [gameId, seconds], most played first. */
  topGames: [string, number][];
}

/** Totals for the parent dashboard. `days` may hold several players. */
export function summarize(days: DayUsage[], now: number): UsageSummary {
  const today = dayKey(now);
  const weekAgo = dayKey(now - 6 * 86_400_000);
  const games = new Map<string, number>();
  let t = 0;
  let w = 0;
  let total = 0;
  for (const d of days) {
    total += d.seconds;
    if (d.day === today) t += d.seconds;
    if (d.day >= weekAgo && d.day <= today) w += d.seconds;
    for (const [g, s] of Object.entries(d.games)) games.set(g, (games.get(g) ?? 0) + s);
  }
  return { today: t, week: w, total, topGames: [...games.entries()].sort((a, b) => b[1] - a[1]) };
}
