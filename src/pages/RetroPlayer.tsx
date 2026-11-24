import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useParentAuth } from '../auth/ParentAuthContext';
import { Dialog } from '../components/Dialog';
import { AUTO_SLOT, SAVE_SLOTS, type RetroGame, type SaveState } from '../data/types';
import { EmulatorBridge, PLAYER_URL, type EmulatorEvent } from '../retro/emulatorBridge';
import { getRomBytes, listSaves, markTested, readSave, retroGamesFor, writeSave } from '../retro/store';
import { useApp } from '../state/AppContext';
import { ParentGate } from './parent/ParentGate';

const AUTOSAVE_MS = 60_000;

type Status = 'loading' | 'playing' | 'paused' | 'error';

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 bg-navy px-2 py-2 text-white sm:gap-2">{children}</div>;
}

function ToolButton({ label, icon, onClick, pressed }: { label: string; icon: string; onClick: () => void; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="flex h-12 min-w-11 shrink-0 items-center justify-center gap-1 rounded-2xl bg-white/10 px-2 text-xl font-bold hover:bg-white/20 sm:px-3"
    >
      <span aria-hidden="true">{icon}</span>
      <span className="hidden text-base sm:inline">{label}</span>
    </button>
  );
}

export function RetroPlayer({ romId }: { romId: string }) {
  const [params] = useSearchParams();
  const testMode = params.get('test') === '1';
  const { unlocked } = useParentAuth();
  const { retroGames, activeProfile, settings, refreshRetro, updateProfile } = useApp();
  const navigate = useNavigate();
  const game = retroGames.find((g) => g.id === romId);
  const allowed = !!game && (testMode ? unlocked : retroGamesFor(activeProfile, retroGames).some((g) => g.id === romId));

  if (testMode && !unlocked) {
    return (
      <div className="min-h-dvh p-4">
        <ParentGate />
      </div>
    );
  }
  if (!game || !allowed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-2xl font-bold">This game isn't available.</p>
        <Link to="/" className="btn btn-sun">Back to the arcade</Link>
      </div>
    );
  }
  // Tests run under a separate "parent" save owner so they never touch a child's saves.
  const owner = testMode ? 'parent-test' : activeProfile!.id;
  return (
    <Console
      key={game.id}
      game={game}
      owner={owner}
      testMode={testMode}
      volume={settings.masterVolume * settings.sfxVolume}
      muted={settings.muted}
      onStarted={async () => {
        if (testMode) {
          await markTested(game.id);
          await refreshRetro();
        } else if (activeProfile) {
          const id = `rom:${game.id}`;
          const recent = [{ gameId: id, at: Date.now() }, ...activeProfile.recent.filter((r) => r.gameId !== id)].slice(0, 10);
          await updateProfile({ ...activeProfile, recent });
        }
      }}
      onExit={() => navigate(testMode ? '/parent/retro' : '/retro')}
    />
  );
}

interface ConsoleProps {
  game: RetroGame;
  owner: string;
  testMode: boolean;
  volume: number;
  muted: boolean;
  onStarted: () => void | Promise<void>;
  onExit: () => void;
}

