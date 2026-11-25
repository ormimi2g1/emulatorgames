import { useEffect, useRef, useState } from 'react';
import { GameInput } from '../shared/input';
import { MiniGameFrame, ResultCard, seededRandom, useMiniGame } from '../shared/MiniGame';
import { H, PLANETS, ROCKET_X, SpaceGame, W, rateTrip, type Planet } from './engine';

const GAME_ID = 'space-explorer';

export default function SpaceExplorer() {
  const g = useMiniGame(GAME_ID);
  const [round, setRound] = useState(-1);
  if (!g.profile) return null;
  if (round < 0) {
    return (
      <MiniGameFrame title="Space Explorer" toast={g.toast}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
          <p className="text-6xl" aria-hidden="true">🚀🪐⭐</p>
          <h2 className="text-3xl font-bold">Fly your rocket, collect stars and visit three planets!</h2>
          <p className="text-lg">Up and down arrows (or W and S) to fly. On a tablet, touch where you want to go.</p>
          {g.best && g.best.plays > 0 && <p className="text-lg">Best: {'★'.repeat(g.best.stars)}</p>}
          <button type="button" className="btn btn-sun min-h-16 text-2xl" onClick={() => { setRound(0); void g.start(); }}>🚀 Blast off</button>
        </div>
      </MiniGameFrame>
    );
  }
  return <Flight key={round} g={g} onAgain={() => setRound((r) => r + 1)} />;
}

const SKY_STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 137) % W, y: (i * 89) % H, s: 1 + (i % 3) }));

