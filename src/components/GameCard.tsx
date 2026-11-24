import { useNavigate } from 'react-router-dom';
import { ageLabel, isPlayable } from '../games/catalog';
import { Thumbnail } from '../games/Thumbnail';
import type { GameDefinition } from '../games/types';
import { useApp } from '../state/AppContext';

const DIFF_LABEL: Record<string, string> = { 'little-explorer': 'Easy', adventurer: 'Medium', 'super-hero': 'Hard' };
const CONTROL_ICON: Record<string, string> = { keyboard: '⌨️', touch: '👆', gamepad: '🎮' };

export function GameCard({ game, size = 'md' }: { game: GameDefinition; size?: 'md' | 'lg' }) {
  const { activeProfile, toggleFavorite } = useApp();
  const navigate = useNavigate();
  const playable = isPlayable(game);
  const fav = activeProfile?.favorites.includes(game.id) ?? false;
  const diffs = game.difficulties.map((d) => DIFF_LABEL[d]);
  const diffText = diffs.length > 1 ? `${diffs[0]}–${diffs[diffs.length - 1]}` : diffs[0];

  return (
    <article
      className={`card pop-in relative flex shrink-0 flex-col overflow-hidden ${size === 'lg' ? 'w-[min(85vw,30rem)]' : 'w-[min(72vw,17rem)]'}`}
      aria-label={game.title}
      data-testid={`game-card-${game.id}`}
    >
      <div className={`relative aspect-video ${playable ? '' : 'saturate-50'}`}>
        <Thumbnail gameId={game.id} title={game.title} />
        {!playable && (
          <span className="absolute left-3 top-3 rounded-full bg-navy/85 px-3 py-1 text-sm font-bold text-sun">Coming soon</span>
        )}
        <button
          type="button"
          onClick={() => void toggleFavorite(game.id)}
          aria-pressed={fav}
          aria-label={fav ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
          className="absolute right-2 top-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-2xl shadow"
        >
          {fav ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-bold leading-tight">{game.title}</h3>
        <ul className="muted flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold" aria-label="Game details">
          <li title="Recommended age">🎂 {ageLabel(game)}</li>
          <li title="Difficulty">⭐ {diffText}</li>
          <li title="Players">{game.players.max > 1 ? `👥 1–${game.players.max}` : '👤 1'}</li>
          <li title="Controls" aria-label={`Controls: ${game.controls.join(', ')}`}>
            {game.controls.map((c) => CONTROL_ICON[c]).join(' ')}
          </li>
        </ul>
        <div className="mt-auto pt-1">
          {playable ? (
            <button type="button" className="btn btn-sun w-full" onClick={() => navigate(`/play/${game.id}`)}>
              ▶ Play
            </button>
          ) : (
            <button type="button" className="btn btn-ghost w-full" disabled aria-label={`${game.title} is coming soon`}>
              🔒 Coming soon
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function GameRow({ title, emoji, games, testId }: { title: string; emoji: string; games: GameDefinition[]; testId?: string }) {
  if (!games.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-label={title} data-testid={testId}>
      <h2 className="flex items-center gap-2 px-1 text-2xl font-bold">
        <span aria-hidden="true">{emoji}</span> {title}
      </h2>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4">
        {games.map((g) => (
          <div key={g.id} className="snap-start">
            <GameCard game={g} />
          </div>
        ))}
      </div>
    </section>
  );
}
