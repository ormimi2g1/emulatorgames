import { useMemo, useState } from 'react';
import { ChoiceButton, MiniGameFrame, ResultCard, seededRandom, useMiniGame } from '../shared/MiniGame';
import { ROUNDS, canSpeak, makeRounds, rateWords, speak, type Round } from './words';

const GAME_ID = 'word-adventure';

function seedFromUrl() {
  const s = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isFinite(s) && s > 0 ? s : Date.now();
}

export default function WordAdventure() {
  const g = useMiniGame(GAME_ID);
  const [round, setRound] = useState(-1);
  if (!g.profile) return null;
  const little = g.profile.difficulty === 'little-explorer';
  if (round < 0) {
    return (
      <MiniGameFrame title="Word Adventure" toast={g.toast}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
          <p className="text-6xl" aria-hidden="true">🔤🐸📚</p>
          <h2 className="text-3xl font-bold">{little ? 'Find the first letter of each picture!' : 'Spell the word for each picture!'}</h2>
          {g.best && g.best.plays > 0 && <p className="text-lg">Best: {'★'.repeat(g.best.stars)}</p>}
          <button type="button" className="btn btn-sun min-h-16 text-2xl" onClick={() => { setRound(0); void g.start(); }}>▶ Let's go</button>
        </div>
      </MiniGameFrame>
    );
  }
  return <Adventure key={round} g={g} onAgain={() => setRound((r) => r + 1)} />;
}

function Adventure({ g, onAgain }: { g: ReturnType<typeof useMiniGame>; onAgain: () => void }) {
  const rounds = useMemo(() => makeRounds(g.profile!.difficulty, seededRandom(seedFromUrl())), [g.profile]);
  const [i, setI] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);

  const next = (clean: boolean) => {
    const ft = firstTry + (clean ? 1 : 0);
    setFirstTry(ft);
    setTimeout(() => {
      if (i + 1 >= rounds.length) {
        setDone(true);
        g.play('win');
        void g.finish(rateWords(ft));
      } else setI(i + 1);
    }, g.reducedMotion ? 300 : 900);
  };

  if (done) {
    return (
      <MiniGameFrame title="Word Adventure" toast={g.toast}>
        <ResultCard stars={rateWords(firstTry)} seed={firstTry} onAgain={onAgain} details={<p className="text-lg">You finished all {ROUNDS} words! {firstTry} on the first try.</p>} />
      </MiniGameFrame>
    );
  }
  const r = rounds[i];
  return (
    <MiniGameFrame title="Word Adventure" toast={g.toast}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
        <p className="text-lg font-bold" aria-live="polite">Word {i + 1} of {rounds.length}</p>
        {r.kind === 'letter' ? <LetterRound key={i} r={r} g={g} onDone={next} /> : <SpellRound key={i} r={r} g={g} onDone={next} />}
      </div>
    </MiniGameFrame>
  );
}

function Picture({ emoji, word }: { emoji: string; word: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-8xl" role="img" aria-label={word.toLowerCase()}>{emoji}</span>
      {canSpeak() && (
        <button type="button" className="btn btn-ghost min-h-12 text-white" onClick={() => speak(word.toLowerCase())}>🔊 Hear it</button>
      )}
    </div>
  );
}

function LetterRound({ r, g, onDone }: { r: Extract<Round, { kind: 'letter' }>; g: ReturnType<typeof useMiniGame>; onDone: (clean: boolean) => void }) {
  const [wrong, setWrong] = useState<string[]>([]);
  const [right, setRight] = useState(false);
  const pick = (c: string) => {
    if (right) return;
    if (c === r.letter) {
      setRight(true);
      g.play('good');
      onDone(wrong.length === 0);
    } else {
      g.play('oops');
      setWrong((w) => [...w, c]);
    }
  };
  return (
    <>
      <Picture emoji={r.word.emoji} word={r.word.word} />
      <h2 className="text-3xl font-bold">
        {right ? (
          <>
            <span className="text-sun">{r.letter}</span>
            {r.word.word.slice(1)}
          </>
        ) : (
          <>Which letter does <span className="sr-only">{r.word.word.toLowerCase()}</span><span aria-hidden="true">this</span> start with?</>
        )}
      </h2>
      <p className="h-7 text-lg font-bold" aria-live="polite">{right ? 'Yes! 🎉' : wrong.length ? 'Good try! Look again.' : ''}</p>
      <div className="flex gap-4">
        {r.choices.map((c) => (
          <ChoiceButton key={c} onClick={() => pick(c)} disabled={wrong.includes(c)} state={right && c === r.letter ? 'right' : wrong.includes(c) ? 'wrong' : undefined} label={`Letter ${c}`}>
            {c}
          </ChoiceButton>
        ))}
      </div>
    </>
  );
}

function SpellRound({ r, g, onDone }: { r: Extract<Round, { kind: 'spell' }>; g: ReturnType<typeof useMiniGame>; onDone: (clean: boolean) => void }) {
  const [typed, setTyped] = useState('');
  const [used, setUsed] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hint, setHint] = useState('');
  const complete = typed === r.word.word;
  const tap = (t: string, idx: number) => {
    if (complete || used.includes(idx)) return;
    const want = r.word.word[typed.length];
    if (t !== want) {
      g.play('oops');
      setMistakes((m) => m + 1);
      setHint(`Good try! Look for the letter ${want}.`);
      return;
    }
    g.play('tap');
    const next = typed + t;
    setTyped(next);
    setUsed((u) => [...u, idx]);
    setHint('');
    if (next === r.word.word) {
      g.play('good');
      onDone(mistakes === 0);
    }
  };
  return (
    <>
      <Picture emoji={r.word.emoji} word={r.word.word} />
      <div className="flex gap-2" aria-label={`Spelled so far: ${typed || 'nothing yet'}`} data-testid="spelled">
        {[...r.word.word].map((_, k) => (
          <span key={k} className={`flex h-16 w-14 items-center justify-center rounded-2xl border-4 text-4xl font-bold ${typed[k] ? 'border-grass bg-white text-navy' : 'border-white/40'}`}>
            {typed[k] ?? ''}
          </span>
        ))}
      </div>
      <p className="h-7 text-lg font-bold" aria-live="polite">{complete ? 'You spelled it! 🎉' : hint}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {r.tiles.map((t, idx) => (
          <ChoiceButton key={idx} onClick={() => tap(t, idx)} disabled={used.includes(idx) || complete} label={`Letter ${t}`}>
            {t}
          </ChoiceButton>
        ))}
      </div>
    </>
  );
}