function draw(ctx: CanvasRenderingContext2D, game: SpaceGame, reduced: boolean) {
  ctx.fillStyle = '#0b1030';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const s of SKY_STARS) {
    const x = (((s.x - game.t * 20 * s.s) % W) + W) % W;
    ctx.fillRect(x, s.y, s.s, s.s);
  }
  for (const th of game.things) {
    if (th.kind === 'star' && !th.hit) {
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 ? th.r * 0.45 : th.r;
        ctx.lineTo(th.x + r * Math.cos(a), th.y + r * Math.sin(a));
      }
      ctx.fill();
    } else if (th.kind === 'rock') {
      ctx.fillStyle = th.hit ? '#94a3b8' : '#a78bfa';
      ctx.beginPath();
      ctx.arc(th.x, th.y, th.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(th.x - 6, th.y - 5, 5, 0, Math.PI * 2);
      ctx.arc(th.x + 8, th.y + 6, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (th.kind === 'planet') {
      const p = PLANETS[game.planetsVisited] ?? PLANETS[0];
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(th.x, th.y, th.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.ring) {
        ctx.strokeStyle = '#fff3c4';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(th.x, th.y, th.r * 1.6, th.r * 0.35, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  // Rocket
  const wob = game.wobble > 0 && !reduced ? Math.sin(game.t * 30) * 0.2 : 0;
  ctx.save();
  ctx.translate(ROCKET_X, game.y);
  ctx.rotate(wob + game.vy / 1600);
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(-34, -8);
  ctx.lineTo(-48 - (reduced ? 0 : Math.random() * 10), 0);
  ctx.lineTo(-34, 8);
  ctx.fill();
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff686b';
  ctx.beginPath();
  ctx.moveTo(20, -12);
  ctx.lineTo(40, 0);
  ctx.lineTo(20, 12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-22, -12);
  ctx.lineTo(-34, -24);
  ctx.lineTo(-10, -12);
  ctx.moveTo(-22, 12);
  ctx.lineTo(-34, 24);
  ctx.lineTo(-10, 12);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(4, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // HUD
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Fredoka, sans-serif';
  ctx.fillText(`⭐ ${game.stars}`, 16, 34);
  ctx.textAlign = 'right';
  ctx.fillText(`🪐 ${game.planetsVisited}/${PLANETS.length}`, W - 16, 34);
  ctx.textAlign = 'left';
}

function Flight({ g, onAgain }: { g: ReturnType<typeof useMiniGame>; onAgain: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<SpaceGame | null>(null);
  const [visit, setVisit] = useState<Planet | null>(null);
  const [done, setDone] = useState<{ stars: number; bumps: number } | null>(null);
  const pausedRef = useRef(false);
  const targetRef = useRef<number | undefined>(undefined);
  pausedRef.current = !!visit || !!done;

  useEffect(() => {
    const seed = Number(new URLSearchParams(window.location.search).get('seed')) || Date.now();
    const game = new SpaceGame(g.profile!.difficulty, seededRandom(seed));
    gameRef.current = game;
    const input = new GameInput(window);
    const ctx = canvasRef.current!.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      input.update();
      if (!pausedRef.current) {
        const dir = (input.isDown('down') ? 1 : 0) - (input.isDown('up') || input.isDown('jump') ? 1 : 0);
        for (const e of game.step(dt, dir, targetRef.current)) {
          if (e.type === 'star') g.play('star');
          if (e.type === 'bump') g.play('bump');
          if (e.type === 'planet') {
            g.play('great');
            setVisit(e.planet);
          }
        }
      }
      draw(ctx, game, g.reducedMotion);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const testHooks = new URLSearchParams(window.location.search).get('testhooks') === '1';
    if (testHooks) {
      (window as unknown as { __space: unknown }).__space = {
        state: () => ({ y: game.y, stars: game.stars, bumps: game.bumps, planets: game.planetsVisited }),
        visitPlanet: () => game.visitPlanet().forEach((e) => e.type === 'planet' && setVisit(e.planet)),
      };
    }
    const onVis = () => document.hidden && (last = performance.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      input.dispose();
      document.removeEventListener('visibilitychange', onVis);
      delete (window as unknown as { __space?: unknown }).__space;
    };
    // One flight per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continueTrip = () => {
    const game = gameRef.current!;
    setVisit(null);
    if (game.done) {
      const stars = rateTrip(game.bumps);
      setDone({ stars: game.stars, bumps: game.bumps });
      g.play('win');
      void g.finish(stars);
    }
  };

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    targetRef.current = ((e.clientY - rect.top) / rect.height) * H;
  };

  if (done) {
    return (
      <MiniGameFrame title="Space Explorer" toast={g.toast}>
        <ResultCard stars={rateTrip(done.bumps)} seed={done.stars} onAgain={onAgain} details={<p className="text-lg">You visited {PLANETS.length} planets and collected {done.stars} stars!</p>} />
      </MiniGameFrame>
    );
  }
  return (
    <MiniGameFrame title="Space Explorer" toast={g.toast}>
      <div className="relative flex flex-1 items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="max-h-[80dvh] w-full max-w-5xl touch-none rounded-2xl"
          style={{ aspectRatio: `${W} / ${H}` }}
          aria-label="Space. Use up and down arrows to fly the rocket."
          role="img"
          data-testid="space-canvas"
          onPointerDown={pointer}
          onPointerMove={(e) => e.buttons && pointer(e)}
          onPointerUp={() => (targetRef.current = undefined)}
          onPointerLeave={() => (targetRef.current = undefined)}
        />
        {visit && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy/70 p-4" role="dialog" aria-modal="true" aria-label={`You reached ${visit.name}`}>
            <div className="card flex max-w-md flex-col items-center gap-4 p-6 text-center text-[var(--text)]">
              <span className="h-24 w-24 rounded-full" style={{ background: visit.color }} aria-hidden="true" />
              <h2 className="text-3xl font-bold">You reached {visit.name}!</h2>
              <p className="text-lg">{visit.fact}</p>
              <button type="button" className="btn btn-sun min-h-14 text-xl" onClick={continueTrip} autoFocus>
                {gameRef.current?.done ? '🏁 Finish the trip' : '🚀 Fly on'}
              </button>
            </div>
          </div>
        )}
      </div>
    </MiniGameFrame>
  );
}
