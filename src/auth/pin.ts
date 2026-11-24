import { kvGet, kvSet } from '../data/db';
import type { LockoutState, ParentAuthRecord } from '../data/types';

/**
 * Local parent authentication.
 * - No default PIN: the parent creates one on first run.
 * - PIN and recovery code are stored only as salted PBKDF2-SHA256 hashes.
 * - Failed attempts trigger an escalating, persisted lockout.
 * Limitation: this protects against kids on the same device, not against
 * someone who can open browser developer tools or clear site data.
 */

export const PBKDF2_ITERATIONS = 210_000;
export const FREE_ATTEMPTS = 5;
export const BASE_LOCKOUT_MS = 30_000;
export const MAX_LOCKOUT_MS = 15 * 60_000;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const enc = new TextEncoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function validatePinFormat(pin: string): string | null {
  if (!/^\d{4,8}$/.test(pin)) return 'PIN must be 4 to 8 digits.';
  if (/^(\d)\1+$/.test(pin)) return 'Please avoid repeating the same digit.';
  const digits = pin.split('').map(Number);
  const up = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 1) % 10);
  const down = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 9) % 10);
  if (up || down) return 'Please avoid simple sequences like 1234.';
  return null;
}

export async function hashSecret(secret: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return toB64(bits);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join('')).join('-');
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function lockoutDurationMs(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(MAX_LOCKOUT_MS, BASE_LOCKOUT_MS * 2 ** (failures - FREE_ATTEMPTS));
}

export async function hasParentPin(): Promise<boolean> {
  return !!(await kvGet('parentAuth'));
}

export async function createParentPin(pin: string): Promise<{ recoveryCode: string }> {
  const err = validatePinFormat(pin);
  if (err) throw new Error(err);
  if (await hasParentPin()) throw new Error('A parent PIN already exists.');
  const recoveryCode = generateRecoveryCode();
  await writeAuth(pin, recoveryCode);
  await kvSet('lockout', { failures: 0, lockedUntil: 0 });
  return { recoveryCode };
}

async function writeAuth(pin: string, recoveryCode: string, createdAt = Date.now()): Promise<void> {
  const pinSalt = crypto.getRandomValues(new Uint8Array(16));
  const recoverySalt = crypto.getRandomValues(new Uint8Array(16));
  const record: ParentAuthRecord = {
    version: 1,
    algorithm: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    pinSalt: toB64(pinSalt),
    pinHash: await hashSecret(pin, pinSalt),
    recoverySalt: toB64(recoverySalt),
    recoveryHash: await hashSecret(normalizeRecoveryCode(recoveryCode), recoverySalt),
    createdAt,
    updatedAt: Date.now(),
  };
  await kvSet('parentAuth', record);
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'no-pin' }
  | { ok: false; reason: 'locked'; lockedUntil: number }
  | { ok: false; reason: 'wrong'; attemptsBeforeLock: number; lockedUntil: number };

async function getLockout(): Promise<LockoutState> {
  return (await kvGet('lockout')) ?? { failures: 0, lockedUntil: 0 };
}

async function checkSecret(
  secret: string,
  pick: (r: ParentAuthRecord) => { salt: string; hash: string },
  now: number,
): Promise<VerifyResult> {
  const record = await kvGet('parentAuth');
  if (!record) return { ok: false, reason: 'no-pin' };
  const lock = await getLockout();
  if (lock.lockedUntil > now) return { ok: false, reason: 'locked', lockedUntil: lock.lockedUntil };
  const { salt, hash } = pick(record);
  const candidate = await hashSecret(secret, fromB64(salt), record.iterations);
  if (timingSafeEqual(candidate, hash)) {
    await kvSet('lockout', { failures: 0, lockedUntil: 0 });
    return { ok: true };
  }
  const failures = lock.failures + 1;
  const duration = lockoutDurationMs(failures);
  const lockedUntil = duration ? now + duration : 0;
  await kvSet('lockout', { failures, lockedUntil });
  return { ok: false, reason: 'wrong', attemptsBeforeLock: Math.max(0, FREE_ATTEMPTS - failures), lockedUntil };
}

export function verifyPin(pin: string, now = Date.now()): Promise<VerifyResult> {
  return checkSecret(pin, (r) => ({ salt: r.pinSalt, hash: r.pinHash }), now);
}

export async function changePin(currentPin: string, newPin: string): Promise<VerifyResult & { recoveryCode?: string }> {
  const err = validatePinFormat(newPin);
  if (err) throw new Error(err);
  const res = await verifyPin(currentPin);
  if (!res.ok) return res;
  const recoveryCode = generateRecoveryCode();
  const existing = await kvGet('parentAuth');
  await writeAuth(newPin, recoveryCode, existing?.createdAt);
  return { ok: true, recoveryCode };
}

/** Reset a forgotten PIN using the recovery code shown at setup. Issues a new recovery code. */
export async function resetPinWithRecovery(
  code: string,
  newPin: string,
  now = Date.now(),
): Promise<VerifyResult & { recoveryCode?: string }> {
  const err = validatePinFormat(newPin);
  if (err) throw new Error(err);
  const res = await checkSecret(normalizeRecoveryCode(code), (r) => ({ salt: r.recoverySalt, hash: r.recoveryHash }), now);
  if (!res.ok) return res;
  const recoveryCode = generateRecoveryCode();
  const existing = await kvGet('parentAuth');
  await writeAuth(newPin, recoveryCode, existing?.createdAt);
  return { ok: true, recoveryCode };
}
