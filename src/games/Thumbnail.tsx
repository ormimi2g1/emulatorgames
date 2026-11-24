/** Original vector thumbnails for each game (no third-party artwork). */

function Frame({ from, to, children, label }: { from: string; to: string; children: React.ReactNode; label: string }) {
  const gid = `g-${label.replace(/\W/g, '')}`;
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label={label} className="block h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gid})`} />
      {children}
    </svg>
  );
}

function Star({ x, y, r = 10, fill = '#FFD54A' }: { x: number; y: number; r?: number; fill?: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} />;
}

function Kid({ x, y, skin, shirt, hair, small }: { x: number; y: number; skin: string; shirt: string; hair: string; small?: boolean }) {
  const s = small ? 0.8 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-14" y="10" width="28" height="34" rx="12" fill={shirt} />
      <circle cx="0" cy="0" r="18" fill={skin} />
      <path d="M-18 -2 Q-18 -22 0 -22 Q18 -22 18 -2 Q10 -12 0 -12 Q-10 -12 -18 -2Z" fill={hair} />
      {!small && <circle cx="14" cy="-18" r="7" fill={hair} />}
      <circle cx="-6" cy="0" r="2.6" fill="#101936" />
      <circle cx="6" cy="0" r="2.6" fill="#101936" />
      <path d="M-6 8 Q0 13 6 8" stroke="#101936" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="-12" y="42" width="9" height="12" rx="4" fill="#101936" />
      <rect x="3" y="42" width="9" height="12" rx="4" fill="#101936" />
    </g>
  );
}

