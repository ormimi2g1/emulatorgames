import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppSettings, ChildProfile, LockoutState, ParentAuthRecord, RetroGame, SaveState } from './types';

/**
 * Local IndexedDB storage. All data stays on this device.
 * Schema changes MUST be additive migrations in `upgrade` so existing
 * profiles, saves and imported games survive app updates.
 */
export const DB_NAME = 'kids-adventure-arcade';
export const DB_VERSION = 3;

export interface KvMap {
  settings: AppSettings;
  parentAuth: ParentAuthRecord;
  lockout: LockoutState;
  activeProfileId: string;
}

interface ArcadeDB extends DBSchema {
  kv: { key: string; value: unknown };
  profiles: { key: string; value: ChildProfile };
  /** Retro game details (small; listed often). */
  romMeta: { key: string; value: RetroGame; indexes: { bySha: string } };
  /** Retro game file bytes, kept apart from the details so lists stay fast. */
  romData: { key: string; value: { id: string; data: ArrayBuffer } };
  romArt: { key: string; value: { id: string; type: string; data: ArrayBuffer } };
  saves: { key: string; value: SaveState; indexes: { byRom: string; byRomProfile: [string, string] } };
  /** Original games' progress, one record per game × player. */
  progress: { key: string; value: { id: string; gameId: string; profileId: string; data: unknown; updatedAt: number }; indexes: { byProfile: string } };
}

let dbPromise: Promise<IDBPDatabase<ArcadeDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<ArcadeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ArcadeDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('kv');
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          const meta = db.createObjectStore('romMeta', { keyPath: 'id' });
          meta.createIndex('bySha', 'sha256', { unique: true });
          db.createObjectStore('romData', { keyPath: 'id' });
          db.createObjectStore('romArt', { keyPath: 'id' });
          const saves = db.createObjectStore('saves', { keyPath: 'id' });
          saves.createIndex('byRom', 'romId');
          saves.createIndex('byRomProfile', ['romId', 'profileId']);
        }
        if (oldVersion < 3) {
          const progress = db.createObjectStore('progress', { keyPath: 'id' });
          progress.createIndex('byProfile', 'profileId');
        }
        // Future versions: add `if (oldVersion < 4) { ... }` blocks here.
      },
      blocking() {
        // A newer version of the app opened the DB in another tab; close so it can upgrade.
        void dbPromise?.then((d) => d.close());
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

export async function kvGet<K extends keyof KvMap>(key: K): Promise<KvMap[K] | undefined> {
  return (await getDb()).get('kv', key) as Promise<KvMap[K] | undefined>;
}

export async function kvSet<K extends keyof KvMap>(key: K, value: KvMap[K]): Promise<void> {
  await (await getDb()).put('kv', value, key);
}

export async function kvDelete(key: keyof KvMap): Promise<void> {
  await (await getDb()).delete('kv', key);
}

/** Close and forget the connection (used by tests and full data deletion). */
export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

export async function deleteAllLocalData(): Promise<void> {
  await closeDb();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
