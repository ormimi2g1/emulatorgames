import { useMemo, useState } from 'react';
import { ChoiceButton, MiniGameFrame, ResultCard, seededRandom, useMiniGame } from '../shared/MiniGame';
import { DOORS, makeQuest, rateQuest } from './questions';

const GAME_ID = 'math-quest';

function seedFromUrl() {
  const s = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isFinite(s) && s > 0 ? s : Date.now();
}

export default function MathQuest() {
  const g = useMiniGame(GAME_ID);
  const [round, setRound] = useState(-1);
  if (!g.profile) return null;
  if (round < 0) {
    return (
      <MiniGameFrame title="Math Quest" toast={g.toast}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
          <p className="text-6xl" aria-hidden="true">🚪🔢✨</p>
          <h2 className="text-3xl font-bold">Solve the puzzle to open each magic door!</h2>
          <p className="text-lg">There are {DOORS} doors. Take your time.</p>
          {g.best && g.best.plays > 0 && <p className="text-lg">Best: {'★'.repeat(g.best.stars)}</p>}
          <button type="button" className="btn btn-sun min-h-16 text-2xl" onClick={() => { setRound(0); void g.start(); }}>▶ Start the quest</button>
        </div>
      </MiniGameFrame>
    );
  }
  return <Quest key={round} g={g} onAgain={() => setRound((r) => r + 1)} />;
}

function Quest({ g, onAgain }: { g: ReturnType<typeof useMiniGame>; onAgain: () => void }) {
  const quest = useMemo(() => makeQuest(g.profile!.difficulty, seededRandom(seedFromUrl())), [g.profile]);
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [firstTry, setFirstTry] = useState(0);
  const [opening, setOpening] = useState(false);
  const [done, setDone] = useState(false);
  const q = quest[i];

  const answer = (n: number) => {
    if (opening) return;
    if (n !== q.answer) {
      g.play('oops');
      setWrong((w) => [...w, n]);
      return;
    }
    g.play('good');
    const ft = firstTry + (wrong.length === 0 ? 1 : 0);
    setFirstTry(ft);
    setOpening(true);
    setTimeout(() => {
      setOpening(false);
      setWrong([]);
      if (i + 1 >= quest.length) {
        setDone(true);
        g.play('win');
        void g.finish(rateQuest(ft), {}, ['math-explorer']);
      } else setI(i + 1);
    }, g.reducedMotion ? 300 : 900);
  };

  if (done) {
    return (
      <MiniGameFrame title="Math Quest" toast={g.toast}>
        <ResultCard stars={rateQuest(firstTry)} seed={firstTry} onAgain={onAgain} details={<p className="text-lg">You opened all {quest.length} magic doors! {firstTry} on the first try.</p>} />
      </MiniGameFrame>
    );
  }

  const showPicture = q.picture && (q.kind === 'count' || wrong.length > 0 || q.kind === 'add');
  return (
    <MiniGameFrame title="Math Quest" toast={g.toast}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
        <ol className="flex gap-2" aria-label={`Door ${i + 1} of ${quest.length}`}>
          {quest.map((_, k) => (
            <li key={k} aria-hidden="true" className={`h-3 w-6 rounded-full ${k < i ? 'bg-grass' : k === i ? 'bg-sun' : 'bg-white/20'}`} />
          ))}
        </ol>
        <div
          className={`flex w-full max-w-md flex-col items-center gap-4 rounded-t-[10rem] border-8 border-sun/80 bg-purple/40 px-6 pb-8 pt-14 ${opening && !g.reducedMotion ? 'scale-105 bg-grass/40 transition' : ''}`}
          data-testid="door"
        >
          {showPicture && (
            <p className="text-4xl leading-relaxed" aria-label={q.kind === 'count' ? `${q.a} pictures` : `${q.a} and ${q.b} more`}>
              {q.kind === 'count' ? q.picture!.repeat(q.a) : `${q.picture!.repeat(q.a)} ➕ ${q.picture!.repeat(q.b)}`}
            </p>
          )}
          <h2 className="text-5xl font-bold" data-testid="question">{q.text}</h2>
          <p className="h-7 text-lg font-bold" aria-live="polite">
            {opening ? 'The door opens! 🎉' : wrong.length ? 'Nice try! Have another go.' : ''}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {q.choices.map((c) => (
            <ChoiceButton key={c} onClick={() => answer(c)} disabled={wrong.includes(c) || opening} state={opening && c === q.answer ? 'right' : wrong.includes(c) ? 'wrong' : undefined}>
              {c}
            </ChoiceButton>
          ))}
        </div>
      </div>
    </MiniGameFrame>
  );
}
