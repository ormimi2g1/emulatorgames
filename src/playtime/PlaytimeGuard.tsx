import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyPin } from '../auth/pin';
import { PinPad } from '../components/PinPad';
import type { ChildProfile } from '../data/types';
import { describeFailure } from '../pages/parent/ParentGate';
import { playState } from './playState';
import { addPlay, dayKey, evaluate, extend, formatMinutes, type DayUsage, type StopReason, type Verdict } from './rules';
import { loadDay, saveDay } from './store';

const SAVE_EVERY = 5;
export const EXTENSIONS = [10, 15, 30];

const STOP_TEXT: Record<StopReason, { title: string; body: string; emoji: string }> = {
  daily: { emoji: '🌙', title: "That's all the playtime for today!", body: 'Great playing! Your game is paused and saved where it can be. See you next time.' },
  game: { emoji: '⭐', title: "That's enough of this game for today!", body: 'Your game is paused. You can pick a different game, or play this one again tomorrow.' },
  hours: { emoji: '🛏️', title: "It's not game time right now.", body: 'Games are resting. Ask a grown-up when it is time to play again.' },
  paused: { emoji: '✋', title: 'A grown-up paused the games.', body: 'Your game is paused. Games come back when a grown-up switches them on again.' },
};

const BREAK_IDEAS = ['Stretch up high like a giraffe 🦒', 'Drink some water 💧', 'Look out of a window and find 3 colors 🌈', 'Do 5 big jumps 🐸'];

