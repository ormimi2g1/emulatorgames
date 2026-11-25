import { Suspense, lazy, useMemo } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { getGame, isPlayable, visibleGames } from '../games/catalog';
import { parseRetroGameId } from '../retro/catalog';
import { PlaytimeGuard } from '../playtime/PlaytimeGuard';
import { useApp } from '../state/AppContext';
import { RetroPlayer } from './RetroPlayer';

function NotAvailable() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-2xl font-bold">This game isn't available.</p>
      <Link to="/" className="btn btn-sun">Back to the arcade</Link>
    </div>
  );
}

/** /play/:gameId. Retro games run in the Retro Console; original games load their own screen. */
export function Play() {
  const { gameId = '' } = useParams();
  const [params] = useSearchParams();
  const { activeProfile, settings } = useApp();
  const romId = parseRetroGameId(gameId);
  const game = getGame(gameId);
  const Screen = useMemo(() => (game?.screen ? lazy(game.screen) : null), [game]);
  if (romId) {
    // A grown-up testing a game in the Parent Zone isn't a child's playtime.
    if (params.get('test') === '1' || !activeProfile) return <RetroPlayer romId={romId} />;
    return (
      <PlaytimeGuard profile={activeProfile} gameId={gameId}>
        <RetroPlayer romId={romId} />
      </PlaytimeGuard>
    );
  }
  if (!activeProfile) return <Navigate to="/" replace />;
  const allowed = !!game && isPlayable(game) && visibleGames(activeProfile, settings.disabledGames).some((g) => g.id === gameId);
  if (!allowed || !Screen) return <NotAvailable />;
  return (
    <PlaytimeGuard profile={activeProfile} gameId={gameId}>
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-2xl font-bold" role="status">
          Getting ready… 🌈
        </div>
      }
    >
      <Screen />
    </Suspense>
    </PlaytimeGuard>
  );
}
