import { getAvatar } from '../data/avatars';

export function AvatarBadge({ avatarId, size = 56, ring }: { avatarId: string; size?: number; ring?: boolean }) {
  const a = getAvatar(avatarId);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${ring ? 'ring-4 ring-white/80' : ''}`}
      style={{ width: size, height: size, background: a.bg, fontSize: size * 0.55, lineHeight: 1 }}
    >
      {a.emoji}
    </span>
  );
}
