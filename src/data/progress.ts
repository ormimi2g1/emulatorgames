import { getDb } from './db';

/** Saved progress for original games, kept per player. */
export async function loadProgress<T>(gameId: string, profileId: string): Promise<T | undefined> {
  return (await (await getDb()).get('progress', `${gameId}:${profileId}`))?.data as T | undefined;
}

export async function saveProgress(gameId: string, profileId: string, data: unknown): Promise<void> {
  await (await getDb()).put('progress', { id: `${gameId}:${profileId}`, gameId, profileId, data, updatedAt: Date.now() });
}

export async function deleteProgressForProfile(profileId: string): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeysFromIndex('progress', 'byProfile', profileId);
  await Promise.all(keys.map((k) => db.delete('progress', k)));
}
