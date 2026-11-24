import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { closeDb, DB_NAME } from '../data/db';
import { deleteProfile, listProfiles, makeProfile, saveProfile } from '../data/profiles';
import {
  deleteRetroGame,
  getRetroArt,
  getRomBytes,
  importRetroGame,
  listRetroGames,
  listSaves,
  markTested,
  readSave,
  retroGamesFor,
  setRetroArt,
  updateRetroGame,
  writeSave,
  type ImportInput,
} from './store';
import { sniffImage, titleFromFileName, validateNes, validateRomFile, validateTitle } from './systems';
import { parseRetroGameId, retroGameId, retroToGameDef } from './catalog';
import { isPlayable } from '../games/catalog';

const ROM = new Uint8Array(readFileSync(resolve(__dirname, '../../tests/fixtures/color-test.nes')));
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function input(over: Partial<ImportInput> = {}): ImportInput {
  return { system: 'nes', fileName: 'color-test.nes', bytes: ROM, title: 'Color Test', ageMin: 4, ageMax: 10, difficulty: 'adventurer', assignedProfiles: 'all', ...over };
}

describe('file validation', () => {
  it('accepts the homebrew test ROM', () => {
    expect(validateRomFile('nes', 'color-test.nes', ROM)).toBeNull();
    expect(validateRomFile('nes', 'COLOR-TEST.NES', ROM)).toBeNull();
  });
  it('rejects wrong extensions, unsupported systems, empty, oversized and fake files', () => {
    expect(validateRomFile('nes', 'game.exe', ROM)).toMatch(/\.nes/);
    expect(validateRomFile('nes', 'game.nes.js', ROM)).toMatch(/\.nes/);
    expect(validateRomFile('snes', 'game.sfc', ROM)).toMatch(/supported/);
    expect(validateRomFile('nes', 'game.nes', new Uint8Array())).toMatch(/empty/);
    expect(validateRomFile('nes', 'game.nes', new Uint8Array(5 * 1024 * 1024))).toMatch(/too big/);
    const fake = new TextEncoder().encode('<script>alert(1)</script>'.padEnd(20000, ' '));
    expect(validateRomFile('nes', 'game.nes', fake)).toMatch(/header/);
  });
  it('rejects truncated NES files', () => {
    expect(validateNes(ROM.slice(0, 4000))).toMatch(/cut short/);
    const noPrg = ROM.slice();
    noPrg[4] = 0;
    expect(validateNes(noPrg)).toMatch(/no program/);
  });
  it('makes friendly titles and validates them', () => {
    expect(titleFromFileName('super_fun_game_(U)_[!].nes')).toBe('Super Fun Game');
    expect(titleFromFileName('../../etc/<evil>.nes')).toBe('Evil');
    expect(titleFromFileName('().nes')).toBe('My Game');
    expect(validateTitle('Space Pals 2!')).toBeNull();
    expect(validateTitle('<img src=x onerror=alert(1)>')).not.toBeNull();
    expect(validateTitle('x'.repeat(41))).not.toBeNull();
  });
  it('only accepts real raster images, never SVG', () => {
    expect(sniffImage(PNG)).toEqual({ type: 'image/png' });
    expect(sniffImage(new TextEncoder().encode('<svg onload="alert(1)"></svg>'))).toHaveProperty('error');
  });
});

describe('retro game store', () => {
  it('imports a game hidden and untested, keeps the bytes, and blocks duplicates', async () => {
    const g = await importRetroGame(input({ art: PNG }));
    expect(g).toMatchObject({ title: 'Color Test', enabled: false, tested: false, hasArt: true, size: ROM.length });
    expect(new Uint8Array((await getRomBytes(g.id))!)).toEqual(ROM);
    expect((await getRetroArt(g.id))?.type).toBe('image/png');
    await expect(importRetroGame(input({ title: 'Again' }))).rejects.toThrow(/already/);
  });

  it('only lets a tested game be switched on, and respects player assignment', async () => {
    const kid = makeProfile({ nickname: 'Sunny', avatarId: 'lion' });
    const other = makeProfile({ nickname: 'Moon', avatarId: 'owl' });
    const g = await importRetroGame(input({ assignedProfiles: [kid.id] }));
    await expect(updateRetroGame(g.id, { enabled: true })).rejects.toThrow(/Test/);
    await markTested(g.id);
    await updateRetroGame(g.id, { enabled: true });
    const games = await listRetroGames();
    expect(retroGamesFor(kid, games).map((x) => x.id)).toEqual([g.id]);
    expect(retroGamesFor(other, games)).toEqual([]);
    await updateRetroGame(g.id, { enabled: false });
    expect(retroGamesFor(kid, await listRetroGames())).toEqual([]);
  });

  it('rejects bad titles and pictures on edit', async () => {
    const g = await importRetroGame(input());
    await expect(updateRetroGame(g.id, { title: '<b>' })).rejects.toThrow();
    await expect(setRetroArt(g.id, new TextEncoder().encode('<svg/>'))).rejects.toThrow();
  });

  it('keeps separate save slots per player and deletes saves with the game or the player', async () => {
    const kid = makeProfile({ nickname: 'Sunny', avatarId: 'lion' });
    await saveProfile(kid);
    const g = await importRetroGame(input());
    await writeSave(g.id, kid.id, 0, new Uint8Array([1, 2, 3]).buffer);
    await writeSave(g.id, kid.id, 2, new Uint8Array([4]).buffer);
    await writeSave(g.id, 'someone-else', 1, new Uint8Array([5]).buffer);
    expect((await listSaves(g.id, kid.id)).map((s) => s.slot)).toEqual([0, 2]);
    expect(new Uint8Array((await readSave(g.id, kid.id, 0))!.data)).toEqual(new Uint8Array([1, 2, 3]));
    await expect(writeSave(g.id, kid.id, 7, new ArrayBuffer(1))).rejects.toThrow();

    await deleteProfile(kid.id);
    expect(await listSaves(g.id, kid.id)).toEqual([]);
    expect(await listSaves(g.id)).toHaveLength(1);
    await deleteRetroGame(g.id);
    expect(await listSaves(g.id)).toEqual([]);
    expect(await getRomBytes(g.id)).toBeUndefined();
    expect(await listRetroGames()).toEqual([]);
  });

  it('turns imported games into playable arcade cards', async () => {
    const g = await importRetroGame(input());
    const def = retroToGameDef(g);
    expect(def.category).toBe('retro');
    expect(isPlayable(def)).toBe(true);
    expect(parseRetroGameId(retroGameId(g.id))).toBe(g.id);
    expect(parseRetroGameId('memory-magic')).toBeNull();
  });
});

describe('database upgrade', () => {
  it('keeps version 1 data (profiles, settings) when upgrading', async () => {
    await closeDb();
    const v1 = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('kv');
        db.createObjectStore('profiles', { keyPath: 'id' });
      },
    });
    const kid = makeProfile({ nickname: 'Oldie', avatarId: 'lion' });
    await v1.put('profiles', kid);
    v1.close();
    expect((await listProfiles()).map((p) => p.nickname)).toEqual(['Oldie']);
    expect(await listRetroGames()).toEqual([]);
  });
});
