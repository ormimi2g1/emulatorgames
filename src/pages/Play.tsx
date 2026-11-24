import { Navigate, useParams } from 'react-router-dom';
import { parseRetroGameId } from '../retro/catalog';
import { RetroPlayer } from './RetroPlayer';

/** /play/:gameId. Retro games run in the Retro Console; original games arrive with their phases. */
export function Play() {
  const { gameId = '' } = useParams();
  const romId = parseRetroGameId(gameId);
  if (romId) return <RetroPlayer romId={romId} />;
  return <Navigate to="/" replace />;
}
