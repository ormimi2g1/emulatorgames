/**
 * Shared game input: keyboard, gamepads (Gamepad API) and on-screen touch buttons
 * all feed one state that games read every frame.
 */
import { DEFAULT_CONTROLS, type ControlSettings } from '../../data/types';

export type GameButton = 'left' | 'right' | 'up' | 'down' | 'jump' | 'action' | 'pause';

/** Fixed keys. The parent's chosen jump, action and pause keys are added on top. */
const BASE_KEYS: Record<string, GameButton> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
  KeyZ: 'jump',
  KeyX: 'action',
  ShiftLeft: 'action',
  Escape: 'pause',
  Enter: 'pause',
  KeyP: 'pause',
};

let controls: ControlSettings = DEFAULT_CONTROLS;
let keymap: Record<string, GameButton> = buildKeymap(DEFAULT_CONTROLS);

function buildKeymap(c: ControlSettings): Record<string, GameButton> {
  // Escape always pauses, so a child can always stop.
  return { ...BASE_KEYS, [c.keys.jump]: 'jump', [c.keys.action]: 'action', [c.keys.pause]: 'pause', Escape: 'pause' };
}

/** Apply the Parent Zone's control settings to every game. */
export function setControls(c: ControlSettings) {
  controls = c;
  keymap = buildKeymap(c);
}

export function getControls(): ControlSettings {
  return controls;
}

/** Which game button a gamepad button index triggers. */
export function padButton(index: number, c: ControlSettings = controls): GameButton | null {
  if (index === c.pad.jump) return 'jump';
  if (index === c.pad.action) return 'action';
  if (index === c.pad.pause) return 'pause';
  if (index === 12) return 'up';
  if (index === 13) return 'down';
  if (index === 14) return 'left';
  if (index === 15) return 'right';
  // Spare face buttons also do the special move.
  if (index >= 0 && index <= 3) return 'action';
  return null;
}

export function keyButton(code: string): GameButton | undefined {
  return keymap[code];
}

export type PadStatus = 'connected' | 'disconnected';

export class GameInput {
  private keys = new Set<GameButton>();
  private touch = new Set<GameButton>();
  private pad = new Set<GameButton>();
  private prev = new Set<GameButton>();
  private now = new Set<GameButton>();
  /** Presses since the last frame, so a quick tap between two frames is never lost. */
  private tapped = new Set<GameButton>();
  private target: Window;
  enabled = true;
  onPad?: (status: PadStatus, name: string) => void;

  constructor(target: Window = window) {
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.clearAll);
    target.addEventListener('gamepadconnected', this.onPadConnected);
    target.addEventListener('gamepaddisconnected', this.onPadDisconnected);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const b = keymap[e.code];
    if (!b || !this.enabled) return;
    // Keep game keys from scrolling the page while playing.
    e.preventDefault();
    this.keys.add(b);
    this.tapped.add(b);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const b = keymap[e.code];
    if (b) this.keys.delete(b);
  };
  private clearAll = () => {
    this.keys.clear();
    this.touch.clear();
    this.tapped.clear();
  };
  private onPadConnected = (e: GamepadEvent) => this.onPad?.('connected', e.gamepad.id);
  private onPadDisconnected = (e: GamepadEvent) => this.onPad?.('disconnected', e.gamepad.id);

  setTouch(b: GameButton, down: boolean) {
    if (down) {
      this.touch.add(b);
      this.tapped.add(b);
    }
    else this.touch.delete(b);
  }

  private pollPads() {
    this.pad.clear();
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] ?? 0;
      const ay = p.axes[1] ?? 0;
      if (ax < -0.4) this.pad.add('left');
      if (ax > 0.4) this.pad.add('right');
      if (ay < -0.5) this.pad.add('up');
      if (ay > 0.5) this.pad.add('down');
      p.buttons.forEach((btn, i) => {
        const b = btn?.pressed ? padButton(i) : null;
        if (b) this.pad.add(b);
      });
    }
  }

  /** Call once per frame before reading. */
  update() {
    this.pollPads();
    this.prev = this.now;
    this.now = new Set([...this.keys, ...this.touch, ...this.pad, ...this.tapped]);
    this.tapped.clear();
  }

  isDown(b: GameButton): boolean {
    return this.enabled && this.now.has(b);
  }

  justPressed(b: GameButton): boolean {
    return this.enabled && this.now.has(b) && !this.prev.has(b);
  }

  dispose() {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.clearAll);
    this.target.removeEventListener('gamepadconnected', this.onPadConnected);
    this.target.removeEventListener('gamepaddisconnected', this.onPadDisconnected);
    this.clearAll();
  }
}
