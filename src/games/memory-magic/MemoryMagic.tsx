import { useEffect, useMemo, useRef, useState } from 'react';
import { MiniGameFrame, ResultCard, seededRandom, useMiniGame } from '../shared/MiniGame';
import { PAIRS, makeDeck, rateMemory, type Card } from './logic';

const GAME_ID = 'memory-magic';

function seedFromUrl() {
  const s = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isFinite(s) && s > 0 ? s : Date.now();
}

export default function MemoryMagic() {
  const g = useMiniGame(GAME_ID);
  const [players, setPlayers] = useState<1 | 2 | null>(null);
  const [round, setRound] = useState(0);
  if (!g.profile) return null;
  if (!players) {
    return (
      <MiniGameFrame title="Memory Magic" toast={g.toast}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
          <p className="text-6xl" aria-hidden="true">🃏✨</p>
          <h2 className="text-3xl font-bold">Flip two cards. Find the matching pairs!</h2>
          {g.best && g.best.plays > 0 && <p className="text-lg">Best: {'★'.repeat(g.best.stars)}</p>}
          <div className="flex flex-wrap justify-center gap-4">
            <button type="button" className="btn btn-sun min-h-16 text-2xl" onClick={() => { setPlayers(1); void g.start(); }}>🙂 1 player</button>
            <button type="button" className="btn btn-ghost min-h-16 text-2xl text-white" onClick={() => { setPlayers(2); void g.start(); }}>🙂🙂 2 players</button>
          </div>
        </div>
      </MiniGameFrame>
    );
  }
  return <Board key={round} g={g} players={players} onAgain={() => setRound((r) => r + 1)} onMenu={() => setPlayers(null)} />;
}

function Board({ g, players, onAgain, onMenu }: { g: ReturnType<typeof useMiniGame>; players: 1 | 2; onAgain: () => void; onMenu: () => void }) {
  const pairs = PAIRS[g.profile!.difficulty];
  const deck = useMemo(() => makeDeck(pairs, seededRandom(seedFromUrl())), [pairs]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [done, setDone] = useState(false);
  const [say, setSay] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const flip = (c: Card) => {
    if (open.length === 2 || open.includes(c.key) || matched.has(c.key)) return;
    g.play('flip');
    const next = [...open, c.key];
    setOpen(next);
    if (next.length < 2) {
      setSay(`${c.symbol.name}`);
      return;
    }
    setMoves((m) => m + 1);
    const [a, b] = next.map((k) => deck[k]);
    if (a.symbol.id === b.symbol.id) {
      const m = new Set(matched).add(a.key).add(b.key);
      setMatched(m);
      setOpen([]);
      const s = [...scores];
      s[turn]++;
      setScores(s);
      setSay(`A match! Two ${a.symbol.name}s.`);
      g.play('good');
      if (m.size === deck.length) {
        timer.current = setTimeout(() => {
          setDone(true);
          g.play('win');
          void g.finish(rateMemory(moves + 1, pairs), {}, ['puzzle-master']);
        }, 600);
      }
    } else {
      setSay(`${b.symbol.name}. Not a match, try again!`);
      timer.current = setTimeout(() => {
        setOpen([]);
        if (players === 2) setTurn((t) => 1 - t);
      }, 1000);
    }
  };

  if (done) {
    const stars = rateMemory(moves, pairs);
    const winner = players === 2 ? (scores[0] === scores[1] ? 'It’s a tie. Great teamwork!' : `Player ${scores[0] > scores[1] ? 1 : 2} found the most pairs!`) : null;
    return (
      <MiniGameFrame title="Memory Magic" toast={g.toast} onBack={onMenu}>
        <ResultCard
          stars={stars}
          seed={moves}
          onAgain={onAgain}
          details={
            <>
              <p className="text-lg">You found all {pairs} pairs in {moves} turns.</p>
              {winner && <p className="text-lg font-bold">{winner} ({scores[0]} – {scores[1]})</p>}
            </>
          }
        />
      </MiniGameFrame>
    );
  }

  const cols = pairs <= 4 ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4';
  return (
    <MiniGameFrame title="Memory Magic" toast={g.toast} onBack={onMenu}>
      <div className="flex flex-1 flex-col items-center gap-3 p-3">
        <div className="flex flex-wrap items-center justify-center gap-3 text-lg font-bold">
          {players === 2 ? (
            [0, 1].map((p) => (
              <span key={p} className={`rounded-full px-4 py-1 ${turn === p ? 'bg-sun text-navy' : 'bg-white/10'}`}>
                Player {p + 1}: {scores[p]}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-white/10 px-4 py-1">Pairs: {matched.size / 2} of {pairs}</span>
          )}
          <span className="rounded-full bg-white/10 px-4 py-1">Turns: {moves}</span>
        </div>
        <p className="sr-only" aria-live="polite">{say}</p>
        <div className={`grid w-full max-w-xl gap-3 ${cols}`}>
          {deck.map((c) => {
            const up = open.includes(c.key) || matched.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                data-testid="memory-card"
                data-symbol={c.symbol.id}
                aria-label={up ? c.symbol.name : `Card ${c.key + 1}, face down`}
                aria-pressed={up}
                disabled={matched.has(c.key)}
                onClick={() => flip(c)}
                className={`flex aspect-[3/4] items-center justify-center rounded-2xl text-5xl shadow-lg sm:text-6xl ${
                  up ? 'bg-white' : 'bg-gradient-to-br from-purple to-sky'
                } ${matched.has(c.key) ? 'ring-4 ring-grass' : ''} ${g.reducedMotion ? '' : 'transition-transform duration-200'} ${up && !g.reducedMotion ? '[transform:rotateY(0deg)]' : ''}`}
              >
                <span aria-hidden="true">{up ? c.symbol.emoji : '✨'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </MiniGameFrame>
  );
}
