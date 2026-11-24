import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParentAuth } from '../../auth/ParentAuthContext';
import { resetPinWithRecovery, validatePinFormat, type VerifyResult } from '../../auth/pin';
import { PinPad } from '../../components/PinPad';

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

export function describeFailure(res: VerifyResult, now = Date.now()): string {
  if (res.ok) return '';
  if (res.reason === 'no-pin') return 'No parent PIN is set up yet.';
  if (res.lockedUntil > now) return `Too many tries. Please wait ${Math.ceil((res.lockedUntil - now) / 1000)} seconds.`;
  if (res.reason === 'wrong') return res.attemptsBeforeLock > 0 ? `That's not right. ${res.attemptsBeforeLock} tries left before a short wait.` : "That's not right.";
  return 'Please try again.';
}

function Recovery({ onDone, onCancel }: { onDone: (code: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const err = validatePinFormat(pin);
        if (err) return setError(err);
        const res = await resetPinWithRecovery(code, pin);
        if (res.ok && res.recoveryCode) onDone(res.recoveryCode);
        else setError(describeFailure(res) || 'That recovery code is not right.');
      }}
    >
      <h2 className="text-2xl font-bold">Reset parent PIN</h2>
      <label className="flex flex-col gap-1 font-semibold">
        Recovery code
        <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX" autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        New PIN (4–8 digits)
        <input className="input" inputMode="numeric" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} autoComplete="new-password" />
      </label>
      {error && <p role="alert" className="font-semibold text-coral">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Back</button>
        <button type="submit" className="btn btn-primary">Reset PIN</button>
      </div>
    </form>
  );
}

export function ParentGate() {
  const { unlock, grant } = useParentAuth();
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [mode, setMode] = useState<'pin' | 'recover' | 'newcode'>('pin');
  const [newCode, setNewCode] = useState('');
  const now = useNow(lockedUntil > Date.now());
  const locked = lockedUntil > now;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 pt-6">
      <div className="card p-6">
        {mode === 'pin' && (
          <>
            <PinPad
              label="🔐 Grown-ups only: enter the parent PIN"
              disabled={locked}
              error={locked ? `Too many tries. Please wait ${Math.ceil((lockedUntil - now) / 1000)} seconds.` : error}
              onSubmit={async (pin) => {
                const res = await unlock(pin);
                if (!res.ok) {
                  setError(describeFailure(res));
                  if ('lockedUntil' in res) setLockedUntil(res.lockedUntil);
                }
              }}
            />
            <button type="button" className="mx-auto mt-4 block text-sm underline muted" onClick={() => setMode('recover')}>
              Forgot PIN?
            </button>
          </>
        )}
        {mode === 'recover' && (
          <Recovery
            onCancel={() => setMode('pin')}
            onDone={(code) => {
              setNewCode(code);
              setMode('newcode');
            }}
          />
        )}
        {mode === 'newcode' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">PIN updated</h2>
            <p className="muted">Here is your new recovery code. The old one no longer works.</p>
            <p className="surface-2 select-all rounded-2xl p-4 text-center font-mono text-2xl font-bold tracking-widest">{newCode}</p>
            <button className="btn btn-primary" onClick={grant}>Continue</button>
          </div>
        )}
      </div>
      <Link to="/" className="btn btn-ghost mx-auto">⬅ Back to games</Link>
    </div>
  );
}
