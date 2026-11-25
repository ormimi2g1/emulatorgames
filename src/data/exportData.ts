import { kvGet } from './db';
import { listProfiles } from './profiles';
import { loadSettings } from './settings';
import { listDays } from '../playtime/store';

/** Parent-controlled export. Never includes the PIN hash or recovery data. */
export async function buildExport() {
  return {
    app: 'kids-adventure-arcade',
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: await loadSettings(),
    profiles: await listProfiles(),
    playtime: await listDays(),
    activeProfileId: (await kvGet('activeProfileId')) ?? null,
  };
}
