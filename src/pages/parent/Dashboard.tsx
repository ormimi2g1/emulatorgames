import { useEffect, useState } from 'react';
import { AvatarBadge } from '../../components/AvatarBadge';
import { ACHIEVEMENTS } from '../../data/achievements';
import { loadProgress } from '../../data/progress';
import { GAMES, isPlayable } from '../../games/catalog';
import { parseRetroGameId } from '../../retro/catalog';
import { formatMinutes, summarize, type DayUsage, type UsageSummary } from '../../playtime/rules';
import { listDays } from '../../playtime/store';
import { useApp } from '../../state/AppContext';
import { formatBytes, getStorageInfo, type StorageInfo } from '../../utils/storage';

const LEARNING = [
  { id: 'math-quest', label: 'Math Quest' },
  { id: 'word-adventure', label: 'Word Adventure' },
  { id: 'memory-magic', label: 'Memory Magic' },
];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <span className="muted text-sm font-semibold">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
      {hint && <span className="muted text-sm">{hint}</span>}
    </div>
  );
}

type Learning = Record<string, Record<string, { stars: number; plays: number } | undefined>>;

export function Dashboard() {
  const { profiles, retroGames } = useApp();
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [days, setDays] = useState<DayUsage[]>([]);
  const [learning, setLearning] = useState<Learning>({});
  useEffect(() => {
    void getStorageInfo().then(setStorage);
    void listDays().then(setDays);
  }, []);
  useEffect(() => {
    void Promise.all(
      profiles.map(async (p) => [p.id, Object.fromEntries(await Promise.all(LEARNING.map(async (l) => [l.id, await loadProgress<{ stars: number; plays: number }>(l.id, p.id)])))] as const),
    ).then((rows) => setLearning(Object.fromEntries(rows)));
  }, [profiles]);

  const now = Date.now();
  const all = summarize(days, now);
  const per = (id: string): UsageSummary => summarize(days.filter((d) => d.profileId === id), now);
  const title = (id: string) => {
    const rom = parseRetroGameId(id);
    return rom ? retroGames.find((g) => g.id === rom)?.title ?? 'Removed retro game' : GAMES.find((g) => g.id === id)?.title ?? id;
  };
  const playable = GAMES.filter(isPlayable).length + retroGames.filter((g) => g.enabled && g.tested).length;
  const total = GAMES.length + retroGames.length;
  const recent = profiles
    .flatMap((p) => p.recent.map((r) => ({ ...r, who: p.nickname })))
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Played today" value={formatMinutes(all.today)} hint="All players" />
        <Stat label="Last 7 days" value={formatMinutes(all.week)} />
        <Stat label="Total playing time" value={formatMinutes(all.total)} />
        <Stat label="Games ready" value={`${playable} / ${total}`} hint={`Storage: ${storage?.supported ? formatBytes(storage.usage) : 'n/a'}`} />
      </div>

      <section className="card flex flex-col gap-3 p-5" aria-label="Progress by player">
        <h2 className="text-xl font-bold">Progress by player</h2>
        {profiles.length === 0 && <p className="muted">No players yet. Add one under Players.</p>}
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => {
            const s = per(p.id);
            return (
              <li key={p.id} className="surface-2 flex flex-col gap-2 rounded-2xl p-3" data-testid={`progress-${p.nickname}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <AvatarBadge avatarId={p.avatarId} size={44} />
                  <span className="flex-1 font-semibold">{p.nickname}</span>
                  <span className="text-sm">⏱️ Today {formatMinutes(s.today)} · Week {formatMinutes(s.week)}</span>
                  <span className="muted text-sm">🏆 {p.achievements.length}/{ACHIEVEMENTS.length}</span>
                  <span className="muted text-sm">❤️ {p.favorites.length}</span>
                </div>
                <div className="muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {LEARNING.map((l) => {
                    const r = learning[p.id]?.[l.id];
                    return (
                      <span key={l.id}>
                        {l.label}: {r?.plays ? `${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)} best, ${r.plays} ${r.plays === 1 ? 'round' : 'rounds'}` : 'not yet'}
                      </span>
                    );
                  })}
                  {s.topGames[0] && <span>Most played: {title(s.topGames[0][0])}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card flex flex-col gap-3 p-5" aria-label="Most played games">
          <h2 className="text-xl font-bold">Most played games</h2>
          {all.topGames.length === 0 && <p className="muted">No playing time yet.</p>}
          <ol className="flex flex-col gap-2">
            {all.topGames.slice(0, 5).map(([id, sec]) => (
              <li key={id} className="flex justify-between gap-3">
                <span>{title(id)}</span>
                <span className="muted">{formatMinutes(sec)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="card flex flex-col gap-3 p-5" aria-label="Recently played">
          <h2 className="text-xl font-bold">Recently played</h2>
          {recent.length === 0 && <p className="muted">Nothing played yet.</p>}
          <ul className="flex flex-col gap-2">
            {recent.map((r) => (
              <li key={`${r.who}-${r.gameId}`} className="flex justify-between gap-3">
                <span>{title(r.gameId)} <span className="muted">· {r.who}</span></span>
                <span className="muted">{new Date(r.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
