import { useState } from 'react';
import { AVATARS } from '../data/avatars';
import { validateNickname } from '../data/profiles';
import type { AgeRange, ChildProfile, Difficulty } from '../data/types';
import { GAMES } from '../games/catalog';

const AGE_OPTIONS: { v: AgeRange; l: string }[] = [
  { v: '', l: 'Not set' },
  { v: '3-4', l: '3–4' },
  { v: '5-6', l: '5–6' },
  { v: '7-8', l: '7–8' },
  { v: '9-10', l: '9–10' },
];
const DIFFS: { v: Difficulty; l: string }[] = [
  { v: 'little-explorer', l: 'Little Explorer' },
  { v: 'adventurer', l: 'Adventurer' },
  { v: 'super-hero', l: 'Super Hero' },
];

interface Props {
  initial: ChildProfile;
  onSave: (p: ChildProfile) => Promise<void>;
  onCancel?: () => void;
  showAdvanced?: boolean;
  saveLabel?: string;
}

export function ProfileEditor({ initial, onSave, onCancel, showAdvanced = true, saveLabel = 'Save' }: Props) {
  const [p, setP] = useState<ChildProfile>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const err = validateNickname(p.nickname);
    if (err) return setError(err);
    setBusy(true);
    try {
      await onSave({ ...p, nickname: p.nickname.trim() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const assigned = p.assignedGames;
  const toggleGame = (id: string) => {
    const current = assigned === 'all' ? GAMES.map((g) => g.id) : assigned;
    const next = current.includes(id) ? current.filter((g) => g !== id) : [...current, id];
    setP({ ...p, assignedGames: next.length === GAMES.length ? 'all' : next });
  };
  const toggleA11y = (k: keyof ChildProfile['accessibility']) =>
    setP({ ...p, accessibility: { ...p.accessibility, [k]: !p.accessibility[k] } });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="flex flex-col gap-1 font-semibold">
        Nickname
        <input
          className="input"
          value={p.nickname}
          maxLength={16}
          autoComplete="off"
          onChange={(e) => {
            setError(null);
            setP({ ...p, nickname: e.target.value });
          }}
          placeholder="e.g. Sunny"
        />
        <span className="muted text-sm font-normal">A nickname only. No real names needed.</span>
      </label>

      <fieldset>
        <legend className="mb-2 font-semibold">Pick an avatar</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-label={a.label}
              aria-pressed={p.avatarId === a.id}
              onClick={() => setP({ ...p, avatarId: a.id })}
              className={`flex aspect-square items-center justify-center rounded-2xl text-4xl ${p.avatarId === a.id ? 'ring-4 ring-sun' : ''}`}
              style={{ background: a.bg }}
            >
              {a.emoji}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 font-semibold">
          Age range (optional)
          <select className="input" value={p.ageRange} onChange={(e) => setP({ ...p, ageRange: e.target.value as AgeRange })}>
            {AGE_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          Difficulty
          <select className="input" value={p.difficulty} onChange={(e) => setP({ ...p, difficulty: e.target.value as Difficulty })}>
            {DIFFS.map((o) => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </select>
        </label>
      </div>

      {showAdvanced && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">Accessibility</legend>
            {(
              [
                ['highContrast', 'High contrast'],
                ['reducedMotion', 'Reduce motion'],
                ['largeControls', 'Large game buttons'],
                ['leftHanded', 'Left-handed controls'],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="h-6 w-6 accent-purple" checked={p.accessibility[k]} onChange={() => toggleA11y(k)} />
                {l}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">Games this player can see</legend>
            {GAMES.map((g) => (
              <label key={g.id} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-purple"
                  checked={assigned === 'all' || assigned.includes(g.id)}
                  onChange={() => toggleGame(g.id)}
                />
                {g.title}
              </label>
            ))}
          </fieldset>
        </>
      )}

      {error && <p role="alert" className="font-semibold text-coral">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>{saveLabel}</button>
      </div>
    </form>
  );
}
