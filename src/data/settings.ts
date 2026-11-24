import { kvGet, kvSet } from './db';
import { DEFAULT_SETTINGS, type AppSettings } from './types';

export async function loadSettings(): Promise<AppSettings> {
  const stored = await kvGet('settings');
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await kvSet('settings', settings);
}
