import { useEffect, useState } from 'react';
import type { ChildProfile } from '../data/types';
import { evaluate, formatMinutes, type DayUsage } from './rules';
import { loadDay } from './store';

/** "45 min of playtime left today" for the home screen, when limits are on. */
export function PlaytimeBadge({ profile }: { profile: ChildProfile }) {
  const [usage, setUsage] = useState<DayUsage | null>(null);
  useEffect(() => {
    void loadDay(profile.id).then(setUsage);
  }, [profile.id]);
  if (!usage || (!profile.playtime?.enabled && !profile.playPaused)) return null;
  const v = evaluate(profile.playtime, !!profile.playPaused, usage, null, Date.now());
  let text = '';
  if (v.kind === 'ok') text = `⏰ ${formatMinutes(v.remaining)} of playtime left today`;
  else if (v.kind === 'break') text = '🧘 Break time! Games are back soon.';
  else if (v.kind === 'stop') text = v.reason === 'hours' ? "🛏️ It's not game time right now" : v.reason === 'paused' ? '✋ A grown-up paused the games' : '🌙 All done for today. Great playing!';
  if (!text) return null;
  return (
    <p className="surface-2 mt-2 inline-block rounded-full px-4 py-2 font-semibold" data-testid="playtime-badge">{text}</p>
  );
}
