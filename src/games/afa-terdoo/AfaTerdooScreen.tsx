import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACHIEVEMENTS } from '../../data/achievements';
import { loadProgress, saveProgress } from '../../data/progress';
import { useApp } from '../../state/AppContext';
import { GameHost } from '../shared/GameHost';
import type { GameModule, GameResult } from '../types';
import { LEVELS } from './levels';
import {
  CHEERS,
  DIFFICULTY_RULES,
  EMPTY_PROGRESS,
  HERO_STATS,
  formatTime,
  isUnlocked,
  pick,
  progressAchievements,
  rateLevel,
  recordFinish,
  recordStart,
  type AfaProgress,
  type FinishInput,
  type HeroId,
  type ResumePoint,
} from './rules';

export const GAME_ID = 'afa-terdoo';
const loadGame = (): Promise<GameModule> => import('./index').then((m) => m.default);

type Screen =
  | { name: 'heroes' }
  | { name: 'worlds'; hero: HeroId }
  | { name: 'playing'; hero: HeroId; levelId: string; resume?: ResumePoint; run: number }
  | { name: 'results'; hero: HeroId; result: FinishInput; rating: number; newBest: boolean };

function HeroPicture({ hero, size = 96 }: { hero: HeroId; size?: number }) {
  const afa = hero === 'afa';
  const shirt = afa ? '#7357ff' : '#ff686b';
  return (
    <svg viewBox="0 0 60 80" width={size} height={size * 1.33} aria-hidden="true">
      {afa && <circle cx="16" cy="14" r="8" fill="#1f130d" />}
      {afa && <circle cx="44" cy="14" r="8" fill="#1f130d" />}
      <circle cx="30" cy="24" r={afa ? 15 : 17} fill={afa ? '#8b5a3c' : '#7a4b2f'} />
      <path d={afa ? 'M15 20 Q30 4 45 20' : 'M13 20 Q30 2 47 20'} fill="#1f130d" />
      <circle cx="24" cy="25" r="2.5" fill="#14123a" />
      <circle cx="36" cy="25" r="2.5" fill="#14123a" />
      <path d="M24 31 Q30 36 36 31" stroke="#14123a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x={afa ? 18 : 16} y="40" width={afa ? 24 : 28} height={afa ? 24 : 20} rx="8" fill={shirt} />
      <rect x="20" y={afa ? 62 : 58} width="8" height={afa ? 14 : 12} rx="3" fill="#14123a" />
      <rect x="32" y={afa ? 62 : 58} width="8" height={afa ? 14 : 12} rx="3" fill="#14123a" />
    </svg>
  );
}

function Stars({ n, of = 3, label }: { n: number; of?: number; label?: string }) {
  return (
    <span aria-label={label ?? `${n} of ${of} stars`} className="text-2xl tracking-wider">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} aria-hidden="true" className={i < n ? 'text-sun' : 'opacity-30'}>★</span>
      ))}
    </span>
  );
}

