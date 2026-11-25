import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChildProfile, AppSettings } from '../../data/types';
import type { GameContext, GameInstance, GameModule, GameResult } from '../types';
import { playState } from '../../playtime/playState';
import { GameInput } from './input';
import { TouchControls, isTouchDevice } from './TouchControls';

export interface GameHostProps {
  title: string;
  load: () => Promise<GameModule>;
  options: Record<string, unknown>;
  profile: ChildProfile;
  settings: AppSettings;
  actionLabel?: string;
  onComplete: (result: GameResult) => void;
  onEvent?: GameContext['onEvent'];
  /** Called when the player leaves; gets the game's save data when it has some. */
  onExit: (save: unknown) => void;
  /** Extra pause-menu choices, such as "Change world". */
  menuExtras?: { label: string; onSelect: (save: unknown) => void }[];
}

type Status = 'loading' | 'playing' | 'paused' | 'error';

/**
 * Shared host for original games: lazy-loads the game code, gives it input,
 * and owns the pause menu, full screen and on-screen touch controls.
 * The game is destroyed on unmount so nothing keeps running.
 */
export function GameHost(props: GameHostProps) {
  const { title, load, options, profile, settings, actionLabel } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<GameInstance | null>(null);
  const inputRef = useRef<GameInput | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [input, setInput] = useState<GameInput | null>(null);
  const [touch] = useState(isTouchDevice);
  const [padMsg, setPadMsg] = useState('');
  const statusRef = useRef<Status>('loading');
  statusRef.current = status;
  const cb = useRef(props);
  cb.current = props;

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    instRef.current?.pause();
    setStatus('paused');
  }, []);
  const resume = useCallback(() => {
    // Break or time's up: the playtime screen decides when play goes on.
    if (playState.isHeld()) return;
    instRef.current?.resume();
    setStatus('playing');
    mountRef.current?.focus();
  }, []);

  useEffect(() => {
    let disposed = false;
    const gi = new GameInput(window);
    gi.onPad = (s) => {
      setPadMsg(s === 'connected' ? 'Controller connected 🎮' : 'Controller disconnected');
      if (s === 'disconnected') pause();
    };
    inputRef.current = gi;
    setInput(gi);
    const ctx: GameContext = {
      profileId: profile.id,
      difficulty: profile.difficulty,
      reducedMotion: profile.accessibility.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      volume: { master: settings.masterVolume, music: settings.musicVolume, sfx: settings.sfxVolume, muted: settings.muted },
      input: gi,
      options,
      onComplete: (r) => {
        gi.enabled = false;
        cb.current.onComplete(r);
      },
      onPauseRequest: pause,
      onEvent: (e) => cb.current.onEvent?.(e),
    };
    load()
      .then((mod) => (disposed ? null : mod.mount(mountRef.current!, ctx)))
      .then((inst) => {
        if (!inst) return;
        if (disposed) {
          inst.destroy();
          return;
        }
        instRef.current = inst;
        inst.start();
        setStatus('playing');
      })
      .catch((err) => {
        console.error(err);
        if (!disposed) setStatus('error');
      });
    return () => {
      disposed = true;
      instRef.current?.destroy();
      instRef.current = null;
      gi.dispose();
    };
    // Mount once per game session; options are fixed for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Time isn't counted while paused; the playtime guard can pause us.
  useEffect(() => playState.setPaused(status !== 'playing'), [status]);
  useEffect(() => playState.onHeld((held) => held && pause()), [pause]);

  useEffect(() => {
    const onVis = () => document.hidden && pause();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pause]);

  useEffect(() => {
    if (!padMsg) return;
    const t = setTimeout(() => setPadMsg(''), 2500);
    return () => clearTimeout(t);
  }, [padMsg]);

  // While the menu is open, Escape resumes.
  useEffect(() => {
    if (status !== 'paused') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && resume();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, resume]);

  const saveData = async () => {
    try {
      return (await instRef.current?.save()) ?? null;
    } catch {
      return null;
    }
  };
  const exit = async () => cb.current.onExit(await saveData());
  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div ref={wrapRef} className="fixed inset-0 z-40 flex flex-col bg-navy text-white">
      <div className="flex items-center gap-2 px-2 py-2">
        <button type="button" className="btn btn-ghost min-h-12 text-white" onClick={pause} aria-label="Pause">
          ⏸ <span className="hidden sm:inline">Pause</span>
        </button>
        <h1 className="flex-1 truncate text-center text-lg font-bold">{title}</h1>
        <button type="button" className="btn btn-ghost min-h-12 text-white" onClick={fullscreen} aria-label="Full screen">
          ⛶
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div ref={mountRef} tabIndex={-1} className="absolute inset-0 outline-none" data-testid="game-canvas" />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold" role="status">
            Getting ready… 🌈
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center" role="alert">
            <p className="text-2xl font-bold">Oops, the game couldn't start.</p>
            <button type="button" className="btn btn-sun" onClick={() => cb.current.onExit(null)}>Back</button>
          </div>
        )}
        {status === 'playing' && touch && input && (
          <TouchControls input={input} large={profile.accessibility.largeControls} leftHanded={profile.accessibility.leftHanded} actionLabel={actionLabel} />
        )}
        {status === 'playing' && touch && (
          <p className="pointer-events-none absolute inset-x-0 top-3 hidden text-center text-sm font-bold opacity-80 portrait:block">
            Tip: turn your screen sideways for a bigger game 🔄
          </p>
        )}
        {padMsg && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 font-bold" role="status">{padMsg}</div>
        )}
        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy/75 p-4" role="dialog" aria-modal="true" aria-label="Paused">
            <div className="card flex w-[min(92vw,22rem)] flex-col gap-3 p-6 text-[var(--text)]">
              <h2 className="text-center text-3xl font-bold">Paused</h2>
              <button type="button" className="btn btn-sun min-h-14 text-xl" onClick={resume} autoFocus>▶ Keep playing</button>
              <button
                type="button"
                className="btn btn-ghost min-h-12"
                onClick={() => {
                  instRef.current?.restart();
                  setStatus('playing');
                }}
              >
                🔄 Start level again
              </button>
              {props.menuExtras?.map((m) => (
                <button key={m.label} type="button" className="btn btn-ghost min-h-12" onClick={async () => m.onSelect(await saveData())}>
                  {m.label}
                </button>
              ))}
              <button type="button" className="btn btn-ghost min-h-12" onClick={() => void exit()}>🏠 Back to the arcade</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
