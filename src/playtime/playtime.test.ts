import { describe, expect, it } from 'vitest';
import { kvSet } from '../data/db';
import { deleteProfile, makeProfile, saveProfile } from '../data/profiles';
import { loadSettings } from '../data/settings';
import { DEFAULT_PLAYTIME, type PlaytimeRules } from '../data/types';
import { addPlay, dayKey, emptyDay, evaluate, extend, formatMinutes, secondsLeftInHours, summarize } from './rules';
import { listDays, loadDay, saveDay } from './store';

// Wednesday 25 Nov 2026, 15:00 local time; Saturday 28 Nov 2026, 15:00.
const WED = new Date(2026, 10, 25, 15, 0, 0).getTime();
const SAT = new Date(2026, 10, 28, 15, 0, 0).getTime();
const rules = (patch: Partial<PlaytimeRules> = {}): PlaytimeRules => ({ ...DEFAULT_PLAYTIME, enabled: true, breakEveryMinutes: 0, ...patch });
const played = (sec: number, game = 'math-quest', t = WED) => addPlay(emptyDay('p1', t), rules(), game, sec, t);

describe('playtime rules', () => {
  it('unlimited mode never stops, but a parent pause always does', () => {
    expect(evaluate(undefined, false, played(99_999), 'x', WED).kind).toBe('unlimited');
    expect(evaluate({ ...DEFAULT_PLAYTIME, enabled: false }, false, played(99_999), 'x', WED).kind).toBe('unlimited');
    expect(evaluate(undefined, true, played(0), 'x', WED)).toEqual({ kind: 'stop', reason: 'paused' });
  });

  it('uses the weekday and weekend allowance', () => {
    const r = rules({ weekdayMinutes: 30, weekendMinutes: 90 });
    expect(evaluate(r, false, played(20 * 60), null, WED)).toMatchObject({ kind: 'ok', remaining: 600 });
    expect(evaluate(r, false, played(30 * 60), null, WED)).toEqual({ kind: 'stop', reason: 'daily' });
    expect(evaluate(r, false, played(30 * 60, 'x', SAT), null, SAT)).toMatchObject({ kind: 'ok', remaining: 3600 });
  });

  it('warns in the last five minutes', () => {
    const r = rules({ weekdayMinutes: 30 });
    expect(evaluate(r, false, played(24 * 60), null, WED)).toMatchObject({ warn: false });
    expect(evaluate(r, false, played(26 * 60), null, WED)).toMatchObject({ warn: true });
  });

  it('stops outside the permitted hours, including windows across midnight', () => {
    expect(evaluate(rules({ startTime: '07:00', endTime: '14:00' }), false, played(0), null, WED)).toEqual({ kind: 'stop', reason: 'hours' });
    expect(evaluate(rules({ startTime: '16:00', endTime: '20:00' }), false, played(0), null, WED)).toEqual({ kind: 'stop', reason: 'hours' });
    expect(secondsLeftInHours(rules({ startTime: '07:00', endTime: '15:10' }), WED)).toBe(600);
    expect(secondsLeftInHours(rules({ startTime: '14:00', endTime: '01:00' }), WED)).toBe(10 * 3600);
    expect(secondsLeftInHours(rules({ startTime: '20:00', endTime: '06:00' }), WED)).toBe(0);
    expect(secondsLeftInHours(rules({ startTime: '08:00', endTime: '08:00' }), WED)).toBe(Infinity);
    // Bedtime counts down like the daily limit.
    expect(evaluate(rules({ startTime: '07:00', endTime: '15:03' }), false, played(0), null, WED)).toMatchObject({ kind: 'ok', remaining: 180, warn: true });
  });

  it('caps single games without stopping the others', () => {
    const r = rules({ weekdayMinutes: 120, gameMinutes: { 'rainbow-kart': 15 } });
    const u = played(15 * 60, 'rainbow-kart');
    expect(evaluate(r, false, u, 'rainbow-kart', WED)).toEqual({ kind: 'stop', reason: 'game' });
    expect(evaluate(r, false, u, 'math-quest', WED)).toMatchObject({ kind: 'ok', remaining: 105 * 60 });
  });

  it('a grown-up extension adds time, lifts bedtime and ends a break', () => {
    const r = rules({ weekdayMinutes: 30, startTime: '07:00', endTime: '14:00' });
    let u = played(30 * 60);
    expect(evaluate(r, false, u, null, WED).kind).toBe('stop');
    u = extend(u, 15, WED);
    expect(evaluate(r, false, u, null, WED)).toMatchObject({ kind: 'ok', remaining: 900 });
    expect(evaluate(r, false, u, null, WED + 16 * 60_000)).toEqual({ kind: 'stop', reason: 'hours' });
    expect(extend({ ...u, breakUntil: WED + 60_000 }, 10, WED).breakUntil).toBe(0);
  });

  it('starts a break after the set time and a rest away resets the count', () => {
    const r = rules({ weekdayMinutes: 240, breakEveryMinutes: 20, breakMinutes: 5 });
    let u = emptyDay('p1', WED);
    let t = WED;
    for (let i = 0; i < 19 * 60; i++) u = addPlay(u, r, 'g', 1, (t += 1000));
    expect(u.breakUntil).toBe(0);
    // Away for 6 minutes: that counts as a rest.
    t += 6 * 60_000;
    u = addPlay(u, r, 'g', 1, t);
    expect(u.sinceBreak).toBe(1);
    for (let i = 0; i < 20 * 60 - 1; i++) u = addPlay(u, r, 'g', 1, (t += 1000));
    expect(u.breakUntil).toBe(t + 5 * 60_000);
    expect(evaluate(r, false, u, 'g', t + 1000)).toMatchObject({ kind: 'break', left: 299 });
    expect(evaluate(r, false, u, 'g', t + 5 * 60_000).kind).toBe('ok');
    // Unlimited mode has no break reminders.
    expect(addPlay(emptyDay('p', WED), undefined, 'g', 3600, WED).breakUntil).toBe(0);
  });

  it('formats and summarises time', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45 * 60)).toBe('45 min');
    expect(formatMinutes(90 * 60)).toBe('1 h 30 min');
    expect(formatMinutes(120 * 60)).toBe('2 h');
    const days = [
      { ...played(600, 'a'), profileId: 'p1' },
      { ...addPlay(emptyDay('p1', WED - 3 * 86_400_000), rules(), 'b', 1200, WED - 3 * 86_400_000) },
      { ...addPlay(emptyDay('p2', WED - 20 * 86_400_000), rules(), 'b', 300, WED - 20 * 86_400_000) },
    ];
    expect(summarize(days, WED)).toEqual({ today: 600, week: 1800, total: 2100, topGames: [['b', 1500], ['a', 600]] });
    expect(dayKey(WED)).toBe('2026-11-25');
  });
});

describe('playtime storage', () => {
  it('keeps one record per player per day and removes it with the player', async () => {
    const p = makeProfile({ nickname: 'Timer', avatarId: 'lion' });
    await saveProfile(p);
    const today = await loadDay(p.id);
    expect(today.seconds).toBe(0);
    await saveDay(addPlay(today, undefined, 'math-quest', 42, Date.now()));
    expect((await loadDay(p.id)).seconds).toBe(42);
    expect(await listDays(p.id)).toHaveLength(1);
    await deleteProfile(p.id);
    expect(await listDays(p.id)).toHaveLength(0);
  });

  it('fills in new control settings for settings saved by an older version', async () => {
    await kvSet('settings', { theme: 'light', disabledGames: [], masterVolume: 1, musicVolume: 1, sfxVolume: 1, muted: false } as never);
    const s = await loadSettings();
    expect(s.theme).toBe('light');
    expect(s.controls.keys.jump).toBe('Space');
    expect(s.controls.pad.pause).toBe(9);
    expect(s.controls.touchOpacity).toBeGreaterThan(0);
  });
});
