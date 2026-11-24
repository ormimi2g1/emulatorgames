import { ACHIEVEMENTS } from '../data/achievements';
import { useApp } from '../state/AppContext';

export function Achievements() {
  const { activeProfile } = useApp();
  const have = new Set(activeProfile?.achievements ?? []);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="pt-2 text-3xl font-bold sm:text-4xl">🏆 My Trophies</h1>
      <p className="muted text-lg">Play and explore to collect trophies. There's no rush!</p>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const got = have.has(a.id);
          return (
            <li key={a.id} className={`card flex flex-col items-center gap-2 p-5 text-center ${got ? '' : 'opacity-60'}`}>
              <span className={`text-5xl ${got ? '' : 'grayscale'}`} aria-hidden="true">{a.emoji}</span>
              <h2 className="text-lg font-bold">{a.title}</h2>
              <p className="muted text-sm">{a.description}</p>
              <span className="text-sm font-bold">{got ? '✅ Collected' : '🔒 Not yet'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
