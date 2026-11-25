import { Link } from 'react-router-dom';
import { GameCard, GameRow } from '../components/GameCard';
import { ACHIEVEMENTS } from '../data/achievements';
import { CATEGORIES } from '../games/catalog';
import type { GameDefinition } from '../games/types';
import { PlaytimeBadge } from '../playtime/PlaytimeBadge';
import { useApp, useArcadeGames } from '../state/AppContext';

const FEATURED_IDS = ['afa-terdoo', 'rainbow-kart'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Home() {
  const { activeProfile } = useApp();
  const games = useArcadeGames();
  const byIds = (ids: string[]) => ids.map((id) => games.find((g) => g.id === id)).filter(Boolean) as GameDefinition[];
  // Playable retro games lead the carousel, then the flagship originals.
  const featured = [...games.filter((g) => g.retroId).slice(0, 3), ...byIds(FEATURED_IDS)];
  const recent = byIds((activeProfile?.recent ?? []).map((r) => r.gameId));
  const favorites = byIds(activeProfile?.favorites ?? []);
  const unlocked = ACHIEVEMENTS.filter((a) => activeProfile?.achievements.includes(a.id));

  return (
    <div className="flex flex-col gap-8">
      <section className="pt-2">
        <h1 className="text-3xl font-bold sm:text-4xl">
          {greeting()}, <span className="text-purple dark:text-sun">{activeProfile?.nickname}</span>! 👋
        </h1>
        <p className="muted text-lg">Big Adventures for Little Heroes</p>
        {activeProfile && <PlaytimeBadge profile={activeProfile} />}
      </section>

      {featured.length > 0 && (
        <section aria-label="Featured games" className="flex flex-col gap-3">
          <h2 className="px-1 text-2xl font-bold">🌟 Featured</h2>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4" data-testid="featured">
            {featured.map((g) => (
              <div key={g.id} className="snap-center">
                <GameCard game={g} size="lg" />
              </div>
            ))}
          </div>
        </section>
      )}

      <GameRow title="Recently Played" emoji="⏱️" games={recent} />
      <GameRow title="My Favorites" emoji="❤️" games={favorites} testId="favorites-row" />
      {CATEGORIES.map((c) => (
        <GameRow key={c.id} title={c.label} emoji={c.emoji} games={games.filter((g) => g.category === c.id)} testId={`row-${c.id}`} />
      ))}

      <section aria-label="Achievements" className="card flex flex-wrap items-center gap-4 p-5">
        <span className="text-4xl" aria-hidden="true">🏆</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold">My Trophies</h2>
          <p className="muted">{unlocked.length} of {ACHIEVEMENTS.length} collected</p>
        </div>
        <Link to="/achievements" className="btn btn-ghost">See all</Link>
      </section>
    </div>
  );
}

