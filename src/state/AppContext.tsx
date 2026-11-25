import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { hasParentPin } from '../auth/pin';
import { getActiveProfileId, listProfiles, saveProfile, setActiveProfileId, toggleFavorite as toggleFav } from '../data/profiles';
import { loadSettings, saveSettings } from '../data/settings';
import { DEFAULT_SETTINGS, type AppSettings, type ChildProfile, type RetroGame } from '../data/types';
import { listRetroGames, retroGamesFor } from '../retro/store';
import { retroToGameDef } from '../retro/catalog';
import { visibleGames } from '../games/catalog';
import { setControls } from '../games/shared/input';
import type { GameDefinition } from '../games/types';

interface AppState {
  ready: boolean;
  hasPin: boolean;
  settings: AppSettings;
  profiles: ChildProfile[];
  activeProfile: ChildProfile | null;
  retroGames: RetroGame[];
  refreshRetro: () => Promise<void>;
  refresh: () => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  updateProfile: (p: ChildProfile) => Promise<void>;
  /** Change a player starting from their latest values, so quick changes in a row never undo each other. */
  patchProfile: (id: string, change: (p: ChildProfile) => ChildProfile) => Promise<void>;
  toggleFavorite: (gameId: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

function applyTheme(settings: AppSettings, profile: ChildProfile | null) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
  root.classList.toggle('dark', dark);
  root.classList.toggle('hc', !!profile?.accessibility.highContrast);
  root.classList.toggle('reduce-motion', !!profile?.accessibility.reducedMotion);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [retroGames, setRetroGames] = useState<RetroGame[]>([]);

  const refreshRetro = useCallback(async () => {
    setRetroGames(await listRetroGames());
  }, []);

  // Bumped on every player switch, so a slower reload can't undo a choice made meanwhile.
  const selection = useRef(0);

  const refresh = useCallback(async () => {
    const picked = selection.current;
    const [pin, s, ps, a, rg] = await Promise.all([hasParentPin(), loadSettings(), listProfiles(), getActiveProfileId(), listRetroGames()]);
    setHasPin(pin);
    setRetroGames(rg);
    setSettings(s);
    setProfiles(ps);
    if (selection.current === picked) setActiveId(a && ps.some((p) => p.id === a) ? a : null);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeProfile = useMemo(() => profiles.find((p) => p.id === activeId) ?? null, [profiles, activeId]);

  useEffect(() => setControls(settings.controls), [settings.controls]);

  useEffect(() => {
    applyTheme(settings, activeProfile);
  }, [settings, activeProfile]);

  const selectProfile = useCallback(async (id: string | null) => {
    selection.current++;
    await setActiveProfileId(id);
    setActiveId(id);
  }, []);

  const settingsRef = useRef<AppSettings>(settings);
  settingsRef.current = settings;
  const savingSettings = useRef<Promise<unknown>>(Promise.resolve());
  // Builds on the latest settings and saves in order, so quick changes never undo each other.
  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    const run = savingSettings.current.then(() => saveSettings(next));
    savingSettings.current = run.catch(() => undefined);
    await run;
  }, []);

  const profilesRef = useRef<ChildProfile[]>([]);
  profilesRef.current = profiles;
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  const updateProfile = useCallback(async (p: ChildProfile) => {
    await saveProfile(p);
    setProfiles((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]));
  }, []);

  const patchProfile = useCallback(async (id: string, change: (p: ChildProfile) => ChildProfile) => {
    const current = profilesRef.current.find((x) => x.id === id);
    if (!current) return;
    const next = change(current);
    // Show it at once, and save in order.
    profilesRef.current = profilesRef.current.map((x) => (x.id === id ? next : x));
    setProfiles(profilesRef.current);
    const run = saving.current.then(() => saveProfile(next));
    saving.current = run.catch(() => undefined);
    await run;
  }, []);

  const toggleFavorite = useCallback(
    async (gameId: string) => {
      if (!activeProfile) return;
      const next = await toggleFav(activeProfile.id, gameId);
      if (next) setProfiles((list) => list.map((x) => (x.id === next.id ? next : x)));
    },
    [activeProfile],
  );

  const value = useMemo(
    () => ({ ready, hasPin, settings, profiles, activeProfile, retroGames, refreshRetro, refresh, selectProfile, updateSettings, updateProfile, patchProfile, toggleFavorite }),
    [ready, hasPin, settings, profiles, activeProfile, retroGames, refreshRetro, refresh, selectProfile, updateSettings, updateProfile, patchProfile, toggleFavorite],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}

/** Every game the active player may see: original games plus their retro games. */
export function useArcadeGames(): GameDefinition[] {
  const { activeProfile, settings, retroGames } = useApp();
  return useMemo(
    () => [...visibleGames(activeProfile, settings.disabledGames), ...retroGamesFor(activeProfile, retroGames).map(retroToGameDef)],
    [activeProfile, settings.disabledGames, retroGames],
  );
}
