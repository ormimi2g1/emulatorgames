import { getDb } from '../data/db';
import { dayKey, emptyDay, type DayUsage } from './rules';

export async function loadDay(profileId: string, t = Date.now()): Promise<DayUsage> {
  const rec = await (await getDb()).get('playtime', `${profileId}:${dayKey(t)}`);
  return rec ?? emptyDay(profileId, t);
}

export async function saveDay(usage: DayUsage): Promise<void> {
  await (await getDb()).put('playtime', usage);
}

export async function listDays(profileId?: string): Promise<DayUsage[]> {
  const db = await getDb();
  return profileId ? db.getAllFromIndex('playtime', 'byProfile', profileId) : db.getAll('playtime');
}

export async function deletePlaytimeForProfile(profileId: string): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeysFromIndex('playtime', 'byProfile', profileId);
  await Promise.all(keys.map((k) => db.delete('playtime', k)));
}
