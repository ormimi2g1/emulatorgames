import { useState } from 'react';
import { changePin, validatePinFormat } from '../../auth/pin';
import { describeFailure } from './ParentGate';

export function Security() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [code, setCode] = useState('');
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="card flex flex-col gap-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setCode('');
          if (next !== again) return setMsg({ ok: false, text: "The new PINs don't match." });
          const err = validatePinFormat(next);
          if (err) return setMsg({ ok: false, text: err });
          const res = await changePin(current, next);
          if (res.ok) {
            setMsg({ ok: true, text: 'PIN changed. Save your new recovery code:' });
            setCode(res.recoveryCode ?? '');
            setCurrent('');
            setNext('');
            setAgain('');
          } else setMsg({ ok: false, text: describeFailure(res) });
        }}
      >
        <h2 className="text-xl font-bold">Change parent PIN</h2>
        {(
          [
            ['Current PIN', current, setCurrent, 'current-password'],
            ['New PIN', next, setNext, 'new-password'],
            ['New PIN again', again, setAgain, 'new-password'],
          ] as const
        ).map(([label, value, setter, ac]) => (
          <label key={label} className="flex flex-col gap-1 font-semibold">
            {label}
            <input className="input" type="password" inputMode="numeric" autoComplete={ac} value={value} onChange={(e) => setter(digits(e.target.value))} />
          </label>
        ))}
        {msg && <p role="alert" className={`font-semibold ${msg.ok ? 'text-grass' : 'text-coral'}`}>{msg.text}</p>}
        {code && <p className="surface-2 select-all rounded-2xl p-4 text-center font-mono text-2xl font-bold tracking-widest">{code}</p>}
        <button type="submit" className="btn btn-primary self-start">Change PIN</button>
      </form>
      <section className="card flex flex-col gap-2 p-5">
        <h2 className="text-xl font-bold">How the parent lock works</h2>
        <ul className="muted list-disc pl-5">
          <li>The PIN is stored only as a salted, slow hash on this device.</li>
          <li>After 5 wrong tries there is a wait that grows with each extra try (up to 15 minutes).</li>
          <li>The Parent Zone locks itself after 10 minutes without activity, and when the app is reloaded.</li>
          <li>This keeps little ones out of the settings. It cannot stop someone who clears the browser's site data, and settings do not sync between devices.</li>
        </ul>
      </section>
    </div>
  );
}
