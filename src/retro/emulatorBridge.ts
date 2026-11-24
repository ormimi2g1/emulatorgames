/** Typed messaging with the sandboxed emulator page (public/emulatorjs/player.html). */
export type EmulatorEvent =
  | { type: 'ready' }
  | { type: 'loaded' }
  | { type: 'started' }
  | { type: 'error'; message: string; reqId?: number }
  | { type: 'state'; reqId: number; state?: ArrayBuffer; error?: string }
  | { type: 'stateLoaded'; reqId: number };

export type EmulatorCommand =
  | { type: 'init'; system: string; rom: ArrayBuffer; state?: ArrayBuffer; volume: number; muted: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'setVolume'; volume: number; muted: boolean }
  | { type: 'saveState'; reqId: number }
  | { type: 'loadState'; reqId: number; state: ArrayBuffer };

export const PLAYER_URL = '/emulatorjs/player.html';

export class EmulatorBridge {
  private reqId = 0;
  private pending = new Map<number, (e: EmulatorEvent) => void>();
  private onMessage = (e: MessageEvent) => {
    if (e.origin !== window.location.origin || e.source !== this.frame.contentWindow) return;
    const data = e.data as EmulatorEvent;
    if (!data || typeof data.type !== 'string') return;
    if ('reqId' in data && data.reqId !== undefined && this.pending.has(data.reqId)) {
      this.pending.get(data.reqId)!(data);
      this.pending.delete(data.reqId);
      return;
    }
    this.listener(data);
  };

  constructor(private frame: HTMLIFrameElement, private listener: (e: EmulatorEvent) => void) {
    window.addEventListener('message', this.onMessage);
  }

  send(cmd: EmulatorCommand, transfer: Transferable[] = []) {
    this.frame.contentWindow?.postMessage(cmd, window.location.origin, transfer);
  }

  private request(build: (reqId: number) => EmulatorCommand, transfer: Transferable[] = [], timeoutMs = 5000): Promise<EmulatorEvent> {
    const reqId = ++this.reqId;
    return new Promise((resolve, reject) => {
      const t = window.setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error('The console did not answer.'));
      }, timeoutMs);
      this.pending.set(reqId, (e) => {
        window.clearTimeout(t);
        resolve(e);
      });
      this.send(build(reqId), transfer);
    });
  }

  async saveState(): Promise<ArrayBuffer> {
    const res = await this.request((reqId) => ({ type: 'saveState', reqId }));
    if (res.type === 'state' && res.state) return res.state;
    throw new Error(res.type === 'error' ? res.message : 'Could not save.');
  }

  async loadState(state: ArrayBuffer): Promise<void> {
    const copy = state.slice(0);
    const res = await this.request((reqId) => ({ type: 'loadState', reqId, state: copy }), [copy]);
    if (res.type === 'error') throw new Error(res.message);
  }

  dispose() {
    window.removeEventListener('message', this.onMessage);
    this.pending.clear();
  }
}
