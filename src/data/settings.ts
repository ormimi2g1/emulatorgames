import { kvGet, kvSet } from './db';
import { DEFAULT_CONTROLS, DEFAULT_SETTINGS, type AppSettings } from './types';

export async function loadSettings(): Promise<AppSettings> {
  const stored: Partial<AppSettings> = (await kvGet('settings')) ?? {};
  // Settings saved by older versions miss newer fields; fill them in.
  const c = stored.controls;
  const controls = {
    ...DEFAULT_CONTROLS,
    ...(c ?? {}),
    keys: { ...DEFAULT_CONTROLS.keys, ...(c?.keys ?? {}) },
    pad: { ...DEFAULT_CONTROLS.pad, ...(c?.pad ?? {}) },
  };
  return { ...DEFAULT_SETTINGS, ...stored, controls };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await kvSet('settings', settings);
}
