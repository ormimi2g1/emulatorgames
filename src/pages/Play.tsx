import { Link, Navigate, useParams } from 'react-router-dom';
import { AfaTerdooScreen, GAME_ID as AFA_ID } from '../games/afa-terdoo/AfaTerdooScreen';
import { visibleGames } from '../games/catalog';
import { parseRetroGameId } from '../retro/catalog';
import { useApp } from '../state/AppContext';
import { RetroPlayer } from './RetroPlayer';

/** /play/:gameId. Retro games run in the Retro Console; original games have their own screens. */
export function Play() {
  const { gameId = '' } = useParams();
  const { activeProfile, settings } = useApp();
  const romId = parseRetroGameId(gameId);
  if (romId) return <RetroPlayer romId={romId} />;
  if (!activeProfile) return <Navigate to="/" replace />;
  const allowed = visibleGames(activeProfile, settings.disabledGames).some((g) => g.id === gameId);
  if (!allowed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-2xl font-bold">This game isn't available.</p>
        <Link to="/" className="btn btn-sun">Back to the arcade</Link>
      </div>
    );
  }
  if (gameId === AFA_ID) return <AfaTerdooScreen />;
  return <Navigate to="/" replace />;
}
