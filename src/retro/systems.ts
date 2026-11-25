/**
 * Retro systems the console knows about. Only systems marked `supported` can be
 * imported; others are listed so parents know what is planned. A system becomes
 * supported only after its emulator core is bundled and tested.
 */
export type RetroSystemId = 'nes' | 'snes' | 'gb' | 'gbc' | 'gba' | 'genesis';

export interface RetroSystem {
  id: RetroSystemId;
  name: string;
  fullName: string;
  extensions: string[];
  maxBytes: number;
  supported: boolean;
  /** Returns an error message, or null when the file looks like a valid game for this system. */
  validate: (bytes: Uint8Array) => string | null;
}

const MB = 1024 * 1024;
const notYet = () => 'This system is not supported yet.';

export function validateNes(bytes: Uint8Array): string | null {
  if (bytes.length < 16 || bytes[0] !== 0x4e || bytes[1] !== 0x45 || bytes[2] !== 0x53 || bytes[3] !== 0x1a) {
    return "This doesn't look like an NES game file (missing the NES header).";
  }
  const prgBanks = bytes[4];
  if (prgBanks === 0) return 'This NES file has no program data.';
  const trainer = bytes[6] & 0x04 ? 512 : 0;
  if (bytes.length < 16 + trainer + prgBanks * 16384) return 'This NES file seems cut short or damaged.';
  return null;
}

const SNES_MAP_MODES = new Set([0x20, 0x21, 0x22, 0x23, 0x25, 0x30, 0x31, 0x32, 0x35]);

/** Checks a SNES game file: optional 512-byte copier header, then a plausible internal header (LoROM, HiROM or ExHiROM). */
export function validateSnes(bytes: Uint8Array): string | null {
  const copier = bytes.length % 1024 === 512 ? 512 : 0;
  const size = bytes.length - copier;
  if (size < 32 * 1024) return "This doesn't look like a SNES game file (it is too small).";
  if (size % 1024 !== 0) return 'This SNES file seems cut short or damaged.';
  const at = (o: number) => bytes[copier + o];
  const word = (o: number) => at(o) | (at(o + 1) << 8);
  for (const h of [0x7fc0, 0xffc0, 0x40ffc0]) {
    if (copier + h + 0x40 > bytes.length) continue;
    const checksumOk = (word(h + 0x1c) ^ word(h + 0x1e)) === 0xffff;
    const mapOk = SNES_MAP_MODES.has(at(h + 0x15) & 0xef);
    const reset = word(h + 0x3c);
    if ((checksumOk || mapOk) && reset >= 0x8000) return null;
  }
  return "This doesn't look like a SNES game file (no SNES header found).";
}

export const RETRO_SYSTEMS: RetroSystem[] = [
  { id: 'nes', name: 'NES', fullName: 'Nintendo Entertainment System', extensions: ['.nes'], maxBytes: 4 * MB, supported: true, validate: validateNes },
  { id: 'snes', name: 'SNES', fullName: 'Super Nintendo Entertainment System', extensions: ['.sfc', '.smc'], maxBytes: 8 * MB + 512, supported: true, validate: validateSnes },
  { id: 'gb', name: 'Game Boy', fullName: 'Game Boy', extensions: ['.gb'], maxBytes: 4 * MB, supported: false, validate: notYet },
  { id: 'gbc', name: 'Game Boy Color', fullName: 'Game Boy Color', extensions: ['.gbc'], maxBytes: 8 * MB, supported: false, validate: notYet },
  { id: 'gba', name: 'Game Boy Advance', fullName: 'Game Boy Advance', extensions: ['.gba'], maxBytes: 32 * MB, supported: false, validate: notYet },
  { id: 'genesis', name: 'Sega Genesis', fullName: 'Sega Genesis / Mega Drive', extensions: ['.md', '.gen', '.bin'], maxBytes: 8 * MB, supported: false, validate: notYet },
];

export function getSystem(id: string): RetroSystem | undefined {
  return RETRO_SYSTEMS.find((s) => s.id === id);
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

/** Validate a picked game file before it is stored. */
export function validateRomFile(systemId: string, fileName: string, bytes: Uint8Array): string | null {
  const system = getSystem(systemId);
  if (!system || !system.supported) return 'Please choose a supported system.';
  if (!system.extensions.includes(fileExtension(fileName))) {
    return `Please choose a ${system.extensions.join(' or ')} file for ${system.name}.`;
  }
  if (bytes.length === 0) return 'That file is empty.';
  if (bytes.length > system.maxBytes) return `That file is too big for ${system.name} (max ${system.maxBytes / MB} MB).`;
  return system.validate(bytes);
}

export const TITLE_MAX = 40;

/** Turn a file name like "my_game_(U)_[!].nes" into a friendly title like "My Game". */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '');
  const cleaned = base
    .replace(/[([{][^)\]}]*[)\]}]/g, ' ')
    .replace(/[_.-]+/g, ' ')
    .replace(/[^\p{L}\p{N} '&!-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TITLE_MAX)
    .trim();
  const titled = cleaned.replace(/\b\p{Ll}/gu, (c) => c.toUpperCase());
  return titled || 'My Game';
}

export function validateTitle(raw: string): string | null {
  const t = raw.trim();
  if (!t) return 'Please type a title.';
  if (t.length > TITLE_MAX) return `Keep the title to ${TITLE_MAX} characters or fewer.`;
  if (!/^[\p{L}\p{N} '&!.,:?-]+$/u.test(t)) return 'Use letters, numbers and simple punctuation only.';
  return null;
}

const IMAGE_MAX = 2 * MB;

/** Check artwork by its actual bytes (PNG, JPEG, WebP or GIF only; never SVG). Returns the MIME type or an error. */
export function sniffImage(bytes: Uint8Array): { type: string } | { error: string } {
  if (bytes.length > IMAGE_MAX) return { error: 'Pictures must be 2 MB or smaller.' };
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: 'image/png' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg' };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { type: 'image/gif' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return { type: 'image/webp' };
  }
  return { error: 'Please choose a PNG, JPEG, WebP or GIF picture.' };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
}
