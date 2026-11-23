// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useMemo, useRef, useState } from 'react';
import { type Level, type WardenView } from '../api';
import { BossBar } from './BossBar';
import { GauntletArena } from './Gauntlet';
import { HarassLayer, type HarassItem } from './Harassment';
import { Hexwarden } from './Hexwarden';
import { ladderPort } from './ports';
import { Workbench } from './Workbench';
import './phase4.css';

// The arena: a compact warden rail (the warden, what he thinks, the level switcher, his feed) beside the in-arena
// dnSpy workbench, which opens full-size like a window inside a window. Since Phase 4 the warden here is exactly
// what the SERVER decided: his mood, rage, the member he watches, his words, his read on the player and his
// MAPE-K reasoning all arrive with each answer, so this component only shows him; it decides nothing. Since
// Phase 6 the rail also holds the way into his rematch, the gauntlet, which takes the place of the ladder while it
// runs; whether a player may enter it is the server's call.

interface FeedLine { id: number; text: string; tone: 'watch' | 'hit' | 'hold' | 'crack'; }

// How long a harassment stays up before it leaves by itself, and how long the flicker lasts.
const HARASS_MS = 6000;
const FLICKER_MS = 700;

function toneOf(w: WardenView): FeedLine['tone'] {
  if (w.surprised || w.mood === 'wrath') return 'crack';
  if (w.mood === 'enraged') return 'hit';
  return w.calledIt ? 'hold' : 'watch';
}

export function ArenaFocus({ level, levels, activeNumber, onSelect, solved, onSolved }: Readonly<{
  level: Level | null;
  levels: Level[];
  activeNumber: number | null;
  onSelect: (n: number) => void;
  solved: Set<number>;
  onSolved?: (level: number) => void;
}>) {
  const [warden, setWarden] = useState<WardenView | null>(null);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [harass, setHarass] = useState<HarassItem[]>([]);
  const [flicker, setFlicker] = useState(false);
  const [gauntlet, setGauntlet] = useState(false);
  const [fightOn, setFightOn] = useState(`${activeNumber}`);
  const seq = useRef(0);

  // A new target (or entering / leaving the gauntlet) is a new fight: clear his rail while rendering (React's
  // "adjust state when a prop changes"), not in an effect, so there is no extra render. His greeting arrives when
  // the workbench opens the target.
  const fight = gauntlet ? 'gauntlet' : `${activeNumber}`;
  if (fight !== fightOn) {
    setFightOn(fight);
    setWarden(null);
    setFeed([]);
    setHarass([]);
  }

  // The ladder's port for the chosen level; the same object while the level stays, so the workbench opens it once.
  const port = useMemo(() => ladderPort(level?.number ?? 1, onSolved), [level?.number, onSolved]);

  const dismiss = useCallback((id: number) => setHarass((h) => h.filter((x) => x.id !== id)), []);

  // Every reaction the server sends lands here. Stable (functional updates only), so the workbench's effects that
  // depend on it do not re-fire on every render.
  const onWarden = useCallback((w: WardenView) => {
    seq.current += 1;
    const id = seq.current;
    setWarden(w);
    setFeed((f) => [{ id, text: w.line, tone: toneOf(w) }, ...f].slice(0, 12));

    const thrown = w.harass;
    if (thrown) {
      setHarass((h) => [...h, { id, harass: thrown }].slice(-3));
      setTimeout(() => setHarass((h) => h.filter((x) => x.id !== id)), HARASS_MS);
      if (thrown.kind === 'flicker') {
        setFlicker(true);
        setTimeout(() => setFlicker(false), FLICKER_MS);
      }
    }
  }, []);

  return (
    <div className={`arena-focus${flicker ? ' af-flicker' : ''}`} aria-label="the arena">
      <aside className="af-rail">
        <div className="af-warden">
          <div className="af-h">
            <span className="label">the warden</span>
            {level && <span className="af-watch">watching &middot; {warden?.watching || level.name}</span>}
          </div>
          <Hexwarden
            state={warden?.form ?? 'contempt'}
            rage={warden?.rage ?? 0}
            watching={{ line: warden?.watching ?? '' }}
            beaten={warden?.broken}
            shattered={warden?.shattered}
            line={warden?.line}
          />
        </div>

        {warden && (
          <div className="af-mind" aria-label="what the warden thinks">
            <div className="af-mind-h">what he thinks</div>
            <div className="af-mind-read">
              <span>you are {warden.thinks}</span>
              <span className="af-mind-pct">{Math.round(warden.confidence * 100)}%</span>
              {warden.calledIt && <span className="af-tag">called it</span>}
              {warden.surprised && <span className="af-tag af-tag-hot">surprised</span>}
            </div>
            {warden.expects && <div className="af-mind-exp">he expects {warden.expects} next</div>}
            <ol className="af-mapek">
              <li><b>M</b>{warden.reasoning.monitor}</li>
              <li><b>A</b>{warden.reasoning.analyse}</li>
              <li><b>P</b>{warden.reasoning.plan}</li>
              <li><b>E</b>{warden.reasoning.execute}</li>
            </ol>
          </div>
        )}

        <div className="af-levels">
          <label className="af-levels-h" htmlFor="af-level-select">target</label>
          <select
            id="af-level-select"
            className="af-level-select"
            value={activeNumber ?? ''}
            onChange={(e) => onSelect(Number(e.target.value))}
            disabled={gauntlet}
          >
            {levels.map((l) => (
              <option key={l.number} value={l.number}>
                {`0x0${l.number}  ${l.name}${l.available ? '' : '  (soon)'}${solved.has(l.number) ? '  ✓' : ''}`}
              </option>
            ))}
          </select>
        </div>

        <div className="af-rematch">
          <div className="af-rematch-h">the rematch</div>
          {gauntlet
            ? <button type="button" className="af-rematch-btn" onClick={() => setGauntlet(false)}>back to the ladder</button>
            : <button type="button" className="af-rematch-btn" onClick={() => setGauntlet(true)}>enter the gauntlet</button>}
          <div className="af-rematch-note">
            {gauntlet ? 'He chooses every rung now.' : 'Beat him on the last rung and he wants a rematch, where he chooses every challenge.'}
          </div>
        </div>

        <div className="af-feed" aria-label="the warden's feed">
          <div className="af-feed-h">the warden says</div>
          {feed.length === 0
            ? <div className="af-feed-empty">nothing yet. make a move.</div>
            : (
              <ul className="af-feed-list">
                {feed.map((f) => <li key={f.id} className={`af-feed-line tone-${f.tone}`}>{f.text}</li>)}
              </ul>
            )}
        </div>
      </aside>

      <div className="af-main">
        {gauntlet && <GauntletArena onWarden={onWarden} />}
        {!gauntlet && level && warden && <BossBar warden={warden} level={level.number} />}
        {!gauntlet && level && level.available && <Workbench key={level.number} port={port} onWarden={onWarden} />}
        {!gauntlet && level && !level.available && (
          <div className="wb">
            <div className="wb-h"><span className="wb-file">{level.name} &middot; in-arena workbench</span></div>
            <div className="wb-term"><div className="wb-term-idle">{level.name} is not built yet, so there is nothing to crack here. Pick a live target (0x01). The warden is holding this rung.</div></div>
          </div>
        )}
        {!gauntlet && !level && (
          <div className="wb">
            <div className="wb-term"><div className="wb-term-idle">Pick a target in the rail. The warden is already watching.</div></div>
          </div>
        )}
      </div>

      <HarassLayer items={harass} onDismiss={dismiss} />
    </div>
  );
}
