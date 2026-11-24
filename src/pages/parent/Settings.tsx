import type { AppSettings, ThemeMode } from '../../data/types';
import { useApp } from '../../state/AppContext';

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 font-semibold">
      {label}: {Math.round(value * 100)}%
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 accent-purple" />
    </label>
  );
}

export function Settings() {
  const { settings, updateSettings } = useApp();
  const set = (patch: Partial<AppSettings>) => void updateSettings(patch);
  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-xl font-bold">Look</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Theme">
          {(
            [
              ['dark', '🌙 Dark'],
              ['light', '☀️ Light'],
              ['system', '🖥️ Match device'],
            ] as [ThemeMode, string][]
          ).map(([v, l]) => (
            <button key={v} role="radio" aria-checked={settings.theme === v} className={`btn ${settings.theme === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set({ theme: v })}>
              {l}
            </button>
          ))}
        </div>
        <p className="muted text-sm">High contrast and reduced motion are set per player under Players.</p>
      </section>
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-xl font-bold">Sound</h2>
        <label className="flex min-h-11 items-center gap-3 font-semibold">
          <input type="checkbox" className="h-6 w-6 accent-purple" checked={settings.muted} onChange={(e) => set({ muted: e.target.checked })} />
          Mute everything
        </label>
        <Slider label="Master volume" value={settings.masterVolume} onChange={(v) => set({ masterVolume: v })} />
        <Slider label="Music" value={settings.musicVolume} onChange={(v) => set({ musicVolume: v })} />
        <Slider label="Sound effects" value={settings.sfxVolume} onChange={(v) => set({ sfxVolume: v })} />
      </section>
    </div>
  );
}
