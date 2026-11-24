import { Link } from 'react-router-dom';
import { GameCard } from '../components/GameCard';
import { CATEGORIES } from '../games/catalog';
import type { GameCategory } from '../games/types';
import { useArcadeGames } from '../state/AppContext';

export function Category({ category }: { category: GameCategory }) {
  const meta = CATEGORIES.find((c) => c.id === category)!;
  const games = useArcadeGames().filter((g) => g.category === category);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="pt-2 text-3xl font-bold sm:text-4xl">
        <span aria-hidden="true">{meta.emoji}</span> {meta.label}
      </h1>
      {category === 'retro' && games.length === 0 && (
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <span className="text-4xl" aria-hidden="true">👨‍👩‍👧</span>
          <p className="flex-1 text-lg">
            Retro games are added by a grown-up, using game files they own. Ask a grown-up to add some in the Parent Zone!
          </p>
          <Link to="/parent" className="btn btn-ghost">Parent Zone</Link>
        </div>
      )}
      {games.length === 0 ? (
        <p className="card p-6 text-lg">No games here yet. Adventure awaits soon! 🚀</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-5 [&>article]:w-auto">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
