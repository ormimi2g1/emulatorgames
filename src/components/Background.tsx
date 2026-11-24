/** Decorative animated background. Hidden from assistive tech and disabled in reduced-motion mode. */
export function Background() {
  const shapes = [
    { c: '#7357FF', x: '6%', y: '12%', s: 90, d: '0s', r: '50%' },
    { c: '#38BDF8', x: '82%', y: '8%', s: 70, d: '-4s', r: '24%' },
    { c: '#FFD54A', x: '70%', y: '62%', s: 110, d: '-8s', r: '50%' },
    { c: '#49D17D', x: '12%', y: '72%', s: 60, d: '-2s', r: '30%' },
    { c: '#FF686B', x: '45%', y: '30%', s: 40, d: '-6s', r: '50%' },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {shapes.map((s, i) => (
        <span
          key={i}
          className="bg-float absolute opacity-20 blur-[1px] dark:opacity-15"
          style={{ left: s.x, top: s.y, width: s.s, height: s.s, background: s.c, borderRadius: s.r, animationDelay: s.d }}
        />
      ))}
    </div>
  );
}
