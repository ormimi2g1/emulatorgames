import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gameFromZip, isZip, listZip } from './unzip';
import { validateRomFile } from './systems';

const fixture = (f: string) => new Uint8Array(readFileSync(resolve(process.cwd(), 'tests/fixtures', f)));

/** A minimal "stored" (uncompressed) zip. CRCs are left at 0; the reader doesn't need them. */
function storedZip(files: { name: string; data: Uint8Array; flags?: number }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: number[] = [];
  const central: number[] = [];
  const u16 = (a: number[], n: number) => a.push(n & 0xff, (n >> 8) & 0xff);
  const u32 = (a: number[], n: number) => a.push(n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff);
  for (const f of files) {
    const name = enc.encode(f.name);
    const offset = parts.length;
    u32(parts, 0x04034b50); u16(parts, 20); u16(parts, f.flags ?? 0); u16(parts, 0); u16(parts, 0); u16(parts, 0);
    u32(parts, 0); u32(parts, f.data.length); u32(parts, f.data.length); u16(parts, name.length); u16(parts, 0);
    parts.push(...name, ...f.data);
    u32(central, 0x02014b50); u16(central, 20); u16(central, 20); u16(central, f.flags ?? 0); u16(central, 0); u16(central, 0); u16(central, 0);
    u32(central, 0); u32(central, f.data.length); u32(central, f.data.length); u16(central, name.length);
    u16(central, 0); u16(central, 0); u16(central, 0); u16(central, 0); u32(central, 0); u32(central, offset);
    central.push(...name);
  }
  const cdStart = parts.length;
  const end: number[] = [];
  u32(end, 0x06054b50); u16(end, 0); u16(end, 0); u16(end, files.length); u16(end, files.length);
  u32(end, central.length); u32(end, cdStart); u16(end, 0);
  return new Uint8Array([...parts, ...central, ...end]);
}

describe('zipped game files', () => {
  it('takes a compressed SNES game out of a zip (in a folder, next to a readme)', async () => {
    const zip = fixture('color-test-sfc.zip');
    expect(isZip(zip)).toBe(true);
    expect(listZip(zip).map((e) => e.name)).toEqual(['Color Test (CC0)/color-test.sfc', 'readme.txt']);
    const game = await gameFromZip(zip, ['.sfc', '.smc']);
    expect(game.name).toBe('color-test.sfc');
    expect(game.bytes).toEqual(fixture('color-test.sfc'));
    expect(validateRomFile('snes', game.name, game.bytes)).toBeNull();
  });

  it('reads stored (uncompressed) entries too', async () => {
    const nes = fixture('color-test.nes');
    const game = await gameFromZip(storedZip([{ name: 'Color Test.nes', data: nes }]), ['.nes']);
    expect(game.bytes).toEqual(nes);
  });

  it('explains what is wrong instead of failing silently', async () => {
    const nes = fixture('color-test.nes');
    await expect(gameFromZip(storedZip([{ name: 'game.nes', data: nes }]), ['.sfc', '.smc'])).rejects.toThrow(/no \.sfc or \.smc file inside \(it has \.nes\)/);
    await expect(gameFromZip(storedZip([{ name: 'a.nes', data: nes }, { name: 'b.nes', data: nes }]), ['.nes'])).rejects.toThrow(/more than one game/);
    await expect(gameFromZip(storedZip([{ name: 'a.nes', data: nes, flags: 1 }]), ['.nes'])).rejects.toThrow(/password/);
    await expect(gameFromZip(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), ['.nes'])).rejects.toThrow(/damaged/);
    expect(isZip(nes)).toBe(false);
  });
});
