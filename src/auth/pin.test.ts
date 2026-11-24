import { describe, expect, it } from 'vitest';
import { kvGet } from '../data/db';
import {
  BASE_LOCKOUT_MS,
  changePin,
  createParentPin,
  FREE_ATTEMPTS,
  generateRecoveryCode,
  hasParentPin,
  lockoutDurationMs,
  MAX_LOCKOUT_MS,
  resetPinWithRecovery,
  validatePinFormat,
  verifyPin,
} from './pin';

describe('validatePinFormat', () => {
  it.each(['1357', '9024', '13572468', '2580'])('accepts %s', (pin) => expect(validatePinFormat(pin)).toBeNull());
  it.each(['', '123', '123456789', 'abcd', '12a4', '0000', '1111', '1234', '4321', '7890', '0987', ' 1357'])('rejects %j', (pin) =>
    expect(validatePinFormat(pin)).not.toBeNull(),
  );
});

describe('lockoutDurationMs', () => {
  it('allows free attempts, then escalates and caps', () => {
    expect(lockoutDurationMs(FREE_ATTEMPTS - 1)).toBe(0);
    expect(lockoutDurationMs(FREE_ATTEMPTS)).toBe(BASE_LOCKOUT_MS);
    expect(lockoutDurationMs(FREE_ATTEMPTS + 1)).toBe(BASE_LOCKOUT_MS * 2);
    expect(lockoutDurationMs(50)).toBe(MAX_LOCKOUT_MS);
  });
});

describe('recovery codes', () => {
  it('have the XXXX-XXXX-XXXX shape and are random', () => {
    const a = generateRecoveryCode();
    expect(a).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(generateRecoveryCode()).not.toBe(a);
  });
});

describe('parent PIN lifecycle', () => {
  it('has no default PIN', async () => {
    expect(await hasParentPin()).toBe(false);
    expect(await verifyPin('0000')).toEqual({ ok: false, reason: 'no-pin' });
  });

  it('stores only a salted hash, never the PIN', async () => {
    await createParentPin('2580');
    const rec = await kvGet('parentAuth');
    expect(rec).toBeDefined();
    expect(JSON.stringify(rec)).not.toContain('2580');
    expect(rec!.iterations).toBeGreaterThanOrEqual(100_000);
    expect(rec!.pinSalt).not.toBe(rec!.recoverySalt);
  });

  it('refuses to create a second PIN or an invalid one', async () => {
    await expect(createParentPin('1234')).rejects.toThrow();
    await createParentPin('2580');
    await expect(createParentPin('1357')).rejects.toThrow(/already/);
  });

  it('verifies correct and wrong PINs', async () => {
    await createParentPin('2580');
    expect(await verifyPin('2580')).toEqual({ ok: true });
    const bad = await verifyPin('9999');
    expect(bad).toMatchObject({ ok: false, reason: 'wrong', attemptsBeforeLock: FREE_ATTEMPTS - 1 });
  });

  it('locks out after repeated failures, even for the right PIN, and unlocks later', async () => {
    await createParentPin('2580');
    const t0 = 1_000_000;
    for (let i = 0; i < FREE_ATTEMPTS; i++) await verifyPin('9999', t0);
    const locked = await verifyPin('2580', t0 + 1000);
    expect(locked).toMatchObject({ ok: false, reason: 'locked' });
    expect(await verifyPin('2580', t0 + BASE_LOCKOUT_MS + 1)).toEqual({ ok: true });
    // success resets the counter
    expect(await kvGet('lockout')).toEqual({ failures: 0, lockedUntil: 0 });
  });

  it('changes the PIN only with the current PIN', async () => {
    await createParentPin('2580');
    expect((await changePin('1111', '1357')).ok).toBe(false);
    const res = await changePin('2580', '1357');
    expect(res.ok).toBe(true);
    expect(res.recoveryCode).toBeTruthy();
    expect((await verifyPin('2580')).ok).toBe(false);
    expect((await verifyPin('1357')).ok).toBe(true);
  });

  it('resets a forgotten PIN with the recovery code (case and dash insensitive), once', async () => {
    const { recoveryCode } = await createParentPin('2580');
    expect((await resetPinWithRecovery('AAAA-BBBB-CCCC', '1357')).ok).toBe(false);
    const res = await resetPinWithRecovery(recoveryCode.toLowerCase().replace(/-/g, ' '), '1357');
    expect(res.ok).toBe(true);
    expect((await verifyPin('1357')).ok).toBe(true);
    // old recovery code is rotated
    expect((await resetPinWithRecovery(recoveryCode, '2468')).ok).toBe(false);
  });
});
