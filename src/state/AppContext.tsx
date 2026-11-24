import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { hasParentPin } from '../auth/pin';
import { getActiveProfileId, listProfiles, saveProfile, setActiveProfileId, toggleFavorite as toggleFav } from '../data/profiles';
import { loadSettings, saveSettings } from '../data/settings';
import { DEFAULT_SETTINGS, type AppSettings, type ChildProfile } from '../data/types';

interface AppState {
  ready: boolean;
  hasPin: boolean;
  settings: AppSettings;
  profiles: ChildProfile[];
  activeProfile: ChildProfile | null;
  refresh: () => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  updateProfile: (p: ChildProfile) => Promise<void>;
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

  const refresh = useCallback(async () => {
    const [pin, s, ps, a] = await Promise.all([hasParentPin(), loadSettings(), listProfiles(), getActiveProfileId()]);
    setHasPin(pin);
    setSettings(s);
    setProfiles(ps);
    setActiveId(a && ps.some((p) => p.id === a) ? a : null);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeProfile = useMemo(() => profiles.find((p) => p.id === activeId) ?? null, [profiles, activeId]);

  useEffect(() => {
    applyTheme(settings, activeProfile);
  }, [settings, activeProfile]);

  const selectProfile = useCallback(async (id: string | null) => {
    await setActiveProfileId(id);
    setActiveId(id);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch };
      await saveSettings(next);
      setSettings(next);
    },
    [settings],
  );

  const updateProfile = useCallback(async (p: ChildProfile) => {
    await saveProfile(p);
    setProfiles((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]));
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
    () => ({ ready, hasPin, settings, profiles, activeProfile, refresh, selectProfile, updateSettings, updateProfile, toggleFavorite }),
    [ready, hasPin, settings, profiles, activeProfile, refresh, selectProfile, updateSettings, updateProfile, toggleFavorite],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