function Console({ game, owner, testMode, volume, muted: mutedSetting, onStarted, onExit }: ConsoleProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<EmulatorBridge | null>(null);
  const statusRef = useRef<Status>('loading');
  const [status, setStatusState] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(mutedSetting);
  const [dialog, setDialog] = useState<null | 'save' | 'load' | 'exit' | 'restart'>(null);
  const [saves, setSaves] = useState<SaveState[]>([]);
  const startedCb = useRef(onStarted);
  startedCb.current = onStarted;

  const setStatus = (s: Status) => {
    statusRef.current = s;
    setStatusState(s);
  };
  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500);
  };
  const focusGame = () => frameRef.current?.contentWindow?.focus();

  const autosave = useCallback(async () => {
    const b = bridgeRef.current;
    if (!b || statusRef.current === 'loading' || statusRef.current === 'error') return;
    try {
      await writeSave(game.id, owner, AUTO_SLOT, await b.saveState());
    } catch {
      /* the next autosave will try again */
    }
  }, [game.id, owner]);

  // Boot the emulator and wire up events.
  useEffect(() => {
    const frame = frameRef.current!;
    let disposed = false;
    const onEvent = async (e: EmulatorEvent) => {
      if (disposed) return;
      if (e.type === 'ready') {
        const [rom, auto] = await Promise.all([getRomBytes(game.id), readSave(game.id, owner, AUTO_SLOT)]);
        if (!rom) {
          setStatus('error');
          setError('The game file is missing. Ask a grown-up to add it again.');
          return;
        }
        const romCopy = rom.slice(0);
        const state = auto?.data.slice(0);
        bridge.send({ type: 'init', system: game.system, rom: romCopy, state, volume, muted: mutedSetting }, state ? [romCopy, state] : [romCopy]);
        if (auto) say('Welcome back! We kept your spot. ⭐');
      } else if (e.type === 'started') {
        setStatus('playing');
        focusGame();
        void startedCb.current();
      } else if (e.type === 'error' && statusRef.current === 'loading') {
        setStatus('error');
        setError("The game didn't start. It may not be a working game file.");
      }
    };
    const bridge = new EmulatorBridge(frame, (e) => void onEvent(e));
    bridgeRef.current = bridge;
    return () => {
      disposed = true;
      bridge.dispose();
      bridgeRef.current = null;
    };
  }, [game.id, owner]);

  // Autosave while playing, and pause + save when the app goes to the background.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (statusRef.current === 'playing') void autosave();
    }, AUTOSAVE_MS);
    const onVis = () => {
      if (document.hidden && statusRef.current === 'playing') {
        bridgeRef.current?.send({ type: 'pause' });
        setStatus('paused');
        void autosave();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [autosave]);

  const pauseToggle = () => {
    if (status === 'playing') {
      bridgeRef.current?.send({ type: 'pause' });
      setStatus('paused');
    } else if (status === 'paused') {
      bridgeRef.current?.send({ type: 'resume' });
      setStatus('playing');
      focusGame();
    }
  };

  const openDialog = async (d: 'save' | 'load' | 'exit' | 'restart') => {
    if (status === 'playing') {
      bridgeRef.current?.send({ type: 'pause' });
      setStatus('paused');
    }
    if (d === 'save' || d === 'load') setSaves(await listSaves(game.id, owner));
    setDialog(d);
  };
  const closeDialog = () => {
    setDialog(null);
    if (statusRef.current === 'paused') {
      bridgeRef.current?.send({ type: 'resume' });
      setStatus('playing');
    }
    focusGame();
  };

  const saveTo = async (slot: number) => {
    try {
      await writeSave(game.id, owner, slot, await bridgeRef.current!.saveState());
      say(`Saved in slot ${slot}! 💾`);
    } catch {
      say("Couldn't save right now.");
    }
    closeDialog();
  };
  const loadFrom = async (s: SaveState) => {
    try {
      await bridgeRef.current!.loadState(s.data);
      say(`Loaded slot ${s.slot}! 📂`);
    } catch {
      say("Couldn't load that save.");
    }
    closeDialog();
  };
  const exit = async () => {
    await autosave();
    onExit();
  };
  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => say('Fullscreen is not available here.'));
    focusGame();
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    bridgeRef.current?.send({ type: 'setVolume', volume, muted: next });
    focusGame();
  };

  const slotLabel = (slot: number) => {
    const s = saves.find((x) => x.slot === slot);
    return s ? new Date(s.savedAt).toLocaleString() : 'Empty';
  };

  return (
    <div ref={wrapRef} className="fixed inset-0 flex flex-col bg-black" data-testid="retro-console">
      <Toolbar>
        <ToolButton label="Exit" icon="⬅" onClick={() => void openDialog('exit')} />
        <span className="mx-1 min-w-0 flex-1 truncate font-bold">{testMode ? `Testing: ${game.title}` : game.title}</span>
        <ToolButton label={status === 'paused' ? 'Play' : 'Pause'} icon={status === 'paused' ? '▶' : '⏸'} onClick={pauseToggle} />
        <ToolButton label="Restart" icon="🔄" onClick={() => void openDialog('restart')} />
        <ToolButton label="Save" icon="💾" onClick={() => void openDialog('save')} />
        <ToolButton label="Load" icon="📂" onClick={() => void openDialog('load')} />
        <ToolButton label={muted ? 'Sound on' : 'Mute'} icon={muted ? '🔇' : '🔊'} onClick={toggleMute} pressed={muted} />
        <ToolButton label="Full screen" icon="⛶" onClick={fullscreen} />
      </Toolbar>
      <div className="relative flex-1">
        <iframe
          ref={frameRef}
          src={PLAYER_URL}
          title={`${game.title} game screen`}
          allow="fullscreen; gamepad; autoplay"
          className="absolute inset-0 h-full w-full border-0"
        />
        {status === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-bold text-white" role="status">
            Loading the console… 🕹️
          </div>
        )}
        {status === 'paused' && !dialog && (
          <button type="button" onClick={pauseToggle} className="absolute inset-0 flex items-center justify-center bg-black/60 text-3xl font-bold text-white">
            ▶ Tap to keep playing
          </button>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-navy p-6 text-center text-white" role="alert">
            <p className="text-2xl font-bold">Oops! {error}</p>
            <button className="btn btn-sun" onClick={onExit}>Back</button>
          </div>
        )}
        {toast && (
          <div role="status" className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-sun px-5 py-2 font-bold text-navy shadow">
            {toast}
          </div>
        )}
      </div>

      <Dialog open={dialog === 'exit'} title="Leave the game?" onClose={closeDialog}>
        <p className="mb-4">Don't worry, we'll keep your spot for next time.</p>
        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={closeDialog}>Keep playing</button>
          <button className="btn btn-sun" onClick={() => void exit()}>Leave</button>
        </div>
      </Dialog>
      <Dialog open={dialog === 'restart'} title="Start over?" onClose={closeDialog}>
        <p className="mb-4">The game will start again from the beginning. Your save slots stay safe.</p>
        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={closeDialog}>No</button>
          <button className="btn btn-primary" onClick={() => { bridgeRef.current?.send({ type: 'restart' }); closeDialog(); }}>Start over</button>
        </div>
      </Dialog>
      <Dialog open={dialog === 'save' || dialog === 'load'} title={dialog === 'save' ? 'Save your spot' : 'Load a saved spot'} onClose={closeDialog}>
        <div className="flex flex-col gap-2">
          {SAVE_SLOTS.map((slot) => {
            const s = saves.find((x) => x.slot === slot);
            return (
              <button
                key={slot}
                type="button"
                className="btn btn-ghost justify-between"
                disabled={dialog === 'load' && !s}
                onClick={() => void (dialog === 'save' ? saveTo(slot) : s && loadFrom(s))}
              >
                <span>Slot {slot}</span>
                <span className="text-sm font-normal">{slotLabel(slot)}</span>
              </button>
            );
          })}
          <button className="btn btn-ghost mt-2" onClick={closeDialog}>Cancel</button>
        </div>
      </Dialog>
    </div>
  );
}
