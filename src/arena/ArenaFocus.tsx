// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { type Level } from '../api';
import { Hexwarden, type HexState } from './Hexwarden';

// The arena side (Phase 1): what the launcher's run-guide becomes when you flip into the arena. In the
// arena you do not download and crack offline, so the guide gives way to the warden himself, watching the
// level you have chosen on the ladder. The chosen level is the focused one: the warden is keyed to it, and
// its in-arena workbench (the real crack, Phase 2) is scaffolded underneath. His state and rage track the
// level for now (contempt 1-3, enraged 4-6, wrath 7-9); in Phase 3 the server drives both from real actions.
function bossFor(level: number): { state: HexState; rage: number } {
  const rage = Math.max(0, Math.min(9, level - 1));
  let state: HexState = 'wrath';
  if (level <= 3) state = 'contempt';
  else if (level <= 6) state = 'enraged';
  return { state, rage };
}

export function ArenaFocus({ level }: Readonly<{ level: Level | null }>) {
  const boss = level ? bossFor(level.number) : { state: 'contempt' as HexState, rage: 0 };

  return (
    <aside className="arena-focus" aria-label="the arena">
      <div className="af-warden">
        <div className="af-h">
          <span className="label">the warden</span>
          {level && <span className="af-watch">watching &middot; {level.name}</span>}
        </div>
        <Hexwarden state={boss.state} rage={boss.rage} />
      </div>

      {level ? (
        <div className="af-target">
          <div className="af-target-h">
            <span className="af-target-name">{level.name}</span>
            <span className={`tag tag-${level.difficulty.toLowerCase()}`}>{level.difficulty}</span>
            <span className={`af-flag ${level.available ? 'live' : 'soon'}`}>{level.available ? 'in the arena' : 'not built yet'}</span>
          </div>
          <p className="af-sum">{level.summary}</p>
          <div className="af-pane">
            <div className="af-pane-h">in-arena workbench</div>
            <div className="af-pane-b">
              The level&apos;s real IL / C# opens here, where you read the key, reverse the serial, or patch the
              gate, live and with the warden watching every move. Lands in Phase 2.
            </div>
          </div>
        </div>
      ) : (
        <p className="af-empty">Pick a target on the ladder. The warden is already watching.</p>
      )}
    </aside>
  );
}
