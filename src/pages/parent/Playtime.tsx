import { useCallback, useEffect, useState } from 'react';
import { AvatarBadge } from '../../components/AvatarBadge';
import { DEFAULT_PLAYTIME, type ChildProfile, type PlaytimeRules } from '../../data/types';
import { GAMES, isPlayable } from '../../games/catalog';
import { retroGameId } from '../../retro/catalog';
import { dailyMinutes, emptyDay, extend, formatMinutes, type DayUsage } from '../../playtime/rules';
import { loadDay, saveDay } from '../../playtime/store';
import { useApp } from '../../state/AppContext';

const DAY_CHOICES = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];
const BREAK_EVERY = [0, 15, 20, 30, 45, 60];
const BREAK_LENGTH = [2, 5, 10, 15];
const GAME_CAPS = [0, 10, 15, 20, 30, 45, 60, 90];

function Select({ label, value, options, format, onChange }: { label: string; value: number; options: number[]; format: (n: number) => string; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1 font-semibold">
      {label}
      <select className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label}>
        {[...new Set([...options, value])].sort((a, b) => a - b).map((n) => (
          <option key={n} value={n}>{format(n)}</option>
        ))}
      </select>
    </label>
  );
}

function PlayerRules({ profile }: { profile: ChildProfile }) {
  const { patchProfile, retroGames } = useApp();
  const rules: PlaytimeRules = { ...DEFAULT_PLAYTIME, ...profile.playtime };
  const [today, setToday] = useState<DayUsage | null>(null);
  const name = profile.nickname;

  const reload = useCallback(() => void loadDay(profile.id).then(setToday), [profile.id]);
  useEffect(() => {
    reload();
    const t = window.setInterval(reload, 10_000);
    return () => window.clearInterval(t);
  }, [reload]);

  const set = (patch: Partial<PlaytimeRules>) => void patchProfile(profile.id, (p) => ({ ...p, playtime: { ...DEFAULT_PLAYTIME, ...p.playtime, ...patch } }));
  const changeToday = async (next: DayUsage) => {
    await saveDay(next);
    setToday(next);
  };
  const games = [
    ...GAMES.filter(isPlayable).map((g) => ({ id: g.id, title: g.title })),
    ...retroGames.filter((g) => g.enabled).map((g) => ({ id: retroGameId(g.id), title: g.title })),
  ];
  const now = Date.now();
  const allowance = dailyMinutes(rules, now) + (today?.extraMinutes ?? 0);

  return (
    <section className="card flex flex-col gap-4 p-5" aria-label={`Playtime for ${name}`}>
      <div className="flex flex-wrap items-center gap-3">
        <AvatarBadge avatarId={profile.avatarId} size={48} />
        <h2 className="flex-1 text-xl font-bold">{name}</h2>
        <span className="surface-2 rounded-full px-3 py-1 font-semibold" data-testid={`today-${name}`}>
          Today: {formatMinutes(today?.seconds ?? 0)}
          {rules.enabled && ` of ${formatMinutes(allowance * 60)}`}
        </span>
      </div>

      <label className="flex min-h-11 items-center gap-3 font-semibold">
        <input type="checkbox" className="h-6 w-6 accent-purple" checked={!!profile.playPaused} onChange={(e) => void patchProfile(profile.id, (p) => ({ ...p, playPaused: e.target.checked }))} aria-label={`Pause play now for ${name}`} />
        ✋ Pause play now <span className="muted font-normal">(stops games right away until you switch it off)</span>
      </label>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Time limits for ${name}`}>
        <button type="button" role="radio" aria-checked={!rules.enabled} className={`btn ${!rules.enabled ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set({ enabled: false })}>♾️ Unlimited</button>
        <button type="button" role="radio" aria-checked={rules.enabled} className={`btn ${rules.enabled ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set({ enabled: true })}>⏰ Use time limits</button>
      </div>

      {rules.enabled && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label={`School days (Mon–Fri) for ${name}`} value={rules.weekdayMinutes} options={DAY_CHOICES} format={(n) => formatMinutes(n * 60)} onChange={(n) => set({ weekdayMinutes: n })} />
            <Select label={`Weekends for ${name}`} value={rules.weekendMinutes} options={DAY_CHOICES} format={(n) => formatMinutes(n * 60)} onChange={(n) => set({ weekendMinutes: n })} />
            <label className="flex flex-col gap-1 font-semibold">
              Games allowed from
              <input type="time" className="input" value={rules.startTime} onChange={(e) => set({ startTime: e.target.value })} aria-label={`Games allowed from for ${name}`} />
            </label>
            <label className="flex flex-col gap-1 font-semibold">
              Games end at
              <input type="time" className="input" value={rules.endTime} onChange={(e) => set({ endTime: e.target.value })} aria-label={`Games end at for ${name}`} />
            </label>
            <Select label={`Break reminder for ${name}`} value={rules.breakEveryMinutes} options={BREAK_EVERY} format={(n) => (n ? `Every ${n} min` : 'Off')} onChange={(n) => set({ breakEveryMinutes: n })} />
            <Select label={`Break length for ${name}`} value={rules.breakMinutes} options={BREAK_LENGTH} format={(n) => `${n} min`} onChange={(n) => set({ breakMinutes: n })} />
          </div>
          <p className="muted text-sm">Set the same start and end time to allow games at any hour. A warning shows 5 minutes before time runs out.</p>
          <details className="surface-2 rounded-2xl p-3">
            <summary className="cursor-pointer font-semibold">Limits for single games</summary>
            <ul className="mt-3 flex flex-col gap-2">
              {games.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{g.title}</span>
                  <select
                    className="input w-auto"
                    aria-label={`Daily limit for ${g.title} for ${name}`}
                    value={rules.gameMinutes[g.id] ?? 0}
                    onChange={(e) => {
                      const minutes = Number(e.target.value);
                      void patchProfile(profile.id, (p) => {
                        const cur = { ...DEFAULT_PLAYTIME, ...p.playtime };
                        return { ...p, playtime: { ...cur, gameMinutes: { ...cur.gameMinutes, [g.id]: minutes } } };
                      });
                    }}
                  >
                    {GAME_CAPS.map((n) => (
                      <option key={n} value={n}>{n ? `${n} min a day` : 'No extra limit'}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => today && void changeToday(extend(today, 15, now))}>➕ 15 min today</button>
        <button type="button" className="btn btn-ghost" onClick={() => void changeToday(emptyDay(profile.id, now))}>↺ Reset today's time</button>
      </div>
    </section>
  );
}

export function Playtime() {
  const { profiles } = useApp();
  return (
    <div className="flex flex-col gap-4">
      {profiles.length === 0 && <p className="card p-5">No players yet. Add one under Players.</p>}
      {profiles.map((p) => (
        <PlayerRules key={p.id} profile={p} />
      ))}
      <section className="card flex flex-col gap-2 p-5">
        <h2 className="text-xl font-bold">How time is counted</h2>
        <ul className="muted list-disc pl-5">
          <li>Only active play counts: a game must be open, on screen and not paused.</li>
          <li>When time is up, the game pauses and saves where it can, and a friendly message shows. Only the parent PIN can add time.</li>
          <li>Time is stored on this device only. Clearing the browser's data resets it, and other devices keep their own count.</li>
          <li>The device clock is used, so changing the clock changes the day and hours.</li>
        </ul>
      </section>
    </div>
  );
}