function clock(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/**
 * Wraps a game screen. Counts active playing time (visible, not paused) and
 * enforces the player's limits: a warning near the end, break reminders, and
 * a friendly stop screen that only a grown-up's PIN can extend.
 * Games pause and save themselves when `playState.held` turns on.
 */
export function PlaytimeGuard({ profile, gameId, children }: { profile: ChildProfile; gameId: string; children: ReactNode }) {
  const navigate = useNavigate();
  const usageRef = useRef<DayUsage | null>(null);
  const dirty = useRef(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [asking, setAsking] = useState(false);
  const rulesRef = useRef(profile);
  rulesRef.current = profile;

  const judge = useCallback(() => {
    const u = usageRef.current;
    if (!u) return;
    const p = rulesRef.current;
    const v = evaluate(p.playtime, !!p.playPaused, u, gameId, Date.now());
    setVerdict(v);
    playState.setHeld(v.kind === 'break' || v.kind === 'stop');
  }, [gameId]);

  const persist = useCallback(async () => {
    const u = usageRef.current;
    if (!u || !dirty.current) return;
    dirty.current = 0;
    await saveDay(u);
  }, []);

  useEffect(() => {
    let alive = true;
    playState.reset();
    void loadDay(profile.id).then((u) => {
      if (!alive) return;
      usageRef.current = u;
      judge();
      // Test hooks appear only once today's time has loaded.
      if (new URLSearchParams(window.location.search).get('testhooks') === '1') {
        (window as unknown as { __playtime: unknown }).__playtime = {
          /** Count `sec` seconds of play at once. */
          play: (sec: number) => {
            if (!usageRef.current) return;
            usageRef.current = addPlay(usageRef.current, rulesRef.current.playtime, gameId, sec, Date.now());
            dirty.current++;
            void persist();
            judge();
          },
          endBreak: () => {
            if (!usageRef.current) return;
            usageRef.current = { ...usageRef.current, breakUntil: 0 };
            judge();
          },
          state: () =>
            usageRef.current && { ...usageRef.current, verdict: evaluate(rulesRef.current.playtime, !!rulesRef.current.playPaused, usageRef.current, gameId, Date.now()) },
        };
      }
    });
    const tick = async () => {
      const u = usageRef.current;
      if (!u) return;
      const now = Date.now();
      if (u.day !== dayKey(now)) {
        await persist();
        usageRef.current = await loadDay(profile.id, now);
      }
      const p = rulesRef.current;
      const v = evaluate(p.playtime, !!p.playPaused, usageRef.current!, gameId, now);
      const counting = !document.hidden && !playState.isPaused() && (v.kind === 'ok' || v.kind === 'unlimited');
      if (counting) {
        usageRef.current = addPlay(usageRef.current!, p.playtime, gameId, 1, now);
        if (++dirty.current >= SAVE_EVERY) void persist();
      }
      judge();
    };
    const t = window.setInterval(() => void tick(), 1000);
    const onVis = () => document.hidden && void persist();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onVis);
    return () => {
      alive = false;
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onVis);
      dirty.current = Math.max(dirty.current, 1);
      void persist();
      playState.reset();
      delete (window as unknown as { __playtime?: unknown }).__playtime;
    };
  }, [profile.id, gameId, judge, persist]);

  // Rules changed in another tab or by a parent: check again right away.
  useEffect(judge, [profile.playtime, profile.playPaused, judge]);

  const grant = async (minutes: number) => {
    const u = usageRef.current;
    if (!u) return;
    usageRef.current = extend(u, minutes, Date.now());
    dirty.current++;
    await persist();
    setAsking(false);
    judge();
  };

  return (
    <>
      {children}
      {verdict?.kind === 'ok' && verdict.warn && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-4" role="status" data-testid="playtime-warning">
          <p className="rounded-full bg-sun px-5 py-2 text-lg font-bold text-navy shadow-lg">
            ⏰ {verdict.remaining < 60 ? 'Less than a minute' : formatMinutes(verdict.remaining)} left. Find a good place to stop!
          </p>
        </div>
      )}
      {verdict?.kind === 'break' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/90 p-4 text-white" role="dialog" aria-modal="true" aria-label="Break time" data-testid="playtime-break">
          <div className="card flex w-[min(92vw,26rem)] flex-col items-center gap-4 p-6 text-center text-[var(--text)]">
            <span className="text-6xl" aria-hidden="true">🧘</span>
            <h2 className="text-3xl font-bold">Break time!</h2>
            <p className="text-lg">{BREAK_IDEAS[Math.floor(Date.now() / 60_000) % BREAK_IDEAS.length]}</p>
            <p className="text-2xl font-bold" aria-live="polite">Back in {clock(verdict.left)}</p>
            <p className="muted text-sm">Your game is paused and waiting for you.</p>
          </div>
        </div>
      )}
      {verdict?.kind === 'stop' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-navy/95 p-4" role="dialog" aria-modal="true" aria-labelledby="stop-title" data-testid="playtime-stop">
          <div className="card flex w-[min(92vw,26rem)] flex-col items-center gap-4 p-6 text-center">
            {!asking ? (
              <>
                <span className="text-6xl" aria-hidden="true">{STOP_TEXT[verdict.reason].emoji}</span>
                <h2 id="stop-title" className="text-2xl font-bold">{STOP_TEXT[verdict.reason].title}</h2>
                <p className="text-lg">{STOP_TEXT[verdict.reason].body}</p>
                <button type="button" className="btn btn-sun min-h-14 text-xl" onClick={() => navigate('/')} autoFocus>🏠 Back to the arcade</button>
                {verdict.reason !== 'paused' && (
                  <button type="button" className="btn btn-ghost min-h-12" onClick={() => setAsking(true)}>🔐 Grown-up: more time</button>
                )}
              </>
            ) : (
              <Extend onGrant={grant} onCancel={() => setAsking(false)} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Extend({ onGrant, onCancel }: { onGrant: (m: number) => void; onCancel: () => void }) {
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ok) {
    return (
      <div className="flex w-full flex-col gap-3">
        <PinPad
          label="🔐 Grown-ups only: enter the parent PIN"
          error={error}
          onSubmit={async (pin) => {
            const res = await verifyPin(pin);
            if (res.ok) setOk(true);
            else setError(describeFailure(res));
          }}
        />
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-3">
      <h2 className="text-2xl font-bold">How much more time?</h2>
      <div className="flex flex-wrap justify-center gap-3">
        {EXTENSIONS.map((m) => (
          <button key={m} type="button" className="btn btn-primary min-h-14 text-xl" onClick={() => onGrant(m)}>+{m} min</button>
        ))}
      </div>
      <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}
