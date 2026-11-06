// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useRef, useState } from 'react';
import { type Level } from '../api';
import { Hexwarden, type HexState } from './Hexwarden';
import { Workbench, type WorkbenchActivity } from './Workbench';

// The arena side: what the launcher's run-guide becomes in arena mode. It holds the warden and the in-arena
// workbench (Phase 2), and it is where the warden REACTS (step 4): every workbench move is reported here and
// nudges his state, rage and the activity feed. The real MAPE-K brain (ArenaEngine) re-points in Phase 3; this
// is an honest, bounded client-side escalation driven by what you actually do.

// The order of escalation, so the warden never visibly calms down mid-fight.
const RANK: Record<HexState, number> = { contempt: 0, enraged: 1, wrath: 2, server: 3 };
const atLeast = (current: HexState, floor: HexState): HexState => (RANK[current] >= RANK[floor] ? current : floor);

interface FeedLine { id: number; text: string; tone: 'watch' | 'hit' | 'hold' | 'crack'; }

export function ArenaFocus({ level }: Readonly<{ level: Level | null }>) {
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
      setFeed((f) => [{ id, text, tone }, ...f].slice(0, 8));
    };
    const provoke = (floor: HexState) => {
      setHex((s) => atLeast(s, floor));
      setRage((r) => Math.min(9, r + 1));
    };

    switch (a.kind) {
      case 'open':
        // A fresh target: the warden resets to contempt and the feed starts over.
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
    }
  }, []);

  return (
    <aside className="arena-focus" aria-label="the arena">
      <div className="af-stage">
        <div className="af-warden">
          <div className="af-h">
            <span className="label">the warden</span>
            {level && <span className="af-watch">watching &middot; {watching || level.name}</span>}
          </div>
          <Hexwarden state={hex} rage={rage} watching={{ line: watching }} />
        </div>

        <div className="af-side">
          {level ? (
            <div className="af-target">
              <div className="af-target-h">
                <span className="af-target-name">{level.name}</span>
                <span className={`tag tag-${level.difficulty.toLowerCase()}`}>{level.difficulty}</span>
                <span className={`af-flag ${level.available ? 'live' : 'soon'}`}>{level.available ? 'in the arena' : 'not built yet'}</span>
              </div>
              <p className="af-sum">{level.summary}</p>
            </div>
          ) : (
            <p className="af-empty">Pick a target on the ladder. The warden is already watching.</p>
          )}

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
        </div>
      </div>

      {level && level.available && <Workbench key={level.number} level={level.number} onActivity={onActivity} />}
      {level && !level.available && (
        <div className="wb">
          <div className="wb-h"><span className="wb-file">in-arena workbench</span></div>
          <div className="wb-term"><div className="wb-term-idle">{level.name} is not built yet, so there is nothing to crack here. The warden is holding the rung.</div></div>
        </div>
      )}
    </aside>
  );
}
