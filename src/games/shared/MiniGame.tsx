import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACHIEVEMENTS } from '../../data/achievements';
import { loadProgress, saveProgress } from '../../data/progress';
import type { ChildProfile } from '../../data/types';
import { useApp } from '../../state/AppContext';
import { Tones, type Tone } from './tones';

export interface MiniBest {
  stars: number;
  plays: number;
  [key: string]: unknown;
}

/**
 * Shared plumbing for the mini-games: the active player, sounds, saved
 * best results and badges. Records the game as recently played on start.
 */
export function useMiniGame(gameId: string) {
  const { activeProfile, settings, updateProfile } = useApp();
  const profileRef = useRef<ChildProfile | null>(activeProfile);
  profileRef.current = activeProfile;
  const tonesRef = useRef<Tones | null>(null);
  const [best, setBest] = useState<MiniBest | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    tonesRef.current = new Tones({ master: settings.masterVolume, sfx: settings.sfxVolume, muted: settings.muted });
    return () => tonesRef.current?.close();
  }, [settings.masterVolume, settings.sfxVolume, settings.muted]);

  useEffect(() => {
    if (!activeProfile) return;
    void loadProgress<MiniBest>(gameId, activeProfile.id).then((b) => setBest(b ?? { stars: 0, plays: 0 }));
    // Once per player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, activeProfile?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const unlock = useCallback(
    async (ids: string[]) => {
      const p = profileRef.current;
      if (!p) return;
      const fresh = [...new Set(ids)].filter((id) => !p.achievements.includes(id) && ACHIEVEMENTS.some((a) => a.id === id));
      const recent = [{ gameId, at: Date.now() }, ...p.recent.filter((r) => r.gameId !== gameId)].slice(0, 10);
      const next = { ...p, achievements: [...p.achievements, ...fresh], recent };
      profileRef.current = next;
      await updateProfile(next);
      if (fresh.length) {
        const a = ACHIEVEMENTS.find((x) => x.id === fresh[0])!;
        setToast(`New badge: ${a.emoji} ${a.title}!`);
      }
    },
    [gameId, updateProfile],
  );

  const start = useCallback(() => unlock(['first-adventure']), [unlock]);

  /** Save a finished round, keeping the best result, and unlock badges. */
  const finish = useCallback(
    async (stars: number, extra: Record<string, unknown> = {}, badges: string[] = []) => {
      const p = profileRef.current;
      if (!p) return;
      const prev = (await loadProgress<MiniBest>(gameId, p.id)) ?? { stars: 0, plays: 0 };
      const next: MiniBest = { ...prev, ...extra, stars: Math.max(prev.stars, stars), plays: prev.plays + 1 };
      await saveProgress(gameId, p.id, next);
      setBest(next);
      await unlock(badges);
    },
    [gameId, unlock],
  );

  const play = useCallback((t: Tone) => tonesRef.current?.play(t), []);

  const reducedMotion =
    !!activeProfile?.accessibility.reducedMotion ||
    (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  return { profile: activeProfile, settings, best, start, finish, play, toast, reducedMotion };
}

/** Full-screen frame used by every mini-game. */
export function MiniGameFrame({ title, children, toast, onBack }: { title: string; children: ReactNode; toast?: string; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[#2b2a6b] to-navy text-white">
      <div className="flex items-center gap-2 px-2 py-2 sm:px-4">
        <button type="button" className="btn btn-ghost min-h-12 text-white" onClick={onBack ?? (() => navigate('/'))}>
          ← <span className="hidden sm:inline">Arcade</span>
        </button>
        <h1 className="flex-1 truncate text-center text-xl font-bold sm:text-2xl">{title}</h1>
        <span className="w-12" aria-hidden="true" />
      </div>
      <main className="flex flex-1 flex-col">{children}</main>
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-sun px-5 py-3 text-lg font-bold text-navy shadow-lg" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export function StarRow({ n, of = 3, label }: { n: number; of?: number; label?: string }) {
  return (
    <span aria-label={label ?? `${n} of ${of} stars`} role="img" className="text-3xl tracking-wider">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} aria-hidden="true" className={i < n ? 'text-sun' : 'opacity-30'}>★</span>
      ))}
    </span>
  );
}

const CHEERS = ['Amazing!', 'You did it!', 'Super job!', 'Brilliant!', 'Fantastic!'];

/** End-of-round card: always positive, with the stars earned and what to do next. */
export function ResultCard({
  stars,
  details,
  onAgain,
  extra,
  seed = 0,
}: {
  stars: number;
  details?: ReactNode;
  onAgain: () => void;
  extra?: ReactNode;
  seed?: number;
}) {
  const navigate = useNavigate();
  return (
    <section className="card m-4 flex flex-col items-center gap-4 self-center p-6 text-center text-[var(--text)] sm:w-[28rem]" aria-labelledby="result-title">
      <h2 id="result-title" className="text-3xl font-bold">{CHEERS[Math.abs(seed) % CHEERS.length]}</h2>
      <StarRow n={stars} label={`You earned ${stars} of 3 stars`} />
      {details}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-sun min-h-14 text-xl" onClick={onAgain} autoFocus>🔄 Play again</button>
        {extra}
        <button type="button" className="btn btn-ghost min-h-12" onClick={() => navigate('/')}>🏠 Arcade</button>
      </div>
    </section>
  );
}

/** A big choice button used by the learning games. */
export function ChoiceButton({ children, onClick, disabled, state, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; state?: 'right' | 'wrong'; label?: string }) {
  const color = state === 'right' ? 'bg-grass text-navy' : state === 'wrong' ? 'bg-white/10 opacity-40' : 'bg-white text-navy hover:scale-105';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex min-h-20 min-w-20 items-center justify-center rounded-3xl px-5 text-4xl font-bold shadow-lg transition ${color}`}
    >
      {children}
    </button>
  );
}

/** Deterministic random numbers, so tests can replay a round. */
export function seededRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
