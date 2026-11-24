import { GameCard } from '../components/GameCard';
import { visibleGames } from '../games/catalog';
import { useApp } from '../state/AppContext';

export function MyGames() {
  const { activeProfile, settings } = useApp();
  const games = visibleGames(activeProfile, settings.disabledGames);
  const favs = games.filter((g) => activeProfile?.favorites.includes(g.id));
  const recentIds = (activeProfile?.recent ?? []).map((r) => r.gameId);
  const recent = recentIds.map((id) => games.find((g) => g.id === id)).filter((g) => !!g);
  return (
    <div className="flex flex-col gap-8">
      <h1 className="pt-2 text-3xl font-bold sm:text-4xl">❤️ My Games</h1>
      <section className="flex flex-col gap-3" aria-label="Favorites">
        <h2 className="text-2xl font-bold">Favorites</h2>
        {favs.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-5 [&>article]:w-auto">
            {favs.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        ) : (
          <p className="card p-5 text-lg">Tap the 🤍 on any game to keep it here.</p>
        )}
      </section>
      <section className="flex flex-col gap-3" aria-label="Recently played">
        <h2 className="text-2xl font-bold">Recently Played</h2>
        {recent.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-5 [&>article]:w-auto">
            {recent.map((g) => <GameCard key={g!.id} game={g!} />)}
          </div>
        ) : (
          <p className="card p-5 text-lg">Games you play will show up here.</p>
        )}
      </section>
    </div>
  );
}
