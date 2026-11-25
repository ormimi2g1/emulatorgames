import { useEffect, useRef } from 'react';
import type { GameButton, GameInput } from './input';

function Pad({ input, button, label, icon, size }: { input: GameInput; button: GameButton; label: string; icon: string; size: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const active = new Set<number>();
    const down = (e: PointerEvent) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      active.add(e.pointerId);
      input.setTouch(button, true);
      el.dataset.down = '1';
      navigator.vibrate?.(8);
    };
    const up = (e: PointerEvent) => {
      active.delete(e.pointerId);
      if (active.size === 0) {
        input.setTouch(button, false);
        delete el.dataset.down;
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up);
      input.setTouch(button, false);
    };
  }, [input, button]);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className="pointer-events-auto flex select-none items-center justify-center rounded-full border-4 border-white/70 bg-white/25 text-3xl font-bold text-white shadow-lg backdrop-blur-sm data-[down]:bg-white/50"
      style={{ width: size, height: size, touchAction: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

/** On-screen controls for touch screens. Multi-touch: move and jump at the same time. */
export function TouchControls({ input, large, leftHanded, actionLabel = 'Special', steeringOnly }: { input: GameInput; large?: boolean; leftHanded?: boolean; actionLabel?: string; steeringOnly?: boolean }) {
  const size = large ? 92 : 72;
  const move = (
    <div className="flex gap-3">
      <Pad input={input} button="left" label="Move left" icon="◀" size={size} />
      <Pad input={input} button="right" label="Move right" icon="▶" size={size} />
    </div>
  );
  if (steeringOnly) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] opacity-90" data-testid="touch-controls">
        <Pad input={input} button="left" label="Steer left" icon="◀" size={Math.round(size * 1.15)} />
        <Pad input={input} button="right" label="Steer right" icon="▶" size={Math.round(size * 1.15)} />
      </div>
    );
  }
  const act = (
    <div className="flex items-end gap-3">
      <Pad input={input} button="action" label={actionLabel} icon="✨" size={Math.round(size * 0.85)} />
      <Pad input={input} button="jump" label="Jump" icon="⤒" size={Math.round(size * 1.15)} />
    </div>
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] opacity-90" data-testid="touch-controls">
      {leftHanded ? act : move}
      {leftHanded ? move : act}
    </div>
  );
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
}
