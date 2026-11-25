import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/Dialog';
import type { ChildProfile, Difficulty, RetroGame, SaveState } from '../../data/types';
import { retroGameId } from '../../retro/catalog';
import { RetroThumbnail } from '../../retro/RetroThumbnail';
import { deleteRetroGame, deleteSave, importRetroGame, listSaves, retroStorageBytes, setRetroArt, updateRetroGame } from '../../retro/store';
import { gameFromZip, isZip } from '../../retro/unzip';
import { getSystem, RETRO_SYSTEMS, titleFromFileName, validateRomFile, validateTitle } from '../../retro/systems';
import { useApp } from '../../state/AppContext';
import { formatBytes } from '../../utils/storage';

const AGES = Array.from({ length: 11 }, (_, i) => i + 2);
const DIFFS: { v: Difficulty; l: string }[] = [
  { v: 'little-explorer', l: 'Easy' },
  { v: 'adventurer', l: 'Medium' },
  { v: 'super-hero', l: 'Hard' },
];

async function readFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

interface Details {
  title: string;
  ageMin: number;
  ageMax: number;
  difficulty: Difficulty;
  assignedProfiles: 'all' | string[];
}

function DetailsFields({ value, onChange, profiles }: { value: Details; onChange: (d: Details) => void; profiles: ChildProfile[] }) {
  const assigned = value.assignedProfiles;
  const toggle = (id: string) => {
    const current = assigned === 'all' ? profiles.map((p) => p.id) : assigned;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({ ...value, assignedProfiles: next.length === profiles.length ? 'all' : next });
  };
  return (
    <>
      <label className="flex flex-col gap-1 font-semibold">
        Title
        <input className="input" value={value.title} maxLength={40} onChange={(e) => onChange({ ...value, title: e.target.value })} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 font-semibold">
          Age from
          <select className="input" value={value.ageMin} onChange={(e) => onChange({ ...value, ageMin: Number(e.target.value), ageMax: Math.max(value.ageMax, Number(e.target.value)) })}>
            {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          to
          <select className="input" value={value.ageMax} onChange={(e) => onChange({ ...value, ageMax: Number(e.target.value), ageMin: Math.min(value.ageMin, Number(e.target.value)) })}>
            {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          Difficulty
          <select className="input" value={value.difficulty} onChange={(e) => onChange({ ...value, difficulty: e.target.value as Difficulty })}>
            {DIFFS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
          </select>
        </label>
      </div>
      {profiles.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 font-semibold">Who can play it</legend>
          {profiles.map((p) => (
            <label key={p.id} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="h-6 w-6 accent-purple" checked={assigned === 'all' || assigned.includes(p.id)} onChange={() => toggle(p.id)} />
              {p.nickname}
            </label>
          ))}
        </fieldset>
      )}
    </>
  );
}

function ImportPanel({ onImported }: { onImported: (g: RetroGame) => void }) {
  const { profiles } = useApp();
  const [system, setSystem] = useState('nes');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [art, setArt] = useState<Uint8Array | null>(null);
  const [details, setDetails] = useState<Details>({ title: '', ageMin: 4, ageMax: 10, difficulty: 'adventurer', assignedProfiles: 'all' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const sys = getSystem(system)!;

  const pick = async (f: File | undefined) => {
    setError(null);
    setFile(null);
    if (!f) return;
    let name = f.name;
    let bytes = await readFile(f);
    // A zipped game: take the game file out (on this device; nothing is uploaded).
    if (name.toLowerCase().endsWith('.zip') || isZip(bytes)) {
      try {
        ({ name, bytes } = await gameFromZip(bytes, sys.extensions));
      } catch (e) {
        return setError((e as Error).message);
      }
    }
    const err = validateRomFile(system, name, bytes);
    if (err) return setError(err);
    setFile({ name, bytes });
    setDetails((d) => ({ ...d, title: titleFromFileName(name) }));
  };

  const submit = async () => {
    if (!file) return setError('Please choose a game file.');
    const tErr = validateTitle(details.title);
    if (tErr) return setError(tErr);
    setBusy(true);
    try {
      const game = await importRetroGame({ system, fileName: file.name, bytes: file.bytes, art, ...details });
      setFile(null);
      setArt(null);
      setInputKey((k) => k + 1);
      setDetails({ title: '', ageMin: 4, ageMax: 10, difficulty: 'adventurer', assignedProfiles: 'all' });
      onImported(game);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card flex flex-col gap-4 p-5" aria-label="Add a retro game">
      <h2 className="text-xl font-bold">➕ Add a retro game</h2>
      <p className="muted text-sm">
        Use only game files you own or are allowed to use. The file stays on this device and is never uploaded. The arcade does not include or
        download any games.
      </p>
      <label className="flex flex-col gap-1 font-semibold">
        1. System
        <select className="input" value={system} onChange={(e) => { setSystem(e.target.value); setFile(null); setInputKey((k) => k + 1); }}>
          {RETRO_SYSTEMS.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.supported}>
              {s.fullName}{s.supported ? '' : ' (coming later)'}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        2. Game file ({sys.extensions.join(', ')}, or a .zip with one inside)
        <input key={`rom-${inputKey}`} type="file" accept={[...sys.extensions, '.zip'].join(',')} className="input" onChange={(e) => void pick(e.target.files?.[0])} data-testid="rom-input" />
      </label>
      {file && (
        <>
          <p className="font-semibold text-grass">✅ Looks like a valid {sys.name} game ({formatBytes(file.bytes.length)}).</p>
          <DetailsFields value={details} onChange={setDetails} profiles={profiles} />
          <label className="flex flex-col gap-1 font-semibold">
            Picture (optional)
            <input key={`art-${inputKey}`} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input" onChange={async (e) => setArt(e.target.files?.[0] ? await readFile(e.target.files[0]) : null)} />
          </label>
        </>
      )}
      {error && <p role="alert" className="font-semibold text-coral">{error}</p>}
      <button type="button" className="btn btn-primary self-start" disabled={!file || busy} onClick={() => void submit()}>
        {busy ? 'Adding…' : 'Add game'}
      </button>
    </section>
  );
}

function SavesList({ game }: { game: RetroGame }) {
  const { profiles } = useApp();
  const [saves, setSaves] = useState<SaveState[] | null>(null);
  const load = () => void listSaves(game.id).then(setSaves);
  useEffect(load, [game.id]);
  if (!saves) return null;
  if (!saves.length) return <p className="muted text-sm">No saved spots yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {saves.map((s) => (
        <li key={s.id} className="surface-2 flex items-center gap-3 rounded-xl p-2 text-sm">
          <span className="flex-1">
            {profiles.find((p) => p.id === s.profileId)?.nickname ?? 'Removed player'} · {s.slot === 0 ? 'Auto save' : `Slot ${s.slot}`} ·{' '}
            {new Date(s.savedAt).toLocaleString()}
          </span>
          <button className="btn btn-ghost min-h-10 px-3 text-sm" onClick={async () => { await deleteSave(s.id); load(); }} aria-label={`Delete save ${s.slot}`}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

function GameRow({ game }: { game: RetroGame }) {
  const { profiles, refreshRetro } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [details, setDetails] = useState<Details>(game);
  const [error, setError] = useState<string | null>(null);
  const sys = getSystem(game.system);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await refreshRetro();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <li className="card flex flex-col gap-3 p-4" data-testid={`retro-row-${game.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-xl">
          <RetroThumbnail romId={game.id} title={game.title} hasArt={game.hasArt} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{game.title}</p>
          <p className="muted text-sm">
            {sys?.name} · {formatBytes(game.size)} · ages {game.ageMin}–{game.ageMax} ·{' '}
            {game.assignedProfiles === 'all' ? 'all players' : `${game.assignedProfiles.length} player(s)`}
          </p>
          <p className="text-sm font-semibold">
            {!game.tested ? '🧪 Not tested yet' : game.enabled ? '✅ Kids can play' : '⏸️ Hidden from kids'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sun" onClick={() => navigate(`/play/${encodeURIComponent(retroGameId(game.id))}?test=1`)}>▶ Test</button>
        <label className={`btn btn-ghost ${game.tested ? '' : 'opacity-60'}`}>
          <input
            type="checkbox"
            className="h-5 w-5 accent-purple"
            checked={game.enabled}
            disabled={!game.tested}
            onChange={(e) => void act(() => updateRetroGame(game.id, { enabled: e.target.checked }))}
          />
          Kids can play
        </label>
        <button className="btn btn-ghost" onClick={() => { setDetails(game); setEditing((v) => !v); }}>Edit</button>
        <button className="btn btn-ghost" onClick={() => setShowSaves((v) => !v)}>Saves</button>
        <button className="btn btn-danger" onClick={() => setRemoving(true)} aria-label={`Remove ${game.title}`}>Remove</button>
      </div>
      {!game.tested && <p className="muted text-sm">Tap Test to check the game starts. Then you can switch it on for kids.</p>}
      {error && <p role="alert" className="font-semibold text-coral">{error}</p>}
      {editing && (
        <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
          <DetailsFields value={details} onChange={setDetails} profiles={profiles} />
          <label className="flex flex-col gap-1 font-semibold">
            New picture
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="input"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await act(async () => setRetroArt(game.id, await readFile(f)));
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {game.hasArt && <button className="btn btn-ghost" onClick={() => void act(() => setRetroArt(game.id, null))}>Remove picture</button>}
            <button className="btn btn-primary" onClick={() => void act(async () => { await updateRetroGame(game.id, details); setEditing(false); })}>Save</button>
          </div>
        </div>
      )}
      {showSaves && <SavesList game={game} />}
      <Dialog open={removing} title={`Remove ${game.title}?`} onClose={() => setRemoving(false)}>
        <p className="mb-4">This deletes the game file and all its saved spots from this device.</p>
        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={() => setRemoving(false)}>Keep</button>
          <button className="btn btn-danger" onClick={() => void act(async () => { await deleteRetroGame(game.id); setRemoving(false); })}>Remove</button>
        </div>
      </Dialog>
    </li>
  );
}

export function RetroGames() {
  const { retroGames, refreshRetro } = useApp();
  const [added, setAdded] = useState<RetroGame | null>(null);
  const [usage, setUsage] = useState<{ games: number; saves: number } | null>(null);
  useEffect(() => {
    void retroStorageBytes().then(setUsage);
  }, [retroGames]);

  return (
    <div className="flex flex-col gap-4">
      <ImportPanel
        onImported={async (g) => {
          setAdded(g);
          await refreshRetro();
        }}
      />
      {added && (
        <p role="status" className="card p-4 font-semibold">
          🎉 Added “{added.title}”. Tap <strong>Test</strong> below to try it.
        </p>
      )}
      <section className="flex flex-col gap-3" aria-label="Retro games">
        <h2 className="text-xl font-bold">Your retro games</h2>
        {usage && (
          <p className="muted text-sm">Using {formatBytes(usage.games)} for games and {formatBytes(usage.saves)} for saved spots.</p>
        )}
        {retroGames.length === 0 ? <p className="card p-5">No retro games yet.</p> : (
          <ul className="flex flex-col gap-3">
            {retroGames.map((g) => <GameRow key={`${g.id}-${g.updatedAt}`} game={g} />)}
          </ul>
        )}
      </section>
      <section className="card flex flex-col gap-2 p-5">
        <h2 className="text-xl font-bold">Controls</h2>
        <ul className="muted list-disc pl-5">
          <li>NES keyboard: arrows move, Z = A button, X = B button, Enter = Start, V = Select.</li>
          <li>SNES keyboard: arrows move, Z = A, X = B, A key = X, S = Y, Q = L, E = R, Enter = Start, V = Select.</li>
          <li>Phones and tablets show on-screen buttons automatically.</li>
          <li>USB and Bluetooth controllers work when the browser supports them. Change buttons or set up player 2 in the console's ⚙️ / 🎮 menu while a game runs.</li>
        </ul>
      </section>
    </div>
  );
}
