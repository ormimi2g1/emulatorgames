import { GAMES, isPlayable } from '../../games/catalog';
import { useApp } from '../../state/AppContext';

export function Games() {
  const { settings, updateSettings } = useApp();
  const toggle = (id: string) => {
    const off = settings.disabledGames.includes(id);
    void updateSettings({ disabledGames: off ? settings.disabledGames.filter((g) => g !== id) : [...settings.disabledGames, id] });
  };
  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-2 p-5">
        <h2 className="text-xl font-bold">Show or hide games for everyone</h2>
        <p className="muted">To choose games for one player, edit that player under Players.</p>
        <ul className="mt-2 flex flex-col gap-2">
          {GAMES.map((g) => (
            <li key={g.id} className="surface-2 flex items-center gap-3 rounded-2xl p-3">
              <label className="flex flex-1 items-center gap-3 font-semibold">
                <input type="checkbox" className="h-6 w-6 accent-purple" checked={!settings.disabledGames.includes(g.id)} onChange={() => toggle(g.id)} />
                {g.title}
              </label>
              <span className="muted text-sm">{isPlayable(g) ? 'Ready' : `Coming in phase ${g.plannedPhase}`}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card flex flex-col gap-2 p-5">
        <h2 className="text-xl font-bold">Retro games</h2>
        <p>
          Importing retro game files (.nes first) arrives with the Retro Console. You'll pick a game file you own from this device; it stays on this
          device and is never uploaded. The arcade does not include or download any commercial games.
        </p>
      </section>
    </div>
  );
}