const ART: Record<string, (label: string) => React.ReactElement> = {
  'afa-terdoo': (label) => (
    <Frame from="#38BDF8" to="#A7F3D0" label={label}>
      {['#FF686B', '#FFD54A', '#49D17D', '#38BDF8', '#7357FF'].map((c, i) => (
        <path key={c} d={`M20 ${150 - i * 0} A140 ${120 - i * 12} 0 0 1 300 150`} stroke={c} strokeWidth="10" fill="none" transform={`translate(0 ${i * 11})`} opacity=".9" />
      ))}
      <ellipse cx="80" cy="190" rx="140" ry="50" fill="#49D17D" />
      <ellipse cx="260" cy="195" rx="120" ry="45" fill="#34B86A" />
      <rect x="214" y="70" width="34" height="34" rx="6" fill="#FFD54A" stroke="#C98B12" strokeWidth="4" />
      <Star x={231} y={87} r={9} fill="#fff" />
      <polygon points="150,48 160,66 150,84 140,66" fill="#7357FF" stroke="#fff" strokeWidth="3" />
      <Kid x={110} y={112} skin="#8B5A3C" shirt="#7357FF" hair="#1F130D" />
      <Kid x={170} y={122} skin="#7A4B2F" shirt="#FF686B" hair="#1F130D" small />
    </Frame>
  ),
  'retro-console': (label) => (
    <Frame from="#7357FF" to="#101936" label={label}>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 28} y="140" width="26" height="40" fill={i % 2 ? '#38BDF8' : '#49D17D'} opacity=".25" />
      ))}
      <rect x="70" y="50" width="180" height="86" rx="26" fill="#E5E7F5" />
      <rect x="70" y="50" width="180" height="86" rx="26" fill="none" stroke="#fff" strokeWidth="4" />
      <rect x="102" y="74" width="12" height="38" rx="3" fill="#101936" />
      <rect x="89" y="87" width="38" height="12" rx="3" fill="#101936" />
      <circle cx="206" cy="100" r="11" fill="#FF686B" />
      <circle cx="228" cy="82" r="11" fill="#FFD54A" />
      <rect x="146" y="98" width="14" height="6" rx="3" fill="#6B7280" />
      <rect x="164" y="98" width="14" height="6" rx="3" fill="#6B7280" />
      <Star x={40} y={40} r={8} /><Star x={280} y={34} r={6} fill="#38BDF8" /><Star x={285} y={150} r={7} fill="#49D17D" />
    </Frame>
  ),
  'rainbow-kart': (label) => (
    <Frame from="#FFD54A" to="#FF9F68" label={label}>
      <path d="M-10 150 Q160 60 330 150 L330 190 L-10 190Z" fill="#6B7280" />
      <path d="M-10 150 Q160 60 330 150" stroke="#fff" strokeWidth="5" strokeDasharray="18 14" fill="none" />
      <g transform="translate(130 104)">
        <rect x="-8" y="10" width="76" height="26" rx="12" fill="#FF686B" />
        <rect x="18" y="-6" width="26" height="22" rx="8" fill="#7357FF" />
        <circle cx="10" cy="40" r="11" fill="#101936" /><circle cx="52" cy="40" r="11" fill="#101936" />
        <circle cx="10" cy="40" r="4" fill="#FFD54A" /><circle cx="52" cy="40" r="4" fill="#FFD54A" />
      </g>
      {['#FF686B', '#FFD54A', '#49D17D', '#38BDF8', '#7357FF'].map((c, i) => (
        <rect key={c} x={20} y={108 + i * 6} width={100 - i * 8} height="5" rx="2" fill={c} />
      ))}
      <rect x="260" y="30" width="8" height="70" fill="#101936" />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={268 + c * 12} y={30 + r * 12} width="12" height="12" fill={(r + c) % 2 ? '#fff' : '#101936'} />
      )))}
    </Frame>
  ),
  'memory-magic': (label) => (
    <Frame from="#49D17D" to="#0EA5A4" label={label}>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${38 + i * 66} ${48 + (i % 2) * 14}) rotate(${(i - 1.5) * 6})`}>
          <rect width="54" height="74" rx="10" fill={i === 1 || i === 2 ? '#fff' : '#7357FF'} stroke="#fff" strokeWidth="4" />
          {i === 1 || i === 2 ? (
            <g transform="translate(27 37)">
              <circle r="14" fill="#FF686B" />
              <path d="M0 -14 Q6 -24 12 -20" stroke="#49D17D" strokeWidth="4" fill="none" />
            </g>
          ) : (
            <text x="27" y="48" textAnchor="middle" fontSize="30" fontWeight="700" fill="#FFD54A">?</text>
          )}
        </g>
      ))}
      <Star x={290} y={30} r={9} /><Star x={26} y={150} r={7} />
    </Frame>
  ),
  'math-quest': (label) => (
    <Frame from="#7357FF" to="#38BDF8" label={label}>
      <rect x="200" y="40" width="80" height="120" rx="40" fill="#FFD54A" />
      <rect x="212" y="54" width="56" height="106" rx="28" fill="#C98B12" />
      <circle cx="258" cy="110" r="5" fill="#FFD54A" />
      {[
        ['2', 40, 60, '#FF686B'],
        ['+', 90, 70, '#fff'],
        ['3', 130, 60, '#49D17D'],
        ['=', 60, 130, '#fff'],
        ['5', 110, 130, '#FFD54A'],
      ].map(([t, x, y, c]) => (
        <text key={`${t}${x}`} x={x as number} y={y as number} fontSize="48" fontWeight="800" fill={c as string} fontFamily="Fredoka, sans-serif">
          {t}
        </text>
      ))}
      <Star x={170} y={40} r={10} />
    </Frame>
  ),
  'space-explorer': (label) => (
    <Frame from="#101936" to="#3B2A8C" label={label}>
      {Array.from({ length: 18 }, (_, i) => (
        <circle key={i} cx={(i * 53) % 320} cy={(i * 37) % 180} r={i % 3 ? 1.5 : 2.5} fill="#fff" opacity=".8" />
      ))}
      <circle cx="250" cy="130" r="40" fill="#FF686B" />
      <ellipse cx="250" cy="130" rx="62" ry="12" fill="none" stroke="#FFD54A" strokeWidth="6" />
      <circle cx="60" cy="40" r="16" fill="#49D17D" />
      <g transform="translate(140 90) rotate(-30)">
        <path d="M0 -40 Q18 -20 16 20 L-16 20 Q-18 -20 0 -40Z" fill="#E5E7F5" />
        <circle cx="0" cy="-8" r="8" fill="#38BDF8" stroke="#7357FF" strokeWidth="3" />
        <path d="M-16 6 L-28 26 L-14 20Z" fill="#FF686B" /><path d="M16 6 L28 26 L14 20Z" fill="#FF686B" />
        <path d="M-8 22 Q0 46 8 22Z" fill="#FFD54A" />
      </g>
      <Star x={200} y={40} r={9} />
    </Frame>
  ),
  'word-adventure': (label) => (
    <Frame from="#FF686B" to="#FFB86B" label={label}>
      {[
        ['A', 30, '#7357FF'],
        ['B', 100, '#38BDF8'],
        ['C', 170, '#49D17D'],
      ].map(([t, x, c], i) => (
        <g key={t as string} transform={`translate(${x} ${44 + i * 8}) rotate(${(i - 1) * 8})`}>
          <rect width="62" height="62" rx="14" fill={c as string} stroke="#fff" strokeWidth="4" />
          <text x="31" y="46" textAnchor="middle" fontSize="40" fontWeight="800" fill="#fff" fontFamily="Fredoka, sans-serif">{t}</text>
        </g>
      ))}
      <g transform="translate(270 110)">
        <rect x="-26" y="-34" width="52" height="68" rx="6" fill="#fff" />
        <rect x="-18" y="-22" width="36" height="5" rx="2" fill="#FFB86B" />
        <rect x="-18" y="-10" width="28" height="5" rx="2" fill="#FFB86B" />
        <rect x="-18" y="2" width="32" height="5" rx="2" fill="#FFB86B" />
      </g>
      <Star x={40} y={150} r={9} fill="#fff" />
    </Frame>
  ),
};

export function Thumbnail({ gameId, title }: { gameId: string; title: string }) {
  const art = ART[gameId];
  if (art) return art(title);
  return (
    <Frame from="#7357FF" to="#38BDF8" label={title}>
      <Star x={160} y={90} r={40} />
    </Frame>
  );
}
