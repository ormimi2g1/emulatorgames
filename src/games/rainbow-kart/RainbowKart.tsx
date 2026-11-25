import { playState } from '../../playtime/playState';
import { useEffect, useRef, useState } from 'react';
import { GameInput } from '../shared/input';
import { MiniGameFrame, ResultCard, useMiniGame } from '../shared/MiniGame';
import { TouchControls, isTouchDevice } from '../shared/TouchControls';
import { BOOSTS, Race, TRACK, TRACK_WIDTH, pointAt, rateRace, type Racer } from './engine';

const GAME_ID = 'rainbow-kart';
const RAINBOW = ['#ff686b', '#ffd54a', '#49d17d', '#38bdf8', '#7357ff'];
const PLACES = ['', '1st', '2nd', '3rd'];

export default function RainbowKart() {
  const g = useMiniGame(GAME_ID);
  const [round, setRound] = useState(-1);
  if (!g.profile) return null;
  if (round < 0) {
    return (
      <MiniGameFrame title="Rainbow Kart Racing" toast={g.toast}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
          <p className="text-6xl" aria-hidden="true">🏎️🌈🏁</p>
          <h2 className="text-3xl font-bold">Race Bubbles and Zippy around the rainbow track!</h2>
          <p className="text-lg">Your kart drives by itself. Steer with the left and right arrows (or the buttons). Drive over the arrows for a boost!</p>
          {g.best && g.best.plays > 0 && <p className="text-lg">Best: {'★'.repeat(g.best.stars)}</p>}
          <button type="button" className="btn btn-sun min-h-16 text-2xl" onClick={() => { setRound(0); void g.start(); }}>🏁 Start race</button>
        </div>
      </MiniGameFrame>
    );
  }
  return <RaceView key={round} g={g} onAgain={() => setRound((r) => r + 1)} />;
}

