import { getDb } from '../data/db';
import { AUTO_SLOT, type ChildProfile, type Difficulty, type RetroGame, type SaveState } from '../data/types';
import { newId } from '../utils/id';
import { getSystem, sha256Hex, sniffImage, validateRomFile, validateTitle } from './systems';

export interface ImportInput {
  system: string;
  fileName: string;
  bytes: Uint8Array;
  title: string;
  ageMin: number;
  ageMax: number;
  difficulty: Difficulty;
  assignedProfiles: 'all' | string[];
  art?: Uint8Array | null;
}

function copyBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

/** Validate and store a parent-supplied game file locally. Nothing is uploaded. */
export async function importRetroGame(input: ImportInput): Promise<RetroGame> {
  const fileErr = validateRomFile(input.system, input.fileName, input.bytes);
  if (fileErr) throw new Error(fileErr);
  const titleErr = validateTitle(input.title);
  if (titleErr) throw new Error(titleErr);
  if (!(input.ageMin >= 2 && input.ageMax <= 18 && input.ageMin <= input.ageMax)) throw new Error('Please choose a valid age range.');
  let artType: string | null = null;
  if (input.art?.length) {
    const sniff = sniffImage(input.art);
    if ('error' in sniff) throw new Error(sniff.error);
    artType = sniff.type;
  }
  const sha256 = await sha256Hex(input.bytes);
  const db = await getDb();
  if (await db.getFromIndex('romMeta', 'bySha', sha256)) throw new Error('This game is already in the arcade.');

  const now = Date.now();
  const game: RetroGame = {
    id: newId(),
    system: input.system,
    title: input.title.trim(),
    fileName: input.fileName.replace(/^.*[\\/]/, '').slice(0, 120),
    size: input.bytes.length,
    sha256,
    ageMin: input.ageMin,
    ageMax: input.ageMax,
    difficulty: input.difficulty,
    enabled: false,
    tested: false,
    assignedProfiles: input.assignedProfiles,
    hasArt: !!artType,
    addedAt: now,
    updatedAt: now,
  };
  const tx = db.transaction(['romMeta', 'romData', 'romArt'], 'readwrite');
  await tx.objectStore('romMeta').add(game);
  await tx.objectStore('romData').add({ id: game.id, data: copyBuffer(input.bytes) });
  if (artType && input.art) await tx.objectStore('romArt').put({ id: game.id, type: artType, data: copyBuffer(input.art) });
  await tx.done;
  return game;
}

export async function listRetroGames(): Promise<RetroGame[]> {
  const all = await (await getDb()).getAll('romMeta');
  return all.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getRetroGame(id: string): Promise<RetroGame | undefined> {
  return (await getDb()).get('romMeta', id);
}

export async function updateRetroGame(id: string, patch: Partial<Pick<RetroGame, 'title' | 'ageMin' | 'ageMax' | 'difficulty' | 'enabled' | 'assignedProfiles'>>): Promise<RetroGame> {
  const db = await getDb();
  const game = await db.get('romMeta', id);
  if (!game) throw new Error('Game not found.');
  if (patch.title !== undefined) {
    const err = validateTitle(patch.title);
    if (err) throw new Error(err);
    patch.title = patch.title.trim();
  }
  if (patch.enabled && !game.tested) throw new Error('Test the game before turning it on for kids.');
  const next = { ...game, ...patch, updatedAt: Date.now() };
  await db.put('romMeta', next);
  return next;
}

export async function markTested(id: string): Promise<void> {
  const db = await getDb();
  const game = await db.get('romMeta', id);
  if (game && !game.tested) await db.put('romMeta', { ...game, tested: true, updatedAt: Date.now() });
}

export async function setRetroArt(id: string, art: Uint8Array | null): Promise<void> {
  const db = await getDb();
  const game = await db.get('romMeta', id);
  if (!game) throw new Error('Game not found.');
  if (art) {
    const sniff = sniffImage(art);
    if ('error' in sniff) throw new Error(sniff.error);
    await db.put('romArt', { id, type: sniff.type, data: copyBuffer(art) });
  } else {
    await db.delete('romArt', id);
  }
  await db.put('romMeta', { ...game, hasArt: !!art, updatedAt: Date.now() });
}

export async function getRetroArt(id: string): Promise<Blob | undefined> {
  const rec = await (await getDb()).get('romArt', id);
  return rec ? new Blob([rec.data], { type: rec.type }) : undefined;
}

export async function getRomBytes(id: string): Promise<ArrayBuffer | undefined> {
  return (await (await getDb()).get('romData', id))?.data;
}

export async function deleteRetroGame(id: string): Promise<void> {
  const db = await getDb();
  const saveKeys = await db.getAllKeysFromIndex('saves', 'byRom', id);
  const tx = db.transaction(['romMeta', 'romData', 'romArt', 'saves'], 'readwrite');
  await Promise.all([
    tx.objectStore('romMeta').delete(id),
    tx.objectStore('romData').delete(id),
    tx.objectStore('romArt').delete(id),
    ...saveKeys.map((k) => tx.objectStore('saves').delete(k)),
  ]);
  await tx.done;
}

/** Games a player may see: switched on, tested, and assigned to them. */
export function retroGamesFor(profile: Pick<ChildProfile, 'id'> | null, games: RetroGame[]): RetroGame[] {
  return games.filter(
    (g) => g.enabled && g.tested && !!getSystem(g.system)?.supported && (g.assignedProfiles === 'all' || (!!profile && g.assignedProfiles.includes(profile.id))),
  );
}

export function saveId(romId: string, profileId: string, slot: number): string {
  return `${romId}:${profileId}:${slot}`;
}

export async function writeSave(romId: string, profileId: string, slot: number, data: ArrayBuffer): Promise<SaveState> {
  if (!Number.isInteger(slot) || slot < AUTO_SLOT || slot > 3) throw new Error('Invalid save slot.');
  const save: SaveState = { id: saveId(romId, profileId, slot), romId, profileId, slot, data, savedAt: Date.now() };
  await (await getDb()).put('saves', save);
  return save;
}

export async function readSave(romId: string, profileId: string, slot: number): Promise<SaveState | undefined> {
  return (await getDb()).get('saves', saveId(romId, profileId, slot));
}

export async function listSaves(romId: string, profileId?: string): Promise<SaveState[]> {
  const db = await getDb();
  const list = profileId ? await db.getAllFromIndex('saves', 'byRomProfile', [romId, profileId]) : await db.getAllFromIndex('saves', 'byRom', romId);
  return list.sort((a, b) => a.slot - b.slot);
}

export async function deleteSave(id: string): Promise<void> {
  await (await getDb()).delete('saves', id);
}

export async function deleteSavesForProfile(profileId: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAll('saves');
  await Promise.all(all.filter((s) => s.profileId === profileId).map((s) => db.delete('saves', s.id)));
}

export async function retroStorageBytes(): Promise<{ games: number; saves: number }> {
  const db = await getDb();
  const [metas, saves] = await Promise.all([db.getAll('romMeta'), db.getAll('saves')]);
  return { games: metas.reduce((n, g) => n + g.size, 0), saves: saves.reduce((n, s) => n + s.data.byteLength, 0) };
}
