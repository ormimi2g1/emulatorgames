import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../auth/ParentAuthContext';
import { createParentPin, validatePinFormat } from '../auth/pin';
import { Background } from '../components/Background';
import { PinPad } from '../components/PinPad';
import { ProfileEditor } from '../components/ProfileEditor';
import { demoProfiles, makeProfile, saveProfile } from '../data/profiles';
import { useApp } from '../state/AppContext';

type Step = 'hello' | 'pin' | 'confirm' | 'recovery' | 'players' | 'custom';

/** First-run setup: the parent creates a PIN (there is no default) and the first player profiles. */
export function Welcome() {
  const { refresh, selectProfile } = useApp();
  const { grant } = useParentAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('hello');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState('');
  const [saved, setSaved] = useState(false);

  const finish = async (profileId?: string) => {
    await refresh();
    if (profileId) await selectProfile(profileId);
    navigate(profileId ? '/' : '/profiles', { replace: true });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Background />
      <div className="card pop-in w-full max-w-lg p-6 sm:p-8">
        {step === 'hello' && (
          <div className="flex flex-col items-center gap-5 text-center">
            <img src="/icons/icon.svg" alt="" className="h-28 w-28" />
            <h1 className="text-4xl font-bold">Kids Adventure Arcade</h1>
            <p className="text-xl text-sky">Big Adventures for Little Heroes</p>
            <p className="muted">Grown-up setup: create a parent PIN, then add the players. No accounts, emails or ads. Everything stays on this device.</p>
            <button className="btn btn-sun text-xl" onClick={() => setStep('pin')}>Let's set up ✨</button>
          </div>
        )}
        {step === 'pin' && (
          <PinPad
            label="Grown-ups: create a parent PIN (4–8 digits)"
            error={error}
            submitLabel="Next"
            onSubmit={(pin) => {
              const err = validatePinFormat(pin);
              if (err) return setError(err);
              setError(null);
              setFirstPin(pin);
              setStep('confirm');
            }}
          />
        )}
        {step === 'confirm' && (
          <PinPad
            label="Type the same PIN again"
            error={error}
            submitLabel="Save"
            onSubmit={async (pin) => {
              if (pin !== firstPin) {
                setError("Those PINs didn't match. Let's start again.");
                setFirstPin('');
                setStep('pin');
                return;
              }
              const { recoveryCode } = await createParentPin(pin);
              setError(null);
              setRecovery(recoveryCode);
              grant();
              setStep('recovery');
            }}
          />
        )}
        {step === 'recovery' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Save your recovery code</h2>
            <p className="muted">If you forget the PIN, this code lets you set a new one. Write it down and keep it away from little hands. It is shown only once.</p>
            <p className="surface-2 select-all rounded-2xl p-4 text-center font-mono text-2xl font-bold tracking-widest" data-testid="recovery-code">
              {recovery}
            </p>
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input type="checkbox" className="h-6 w-6 accent-purple" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              I wrote it down
            </label>
            <button className="btn btn-primary" disabled={!saved} onClick={() => setStep('players')}>Next</button>
          </div>
        )}
        {step === 'players' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Who's playing?</h2>
            <button
              className="btn btn-sun"
              onClick={async () => {
                for (const p of demoProfiles()) await saveProfile(p);
                await finish();
              }}
            >
              Add demo players Afa & Terdoo
            </button>
            <button className="btn btn-primary" onClick={() => setStep('custom')}>Create my own player</button>
            <p className="muted text-sm">You can add, edit or remove players any time in the Parent Zone.</p>
          </div>
        )}
        {step === 'custom' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">New player</h2>
            <ProfileEditor
              initial={makeProfile({ nickname: '', avatarId: 'lion' })}
              showAdvanced={false}
              saveLabel="Create player"
              onCancel={() => setStep('players')}
              onSave={async (p) => {
                await saveProfile(p);
                await finish(p.id);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
