import { useEffect, useRef, useState } from 'react';
import { DEFAULT_CONTROLS, type ControlSettings } from '../../data/types';
import { useApp } from '../../state/AppContext';

type Action = 'jump' | 'action' | 'pause';
const ACTIONS: { id: Action; label: string }[] = [
  { id: 'jump', label: '⤒ Jump' },
  { id: 'action', label: '✨ Special move' },
  { id: 'pause', label: '⏸ Pause' },
];

/** Names for the "standard" gamepad layout (Xbox / PlayStation). */
const PAD_NAMES = ['A / Cross', 'B / Circle', 'X / Square', 'Y / Triangle', 'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2', 'Back / Share', 'Start / Options', 'Left stick', 'Right stick', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home'];
/** Keys a parent can't pick, because games and the browser need them. */
const RESERVED = new Set(['Escape', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS']);

export function padName(i: number): string {
  return PAD_NAMES[i] ? `${PAD_NAMES[i]} (button ${i})` : `Button ${i}`;
}

export function keyName(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code.replace(/(Left|Right)$/, ' ($1)').replace(/([a-z])([A-Z])/g, '$1 $2');
}

interface PadView {
  index: number;
  id: string;
  pressed: number[];
  axes: number[];
}

function readPads(): PadView[] {
  const pads = navigator.getGamepads?.() ?? [];
  return [...pads].filter((p): p is Gamepad => !!p).map((p) => ({
    index: p.index,
    id: p.id,
    pressed: p.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0),
    axes: p.axes.map((a) => Math.round(a * 100) / 100),
  }));
}

export function Controllers() {
  const { settings, updateSettings } = useApp();
  const c = settings.controls;
  const supported = typeof navigator !== 'undefined' && 'getGamepads' in navigator;
  const [pads, setPads] = useState<PadView[]>([]);
  const [log, setLog] = useState('');
  const [capture, setCapture] = useState<null | { kind: 'key' | 'pad'; action: Action }>(null);
  const captureRef = useRef(capture);
  captureRef.current = capture;

  const save = (next: ControlSettings) => void updateSettings({ controls: next });
  const saveRef = useRef(save);
  saveRef.current = save;
  const cRef = useRef(c);
  cRef.current = c;

  // Watch controllers: live button test and pad capture.
  useEffect(() => {
    if (!supported) return;
    let raf = 0;
    let before = new Set<string>();
    const loop = () => {
      const list = readPads();
      setPads((old) => (JSON.stringify(old) === JSON.stringify(list) ? old : list));
      const cap = captureRef.current;
      const now = new Set(list.flatMap((p) => p.pressed.map((i) => `${p.index}:${i}`)));
      if (cap?.kind === 'pad') {
        const fresh = [...now].find((k) => !before.has(k));
        if (fresh) {
          const button = Number(fresh.split(':')[1]);
          const cur = cRef.current;
          saveRef.current({ ...cur, pad: { ...cur.pad, [cap.action]: button } });
          setCapture(null);
        }
      }
      before = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const on = (e: GamepadEvent) => setLog(`🎮 Connected: ${e.gamepad.id}`);
    const off = (e: GamepadEvent) => setLog(`Disconnected: ${e.gamepad.id}`);
    window.addEventListener('gamepadconnected', on);
    window.addEventListener('gamepaddisconnected', off);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('gamepadconnected', on);
      window.removeEventListener('gamepaddisconnected', off);
    };
  }, [supported]);

  // Key capture.
  useEffect(() => {
    if (capture?.kind !== 'key') return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === 'Escape') return setCapture(null);
      if (RESERVED.has(e.code)) return setLog(`${keyName(e.code)} is used for moving or leaving, so pick another key.`);
      save({ ...c, keys: { ...c.keys, [capture.action]: e.code } });
      setLog('');
      setCapture(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-5" aria-label="Controller test">
        <h2 className="text-xl font-bold">🎮 Controller test</h2>
        {!supported && <p role="alert">This browser can't use game controllers. Keyboard and touch still work.</p>}
        {supported && pads.length === 0 && (
          <p className="muted" data-testid="no-pads">No controller found. Connect one with a cable or Bluetooth, then press any button on it to wake it up.</p>
        )}
        {log && <p role="status" className="font-semibold">{log}</p>}
        <ul className="flex flex-col gap-3">
          {pads.map((p) => (
            <li key={p.index} className="surface-2 flex flex-col gap-2 rounded-2xl p-3" data-testid="pad">
              <span className="font-semibold">Player {p.index + 1}: {p.id}</span>
              <span>Pressed: {p.pressed.length ? p.pressed.map(padName).join(', ') : 'nothing'}</span>
              <span className="muted text-sm">Sticks: {p.axes.join(' / ')}</span>
            </li>
          ))}
        </ul>
        <p className="muted text-sm">Works with Xbox, PlayStation and most USB or Bluetooth controllers the browser recognises. Some controllers use a different button order.</p>
      </section>

      <section className="card flex flex-col gap-3 p-5" aria-label="Buttons for the arcade games">
        <h2 className="text-xl font-bold">Buttons for the arcade games</h2>
        <p className="muted">Used by Afa &amp; Terdoo, Space Explorer and Rainbow Kart. Arrow keys and WASD always move, and Escape always pauses.</p>
        {capture && (
          <p role="status" className="rounded-2xl bg-sun p-3 font-bold text-navy">
            {capture.kind === 'key' ? 'Press a key on the keyboard… (Escape cancels)' : 'Press a button on the controller…'}
            <button type="button" className="btn btn-ghost ml-3 min-h-10" onClick={() => setCapture(null)}>Cancel</button>
          </p>
        )}
        <table className="w-full text-left">
          <thead>
            <tr className="muted text-sm">
              <th className="py-1">Action</th>
              <th>Keyboard</th>
              <th>Controller</th>
            </tr>
          </thead>
          <tbody>
            {ACTIONS.map((a) => (
              <tr key={a.id} className="border-t border-white/10">
                <td className="py-2 font-semibold">{a.label}</td>
                <td>
                  <button type="button" className="btn btn-ghost min-h-11" aria-label={`Change keyboard key for ${a.id}`} onClick={() => setCapture({ kind: 'key', action: a.id })}>
                    {keyName(c.keys[a.id])}
                  </button>
                </td>
                <td>
                  <button type="button" className="btn btn-ghost min-h-11" aria-label={`Change controller button for ${a.id}`} disabled={!supported} onClick={() => setCapture({ kind: 'pad', action: a.id })}>
                    {padName(c.pad[a.id])}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-ghost self-start" onClick={() => save({ ...c, keys: DEFAULT_CONTROLS.keys, pad: DEFAULT_CONTROLS.pad })}>↺ Use the usual buttons</button>
      </section>

      <section className="card flex flex-col gap-3 p-5" aria-label="Touch buttons">
        <h2 className="text-xl font-bold">📱 Touch buttons</h2>
        <label className="flex flex-col gap-1 font-semibold">
          See-through: {Math.round(c.touchOpacity * 100)}%
          <input type="range" min={0.3} max={1} step={0.05} value={c.touchOpacity} onChange={(e) => save({ ...c, touchOpacity: Number(e.target.value) })} className="h-8 accent-purple" aria-label="Touch button opacity" />
        </label>
        <label className="flex min-h-11 items-center gap-3 font-semibold">
          <input type="checkbox" className="h-6 w-6 accent-purple" checked={c.vibration} onChange={(e) => save({ ...c, vibration: e.target.checked })} />
          Buzz when a button is pressed <span className="muted font-normal">(on phones that support it)</span>
        </label>
        <p className="muted text-sm">Bigger buttons and left-handed layout are set for each player under Players.</p>
      </section>

      <section className="card flex flex-col gap-2 p-5">
        <h2 className="text-xl font-bold">Retro games</h2>
        <p className="muted">The Retro Console uses its own fixed layout. The keys are listed under Retro Games, and a controller works there too.</p>
      </section>
    </div>
  );
}
