import { getDb, kvDelete, kvGet, kvSet } from './db';
import { DEFAULT_ACCESSIBILITY, type ChildProfile } from './types';
import { newId } from '../utils/id';
import { deleteSavesForProfile } from '../retro/store';

export const MAX_PROFILES = 8;
export const NICKNAME_MAX = 16;

/** Nicknames only: letters, numbers, spaces and a few friendly symbols. */
export function validateNickname(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'Please type a nickname.';
  if (name.length > NICKNAME_MAX) return `Keep it to ${NICKNAME_MAX} letters or fewer.`;
  if (!/^[\p{L}\p{N} '\-_.!]+$/u.test(name)) return 'Use letters, numbers and spaces only.';
  return null;
}

export function makeProfile(input: Partial<ChildProfile> & { nickname: string; avatarId: string }): ChildProfile {
  return {
    id: newId(),
    ageRange: '',
    difficulty: 'little-explorer',
    favorites: [],
    recent: [],
    assignedGames: 'all',
    accessibility: { ...DEFAULT_ACCESSIBILITY },
    achievements: [],
    createdAt: Date.now(),
    ...input,
    nickname: input.nickname.trim(),
  };
}

export async function listProfiles(): Promise<ChildProfile[]> {
  const all = await (await getDb()).getAll('profiles');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getProfile(id: string): Promise<ChildProfile | undefined> {
  return (await getDb()).get('profiles', id);
}

export async function saveProfile(profile: ChildProfile): Promise<void> {
  const err = validateNickname(profile.nickname);
  if (err) throw new Error(err);
  const existing = await getProfile(profile.id);
  if (!existing && (await listProfiles()).length >= MAX_PROFILES) {
    throw new Error(`You can have up to ${MAX_PROFILES} profiles.`);
  }
  await (await getDb()).put('profiles', { ...profile, nickname: profile.nickname.trim() });
}

export async function deleteProfile(id: string): Promise<void> {
  await (await getDb()).delete('profiles', id);
  await deleteSavesForProfile(id);
  if ((await kvGet('activeProfileId')) === id) await kvDelete('activeProfileId');
}

export async function toggleFavorite(id: string, gameId: string): Promise<ChildProfile | undefined> {
  const p = await getProfile(id);
  if (!p) return undefined;
  const favorites = p.favorites.includes(gameId)
    ? p.favorites.filter((g) => g !== gameId)
    : [...p.favorites, gameId];
  const next = { ...p, favorites };
  await saveProfile(next);
  return next;
}

export async function getActiveProfileId(): Promise<string | undefined> {
  return kvGet('activeProfileId');
}

export async function setActiveProfileId(id: string | null): Promise<void> {
  if (id) await kvSet('activeProfileId', id);
  else await kvDelete('activeProfileId');
}

export function demoProfiles(): ChildProfile[] {
  return [
    makeProfile({ nickname: 'Afa', avatarId: 'star-girl', ageRange: '5-6', difficulty: 'adventurer', isDemo: true }),
    makeProfile({ nickname: 'Terdoo', avatarId: 'rocket-boy', ageRange: '3-4', difficulty: 'little-explorer', isDemo: true }),
  ];
}
