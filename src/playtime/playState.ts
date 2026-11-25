/**
 * A tiny shared signal between the playtime guard and the game screens.
 * - `held`: the guard stopped play (break, time's up). Games pause and save.
 * - `paused`: the game itself is paused, so time isn't counted.
 */
type Listener = (held: boolean) => void;
const listeners = new Set<Listener>();
let held = false;
let paused = false;

export const playState = {
  isHeld: () => held,
  setHeld(v: boolean) {
    if (held === v) return;
    held = v;
    listeners.forEach((l) => l(v));
  },
  onHeld(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  isPaused: () => paused,
  setPaused(v: boolean) {
    paused = v;
  },
  reset() {
    held = false;
    paused = false;
  },
};
