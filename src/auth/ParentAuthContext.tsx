import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { verifyPin, type VerifyResult } from './pin';

/** Parent session lives in memory only: a refresh or 10 idle minutes locks the Parent Zone again. */
export const PARENT_IDLE_TIMEOUT_MS = 10 * 60_000;

interface ParentAuthValue {
  unlocked: boolean;
  unlock: (pin: string) => Promise<VerifyResult>;
  /** Mark as unlocked after a flow that already verified the parent (setup, recovery). */
  grant: () => void;
  lock: () => void;
}

const Ctx = createContext<ParentAuthValue | null>(null);

export function ParentAuthProvider({ children, idleTimeoutMs = PARENT_IDLE_TIMEOUT_MS }: { children: ReactNode; idleTimeoutMs?: number }) {
  const [unlocked, setUnlocked] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const lock = useCallback(() => {
    window.clearTimeout(timer.current);
    setUnlocked(false);
  }, []);

  const arm = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setUnlocked(false), idleTimeoutMs);
  }, [idleTimeoutMs]);

  const grant = useCallback(() => {
    setUnlocked(true);
    arm();
  }, [arm]);

  const unlock = useCallback(
    async (pin: string) => {
      const res = await verifyPin(pin);
      if (res.ok) grant();
      return res;
    },
    [grant],
  );

  useEffect(() => {
    if (!unlocked) return;
    const onActivity = () => arm();
    const events = ['pointerdown', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, onActivity));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [unlocked, arm]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ unlocked, unlock, grant, lock }), [unlocked, unlock, grant, lock]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useParentAuth(): ParentAuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useParentAuth must be used inside ParentAuthProvider');
  return v;
}
