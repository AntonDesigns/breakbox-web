// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useRef, useState } from 'react';
import { type Level } from '../api';
import { Hexwarden, type HexState } from './Hexwarden';
import { Workbench, type WorkbenchActivity } from './Workbench';

// The arena: a compact warden rail (the warden, the level switcher, the warden's feed) beside the in-arena
// dnSpy workbench, which opens full-size like a window inside a window so it is actually usable. The warden
// REACTS here (step 4): every workbench move is reported and nudges his state, rage and the feed. The real
// MAPE-K brain (ArenaEngine) re-points in Phase 3; this is an honest, bounded client-side escalation.

// The order of escalation, so the warden never visibly calms down mid-fight.
const RANK: Record<HexState, number> = { contempt: 0, enraged: 1, wrath: 2, server: 3 };
const atLeast = (current: HexState, floor: HexState): HexState => (RANK[current] >= RANK[floor] ? current : floor);

interface FeedLine { id: number; text: string; tone: 'watch' | 'hit' | 'hold' | 'crack'; }

export function ArenaFocus({ level, levels, activeNumber, onSelect, solved, onSolved }: Readonly<{
  level: Level | null;
  levels: Level[];
  activeNumber: number | null;
  onSelect: (n: number) => void;
  solved: Set<number>;
  onSolved?: (level: number) => void;
}>) {
  const [hex, setHex] = useState<HexState>('contempt');
  const [rage, setRage] = useState(0);
  const [watching, setWatching] = useState('');
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const seq = useRef(0);

  // One place the workbench's moves turn into the warden's reaction. Stable (no deps, functional updates), so
  // the workbench's fetch effect does not re-fire on every render.
  const onActivity = useCallback((a: WorkbenchActivity) => {
    const add = (text: string, tone: FeedLine['tone']) => {
      seq.current += 1;
      const id = seq.current;
      setFeed((f) => [{ id, text, tone }, ...f].slice(0, 10));
    };
    const provoke = (floor: HexState) => {
      setHex((s) => atLeast(s, floor));
      setRage((r) => Math.min(9, r + 1));
    };

    switch (a.kind) {
      case 'open':
        setHex('contempt');
        setRage(0);
        setWatching('');
        seq.current += 1;
        setFeed([{ id: seq.current, text: a.text, tone: 'watch' }]);
        break;
      case 'read':
        setWatching(a.focus ?? '');
        add(a.text, 'watch');
        break;
      case 'edit':
        setHex((s) => atLeast(s, 'enraged'));
        setRage((r) => Math.max(r, 2));
        add(a.text, 'hit');
        break;
      case 'run':
        provoke('enraged');
        add(a.text, 'hit');
        break;
      case 'held':
        provoke('enraged');
        add('the check held - he is still standing', 'hold');
        break;
      case 'error':
        provoke('enraged');
        add('your patch did not build', 'hold');
        break;
      case 'cracked':
        setHex('wrath');
        setRage(9);
        add('the gate fell - you are through', 'crack');
        break;
      case 'launch':
        provoke('enraged');
        add('he watched you run the app', 'hit');
        break;
      case 'bypass':
        setHex('wrath');
        setRage(9);
        add('the lock is bypassed - any key opens it. he is furious, but he kept the flag', 'crack');
        break;
      case 'unlocked':
        setHex('wrath');
        setRage(9);
        add('you recovered the real key - the app is genuinely yours', 'crack');
        break;
      case 'solved':
        setHex('wrath');
        setRage(9);
        add('the flag is submitted - this rung is broken', 'crack');
        break;
    }
  }, []);

  return (
    <div className="arena-focus" aria-label="the arena">
      <aside className="af-rail">
        <div className="af-warden">
          <div className="af-h">
            <span className="label">the warden</span>
            {level && <span className="af-watch">watching &middot; {watching || level.name}</span>}
          </div>
          <Hexwarden state={hex} rage={rage} watching={{ line: watching }} />
        </div>

        <div className="af-levels">
          <label className="af-levels-h" htmlFor="af-level-select">target</label>
          <select
            id="af-level-select"
            className="af-level-select"
            value={activeNumber ?? ''}
            onChange={(e) => onSelect(Number(e.target.value))}
          >
            {levels.map((l) => (
              <option key={l.number} value={l.number}>
                {`0x0${l.number}  ${l.name}${l.available ? '' : '  (soon)'}${solved.has(l.number) ? '  ✓' : ''}`}
              </option>
            ))}
          </select>
        </div>

        <div className="af-feed" aria-label="the warden's feed">
          <div className="af-feed-h">the warden sees</div>
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
        {level && level.available && <Workbench key={level.number} level={level.number} onActivity={onActivity} onSolved={onSolved} />}
        {level && !level.available && (
          <div className="wb">
            <div className="wb-h"><span className="wb-file">{level.name} &middot; in-arena workbench</span></div>
            <div className="wb-term"><div className="wb-term-idle">{level.name} is not built yet, so there is nothing to crack here. Pick a live target (0x01). The warden is holding this rung.</div></div>
          </div>
        )}
        {!level && (
          <div className="wb">
            <div className="wb-term"><div className="wb-term-idle">Pick a target in the rail. The warden is already watching.</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
