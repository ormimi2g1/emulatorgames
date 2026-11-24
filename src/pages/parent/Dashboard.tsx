import { useEffect, useState } from 'react';
import { AvatarBadge } from '../../components/AvatarBadge';
import { ACHIEVEMENTS } from '../../data/achievements';
import { GAMES, isPlayable } from '../../games/catalog';
import { useApp } from '../../state/AppContext';
import { formatBytes, getStorageInfo, type StorageInfo } from '../../utils/storage';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <span className="muted text-sm font-semibold">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
      {hint && <span className="muted text-sm">{hint}</span>}
    </div>
  );
}

export function Dashboard() {
  const { profiles } = useApp();
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  useEffect(() => {
    void getStorageInfo().then(setStorage);
  }, []);
  const playable = GAMES.filter(isPlayable).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Players" value={String(profiles.length)} />
        <Stat label="Games ready" value={`${playable} / ${GAMES.length}`} hint="Others are coming soon" />
        <Stat label="Playing time" value="—" hint="Time tracking arrives with time limits" />
        <Stat label="Storage used" value={storage?.supported ? formatBytes(storage.usage) : 'n/a'} />
      </div>
      <section className="card flex flex-col gap-3 p-5" aria-label="Progress by player">
        <h2 className="text-xl font-bold">Progress by player</h2>
        {profiles.length === 0 && <p className="muted">No players yet. Add one under Players.</p>}
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => (
            <li key={p.id} className="surface-2 flex items-center gap-3 rounded-2xl p-3">
              <AvatarBadge avatarId={p.avatarId} size={44} />
              <span className="flex-1 font-semibold">{p.nickname}</span>
              <span className="muted text-sm">🏆 {p.achievements.length}/{ACHIEVEMENTS.length}</span>
              <span className="muted text-sm">❤️ {p.favorites.length}</span>
              <span className="muted text-sm">🎮 {p.recent.length ? `${p.recent.length} recent` : 'not played yet'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
