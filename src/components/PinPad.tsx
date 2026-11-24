import { useEffect, useState } from 'react';

interface Props {
  label: string;
  onSubmit: (pin: string) => void | Promise<void>;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  submitLabel?: string;
  error?: string | null;
}

/** Large on-screen number pad that also accepts the keyboard. */
export function PinPad({ label, onSubmit, disabled, minLength = 4, maxLength = 8, submitLabel = 'OK', error }: Props) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pin.length < minLength || busy || disabled) return;
    setBusy(true);
    try {
      await onSubmit(pin);
    } finally {
      setBusy(false);
      setPin('');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled || busy) return;
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < maxLength ? p + e.key : p));
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
      else if (e.key === 'Enter') void submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const press = (d: string) => setPin((p) => (p.length < maxLength ? p + d : p));
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-4">
      <p className="text-center text-lg font-semibold" id="pin-label">{label}</p>
      <div className="flex h-8 items-center gap-3" aria-live="polite" aria-label={`${pin.length} digits entered`} role="status">
        {Array.from({ length: Math.max(minLength, pin.length) }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? 'bg-sun' : 'surface-2 border-2 border-current opacity-40'}`} />
        ))}
      </div>
      {error && <p role="alert" className="text-center font-semibold text-coral">{error}</p>}
      <div className="grid w-full grid-cols-3 gap-3" role="group" aria-labelledby="pin-label">
        {keys.map((k) => (
          <button key={k} type="button" className="btn btn-ghost text-2xl" disabled={disabled || busy} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" className="btn btn-ghost" aria-label="Delete digit" disabled={disabled || busy} onClick={() => setPin((p) => p.slice(0, -1))}>
          ⌫
        </button>
        <button type="button" className="btn btn-ghost text-2xl" disabled={disabled || busy} onClick={() => press('0')}>
          0
        </button>
        <button type="button" className="btn btn-primary" disabled={disabled || busy || pin.length < minLength} onClick={() => void submit()}>
          {busy ? '…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
