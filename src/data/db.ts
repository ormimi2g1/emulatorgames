import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppSettings, ChildProfile, LockoutState, ParentAuthRecord } from './types';

/**
 * Local IndexedDB storage. All data stays on this device.
 * Schema changes MUST be additive migrations in `upgrade` so existing
 * profiles, saves and imported games survive app updates.
 */
export const DB_NAME = 'kids-adventure-arcade';
export const DB_VERSION = 1;

export interface KvMap {
  settings: AppSettings;
  parentAuth: ParentAuthRecord;
  lockout: LockoutState;
  activeProfileId: string;
}

interface ArcadeDB extends DBSchema {
  kv: { key: string; value: unknown };
  profiles: { key: string; value: ChildProfile };
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
        // Future versions: add `if (oldVersion < 2) { ... }` blocks here.
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
