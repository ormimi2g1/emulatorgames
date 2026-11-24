import { describe, expect, it } from 'vitest';
import {
  deleteProfile,
  demoProfiles,
  getActiveProfileId,
  listProfiles,
  makeProfile,
  MAX_PROFILES,
  saveProfile,
  setActiveProfileId,
  toggleFavorite,
  validateNickname,
} from './profiles';
import { buildExport } from './exportData';
import { createParentPin } from '../auth/pin';

describe('validateNickname', () => {
  it.each(['Afa', 'Terdoo', 'Zoë 2', "D'Andre", 'Ada-Mae'])('accepts %s', (n) => expect(validateNickname(n)).toBeNull());
  it.each(['', '   ', 'x'.repeat(17), '<script>', 'a@b.com', '../../etc'])('rejects %j', (n) => expect(validateNickname(n)).not.toBeNull());
});

describe('profiles store', () => {
  it('creates, lists, updates and deletes profiles', async () => {
    const p = makeProfile({ nickname: '  Sunny ', avatarId: 'lion' });
    await saveProfile(p);
    let all = await listProfiles();
    expect(all).toHaveLength(1);
    expect(all[0].nickname).toBe('Sunny');
    await saveProfile({ ...all[0], nickname: 'Sunny B' });
    all = await listProfiles();
    expect(all[0].nickname).toBe('Sunny B');
    await deleteProfile(p.id);
    expect(await listProfiles()).toHaveLength(0);
  });

  it('rejects invalid nicknames on save', async () => {
    await expect(saveProfile(makeProfile({ nickname: '<b>', avatarId: 'lion' }))).rejects.toThrow();
  });

  it('caps the number of profiles', async () => {
    for (let i = 0; i < MAX_PROFILES; i++) await saveProfile(makeProfile({ nickname: `Kid ${i}`, avatarId: 'lion', createdAt: i }));
    await expect(saveProfile(makeProfile({ nickname: 'One more', avatarId: 'lion' }))).rejects.toThrow();
  });

  it('clears the active profile when it is deleted', async () => {
    const [afa] = demoProfiles();
    await saveProfile(afa);
    await setActiveProfileId(afa.id);
    expect(await getActiveProfileId()).toBe(afa.id);
    await deleteProfile(afa.id);
    expect(await getActiveProfileId()).toBeUndefined();
  });

  it('toggles favorites per profile', async () => {
    const [afa, terdoo] = demoProfiles();
    await saveProfile(afa);
    await saveProfile(terdoo);
    expect((await toggleFavorite(afa.id, 'memory-magic'))!.favorites).toEqual(['memory-magic']);
    expect((await toggleFavorite(afa.id, 'memory-magic'))!.favorites).toEqual([]);
    const t = (await listProfiles()).find((p) => p.id === terdoo.id)!;
    expect(t.favorites).toEqual([]);
  });

  it('demo profiles need no personal information', () => {
    for (const p of demoProfiles()) {
      expect(p.isDemo).toBe(true);
      expect(Object.keys(p)).not.toEqual(expect.arrayContaining(['email', 'birthDate', 'photo', 'location']));
    }
  });
});

describe('data export', () => {
  it('includes profiles and settings but never PIN data', async () => {
    await createParentPin('2580');
    await saveProfile(makeProfile({ nickname: 'Sunny', avatarId: 'lion' }));
    const data = await buildExport();
    expect(data.profiles).toHaveLength(1);
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/pinHash|recoveryHash|pinSalt|parentAuth/);
  });
});
