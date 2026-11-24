/**
 * Shared game input: keyboard, gamepads (Gamepad API) and on-screen touch buttons
 * all feed one state that games read every frame.
 */
export type GameButton = 'left' | 'right' | 'up' | 'down' | 'jump' | 'action' | 'pause';

const KEYMAP: Record<string, GameButton> = {
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
    const b = KEYMAP[e.code];
    if (!b || !this.enabled) return;
    // Keep game keys from scrolling the page while playing.
    e.preventDefault();
    this.keys.add(b);
    this.tapped.add(b);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const b = KEYMAP[e.code];
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
      const pressed = (i: number) => !!p.buttons[i]?.pressed;
      const ax = p.axes[0] ?? 0;
      const ay = p.axes[1] ?? 0;
      if (ax < -0.4 || pressed(14)) this.pad.add('left');
      if (ax > 0.4 || pressed(15)) this.pad.add('right');
      if (ay < -0.5 || pressed(12)) this.pad.add('up');
      if (ay > 0.5 || pressed(13)) this.pad.add('down');
      if (pressed(0)) this.pad.add('jump');
      if (pressed(1) || pressed(2) || pressed(3)) this.pad.add('action');
      if (pressed(9)) this.pad.add('pause');
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