export function AfaTerdooScreen() {
  const { activeProfile, settings, updateProfile } = useApp();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<AfaProgress | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'heroes' });
  const [toast, setToast] = useState('');
  const profileRef = useRef(activeProfile);
  profileRef.current = activeProfile;
  const progressRef = useRef<AfaProgress>(EMPTY_PROGRESS);
  const testHooks = new URLSearchParams(window.location.search).get('testhooks') === '1';

  useEffect(() => {
    if (!activeProfile) return;
    void loadProgress<AfaProgress>(GAME_ID, activeProfile.id).then((p) => {
      const loaded = p ?? EMPTY_PROGRESS;
      progressRef.current = loaded;
      setProgress(loaded);
    });
    // Load once per player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const persist = useCallback(async (next: AfaProgress) => {
    const p = profileRef.current;
    progressRef.current = next;
    setProgress(next);
    if (p) await saveProgress(GAME_ID, p.id, next);
  }, []);

  const unlock = useCallback(
    async (ids: string[]) => {
      const p = profileRef.current;
      if (!p) return;
      const fresh = [...new Set(ids)].filter((id) => !p.achievements.includes(id) && ACHIEVEMENTS.some((a) => a.id === id));
      const recent = [{ gameId: GAME_ID, at: Date.now() }, ...p.recent.filter((r) => r.gameId !== GAME_ID)].slice(0, 10);
      const next = { ...p, achievements: [...p.achievements, ...fresh], recent };
      profileRef.current = next;
      await updateProfile(next);
      if (fresh.length) {
        const a = ACHIEVEMENTS.find((x) => x.id === fresh[0])!;
        setToast(`New badge: ${a.emoji} ${a.title}!`);
      }
    },
    [updateProfile],
  );

  if (!activeProfile) return null;
  if (!progress) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-2xl font-bold" role="status">
        Loading… 🌈
      </div>
    );
  }

  const play = async (hero: HeroId, levelId: string, resume?: ResumePoint) => {
    const next = recordStart(progressRef.current, levelId, hero);
    await persist(next);
    await unlock(progressAchievements(next));
    setScreen({ name: 'playing', hero, levelId, resume, run: Date.now() });
  };

  const toastEl = toast && (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-sun px-5 py-3 text-lg font-bold text-navy shadow-lg" role="status">
      {toast}
    </div>
  );

  if (screen.name === 'playing') {
    const level = LEVELS.find((l) => l.id === screen.levelId)!;
    const stats = HERO_STATS[screen.hero];
    const saveResume = async (save: unknown) => {
      if (save) await persist({ ...progressRef.current, resume: save as ResumePoint });
    };
    return (
      <>
        <GameHost
          key={screen.run}
          title={`${level.name} · ${stats.name}`}
          load={loadGame}
          options={{ levelId: screen.levelId, hero: screen.hero, resume: screen.resume, testHooks }}
          profile={activeProfile}
          settings={settings}
          actionLabel={stats.specialLabel}
          onEvent={(e) => {
            if (e.type === 'checkpoint') void persist({ ...progressRef.current, resume: e.resume as ResumePoint });
          }}
          onComplete={async (r: GameResult) => {
            const result = r as unknown as FinishInput & { achievements: string[] };
            const prev = progressRef.current.levels[result.levelId];
            const rating = rateLevel(result);
            const next = recordFinish(progressRef.current, result);
            await persist(next);
            await unlock([...result.achievements, ...progressAchievements(next)]);
            setScreen({ name: 'results', hero: screen.hero, result, rating, newBest: !prev || rating > prev.rating });
          }}
          onExit={async (save) => {
            await saveResume(save);
            navigate('/');
          }}
          menuExtras={[
            {
              label: '🗺️ Pick another world',
              onSelect: async (save) => {
                await saveResume(save);
                setScreen({ name: 'worlds', hero: screen.hero });
              },
            },
          ]}
        />
        {toastEl}
      </>
    );
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-dvh bg-gradient-to-b from-[#2b2a6b] to-navy p-4 text-white sm:p-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn btn-ghost min-h-12 text-white" onClick={() => navigate('/')}>← Arcade</button>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
            {activeProfile.nickname} · {DIFFICULTY_LABEL[activeProfile.difficulty]}
          </span>
        </div>
        {children}
      </div>
      {toastEl}
    </div>
  );

  if (screen.name === 'heroes') {
    const resume = progress.resume;
    const resumeLevel = resume && LEVELS.find((l) => l.id === resume.levelId);
    return shell(
      <>
        <header className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Afa &amp; Terdoo</h1>
          <p className="text-lg opacity-90">The Lost Rainbow Kingdom</p>
        </header>
        {resume && resumeLevel && (
          <button type="button" className="btn btn-sun min-h-14 self-center text-xl" onClick={() => void play(resume.hero, resume.levelId, resume)}>
            ▶ Continue {resumeLevel.name} with {HERO_STATS[resume.hero].name}
          </button>
        )}
        <h2 className="text-center text-2xl font-bold">Choose your hero</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['afa', 'terdoo'] as HeroId[]).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setScreen({ name: 'worlds', hero: h })}
              className="card flex flex-col items-center gap-2 p-5 text-center text-[var(--text)] transition hover:scale-[1.02] focus-visible:scale-[1.02]"
              aria-label={`Play as ${HERO_STATS[h].name}`}
            >
              <HeroPicture hero={h} />
              <span className="text-2xl font-bold">{HERO_STATS[h].name}</span>
              <span className="muted">{HERO_STATS[h].blurb}</span>
              <span className="rounded-full bg-sun/20 px-3 py-1 text-sm font-bold">Special: {HERO_STATS[h].specialLabel}</span>
            </button>
          ))}
        </div>
        <ControlsHelp />
      </>,
    );
  }

  if (screen.name === 'worlds') {
    return shell(
      <>
        <header className="flex items-center gap-3">
          <HeroPicture hero={screen.hero} size={48} />
          <div>
            <h1 className="text-3xl font-bold">Pick a world</h1>
            <button type="button" className="underline" onClick={() => setScreen({ name: 'heroes' })}>Change hero</button>
          </div>
        </header>
        <ol className="grid gap-4 sm:grid-cols-3">
          {LEVELS.map((l) => {
            const open = isUnlocked(progress, l.id);
            const rec = progress.levels[l.id];
            return (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={!open}
                  onClick={() => void play(screen.hero, l.id)}
                  aria-label={open ? `Play World ${l.world}: ${l.name}` : `World ${l.world}: ${l.name}, locked`}
                  className="card flex h-full w-full flex-col gap-2 p-4 text-left text-[var(--text)] transition enabled:hover:scale-[1.02] disabled:opacity-60"
                >
                  <span
                    className="flex h-24 items-end justify-center rounded-2xl text-4xl"
                    style={{ background: `linear-gradient(#${l.theme.skyTop.toString(16).padStart(6, '0')}, #${l.theme.skyBottom.toString(16).padStart(6, '0')})` }}
                    aria-hidden="true"
                  >
                    {open ? (l.theme.decor === 'flowers' ? '🌼' : l.theme.decor === 'trees' ? '🌳' : '💎') : '🔒'}
                  </span>
                  <span className="text-sm font-bold uppercase opacity-70">World {l.world}</span>
                  <span className="text-xl font-bold">{l.name}</span>
                  <span className="muted text-sm">{open ? l.intro : `Finish World ${l.world - 1} to open.`}</span>
                  {rec && (
                    <span className="flex items-center gap-2">
                      <Stars n={rec.rating} />
                      {rec.crystal && <span aria-label="Rainbow crystal found">💎</span>}
                      {rec.secret && <span aria-label="Secret found">🔍</span>}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </>,
    );
  }

  // Results
  const { result, rating, hero, newBest } = screen;
  const idx = LEVELS.findIndex((l) => l.id === result.levelId);
  const level = LEVELS[idx];
  const nextLevel = LEVELS[idx + 1];
  return shell(
    <section className="card flex flex-col items-center gap-4 p-6 text-center text-[var(--text)]" aria-labelledby="results-title">
      <HeroPicture hero={hero} size={72} />
      <h1 id="results-title" className="text-3xl font-bold">{pick(CHEERS, result.starsCollected + idx)}</h1>
      <p className="text-lg">You finished {level.name}!</p>
      <Stars n={rating} label={`You earned ${rating} of 3 stars`} />
      {newBest && <p className="font-bold text-grass">New best!</p>}
      <ul className="flex flex-wrap justify-center gap-3 text-lg">
        <li className="rounded-full bg-sun/20 px-3 py-1">⭐ {result.starsCollected} of {result.starsTotal} stars</li>
        <li className="rounded-full bg-sun/20 px-3 py-1">{result.crystal ? '💎 Rainbow crystal found' : '💎 Crystal still hiding'}</li>
        {result.secret && <li className="rounded-full bg-sun/20 px-3 py-1">🔍 Secret found</li>}
        {DIFFICULTY_RULES[activeProfile.difficulty].showTimer && <li className="rounded-full bg-sun/20 px-3 py-1">⏱ {formatTime(result.elapsedMs)}</li>}
      </ul>
      <div className="flex flex-wrap justify-center gap-3">
        {nextLevel && (
          <button type="button" className="btn btn-sun min-h-14 text-xl" onClick={() => void play(hero, nextLevel.id)}>
            ▶ Next: {nextLevel.name}
          </button>
        )}
        <button type="button" className="btn btn-ghost min-h-12" onClick={() => void play(hero, level.id)}>🔄 Play again</button>
        <button type="button" className="btn btn-ghost min-h-12" onClick={() => setScreen({ name: 'worlds', hero })}>🗺️ World map</button>
      </div>
      {!nextLevel && <p className="text-lg font-bold">You brought every rainbow crystal home. The kingdom is bright again! 🌈</p>}
    </section>,
  );
}

const DIFFICULTY_LABEL = { 'little-explorer': 'Little Explorer', adventurer: 'Adventurer', 'super-hero': 'Super Hero' } as const;

function ControlsHelp() {
  return (
    <details className="card p-4 text-[var(--text)]">
      <summary className="cursor-pointer text-lg font-bold">How to play</summary>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>Move: arrow keys or A / D. Jump: Space, Z or the up arrow. Special move: X or Shift. Pause: Esc or P.</li>
        <li>On a tablet or phone, use the big buttons on the screen.</li>
        <li>Controllers work too: stick or d-pad to move, A to jump, B to use your special move.</li>
        <li>Bounce on critters to cheer them up. Find the rainbow crystal and the secret place in every world!</li>
      </ul>
    </details>
  );
}