function drawKart(ctx: CanvasRenderingContext2D, r: Racer) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.angle);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-20, -20, 14, 8);
  ctx.fillRect(-20, 12, 14, 8);
  ctx.fillRect(10, -19, 12, 7);
  ctx.fillRect(10, 12, 12, 7);
  ctx.fillStyle = r.color;
  ctx.beginPath();
  ctx.roundRect(-24, -14, 52, 28, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-2, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWorld(ctx: CanvasRenderingContext2D, race: Race, w: number, h: number) {
  const p = race.player;
  const zoom = Math.min(1.1, Math.max(0.55, Math.min(w, h) / 620));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#5fcf6d';
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(zoom, 0, 0, zoom, w / 2 - p.x * zoom, h / 2 - p.y * zoom);
  // grass dots
  ctx.fillStyle = '#4fbf5d';
  for (let x = -1600; x < 1600; x += 120) for (let y = -1100; y < 1100; y += 120) ctx.fillRect(x + ((y / 120) % 2) * 60, y, 10, 10);
  const loop = () => {
    ctx.beginPath();
    TRACK.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  // rainbow curbs
  RAINBOW.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = TRACK_WIDTH + 40 - i * 8;
    loop();
    ctx.stroke();
  });
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = TRACK_WIDTH;
  loop();
  ctx.stroke();
  ctx.setLineDash([30, 30]);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 4;
  loop();
  ctx.stroke();
  ctx.setLineDash([]);
  // start line
  const s = pointAt(0);
  ctx.save();
  ctx.translate(s.p.x, s.p.y);
  ctx.rotate(s.angle);
  for (let i = -5; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff';
      ctx.fillRect(j * 11 - 11, i * 22, 11, 22);
    }
  }
  ctx.restore();
  // boost pads
  for (const b of BOOSTS) {
    const q = TRACK[b];
    const n = TRACK[(b + 1) % TRACK.length];
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(Math.atan2(n.y - q.y, n.x - q.x));
    ctx.fillStyle = '#ffd54a';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-30 + k * 22, -26);
      ctx.lineTo(-10 + k * 22, 0);
      ctx.lineTo(-30 + k * 22, 26);
      ctx.lineTo(-20 + k * 22, 0);
      ctx.fill();
    }
    ctx.restore();
  }
  [...race.rivals, p].forEach((r) => drawKart(ctx, r));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function RaceView({ g, onAgain }: { g: ReturnType<typeof useMiniGame>; onAgain: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [input, setInput] = useState<GameInput | null>(null);
  const [hud, setHud] = useState({ lap: 1, laps: 3, place: 1, count: 3, msg: '' });
  const [result, setResult] = useState<number | null>(null);
  const [touch] = useState(isTouchDevice);

  useEffect(() => {
    const race = new Race(g.profile!.difficulty);
    const gi = new GameInput(window);
    setInput(gi);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let countdown = 3;
    let msgUntil = 0;
    let msg = '';
    let lastHud = '';
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    g.play('tap');
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      gi.update();
      if (playState.isHeld()) {
        // Break or time's up: freeze the race.
      } else if (countdown > 0) {
        const before = Math.ceil(countdown);
        countdown -= dt;
        if (Math.ceil(countdown) !== before) g.play(countdown > 0 ? 'tap' : 'boost');
      } else if (!race.finished) {
        const steer = (gi.isDown('right') ? 1 : 0) - (gi.isDown('left') ? 1 : 0);
        for (const e of race.step(dt, steer)) {
          if (e.type === 'boost') g.play('boost');
          if (e.type === 'lap') {
            g.play('good');
            msg = e.lap === race.laps ? 'Last lap!' : `Lap ${e.lap}!`;
            msgUntil = race.t + 1.5;
          }
          if (e.type === 'finish') {
            g.play('win');
            setResult(e.place);
            void g.finish(rateRace(e.place), {}, ['racing-champion']);
          }
        }
      }
      drawWorld(ctx, race, canvas.width, canvas.height);
      const state = { lap: race.lap, laps: race.laps, place: race.place(), count: Math.ceil(countdown), msg: race.t < msgUntil ? msg : '' };
      const key = JSON.stringify(state);
      if (key !== lastHud) {
        lastHud = key;
        setHud(state);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    if (new URLSearchParams(window.location.search).get('testhooks') === '1') {
      (window as unknown as { __kart: unknown }).__kart = {
        state: () => ({ progress: race.player.progress, lap: race.lap, speed: race.player.speed, offTrack: race.offTrack, finished: race.finished }),
        /** Jump the player near the end of the race, on the road. */
        nearFinish: () => {
          const total = race.laps * TRACK.length;
          race.player.progress = total - 6;
          const q = TRACK[TRACK.length - 6];
          const n = TRACK[TRACK.length - 5];
          race.player.x = q.x;
          race.player.y = q.y;
          race.player.angle = Math.atan2(n.y - q.y, n.x - q.x);
          race.lastIndex = TRACK.length - 6;
        },
      };
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gi.dispose();
      delete (window as unknown as { __kart?: unknown }).__kart;
    };
    // One race per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (result !== null) {
    return (
      <MiniGameFrame title="Rainbow Kart Racing" toast={g.toast}>
        <ResultCard
          stars={rateRace(result)}
          seed={result}
          onAgain={onAgain}
          details={<p className="text-2xl font-bold">You finished {PLACES[result]}! {result === 1 ? '🏆' : 'What a race! 🏁'}</p>}
        />
      </MiniGameFrame>
    );
  }
  return (
    <MiniGameFrame title="Rainbow Kart Racing" toast={g.toast}>
      <div className="relative flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Race track. Steer with the left and right arrows." data-testid="kart-canvas" />
        <div className="pointer-events-none absolute left-3 top-3 flex gap-2 text-lg font-bold">
          <span className="rounded-full bg-navy/70 px-3 py-1" data-testid="kart-lap">Lap {hud.lap}/{hud.laps}</span>
          <span className="rounded-full bg-navy/70 px-3 py-1">{PLACES[hud.place]}</span>
        </div>
        <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-6xl font-bold drop-shadow-lg" aria-live="polite">
          {hud.count > 0 ? hud.count : hud.msg}
        </p>
        {touch && input && <TouchControls input={input} large={g.profile!.accessibility.largeControls} leftHanded={g.profile!.accessibility.leftHanded} steeringOnly />}
      </div>
    </MiniGameFrame>
  );
}
