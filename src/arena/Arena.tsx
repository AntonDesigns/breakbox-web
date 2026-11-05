// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useState } from 'react';
import { fetchLevels, type Level } from '../api';
import { Hexwarden, type HexState } from './Hexwarden';

// The Arena (Phase 1, foundation): the boss-fight shell that replaces the old abstract duel. The real levels
// 1-9 are meant to be cracked LIVE in here while The Hexwarden watches. This phase stands up the shell only -
// the boss on screen (static), the level rail, and the per-level stage - and scaffolds where the in-arena
// workbench will live. The workbench itself (Monaco on the level's real IL/C#, the patch run server-side) is
// Phase 2; the warden's live reactions and the server-enforced ladder are Phase 3. Nothing here decides a
// result, so there is no client-trusted state to fake; the levels come from the same server catalogue the
// launcher uses.
//
// The boss state/rage is derived from the selected level for now (contempt 1-3, enraged 4-6, wrath 7-9) so he
// already looks angrier higher up; in Phase 3 the server drives both from your real actions.
function bossFor(level: number): { state: HexState; rage: number } {
  const rage = Math.max(0, Math.min(9, level - 1));
  const state: HexState = level <= 3 ? 'contempt' : level <= 6 ? 'enraged' : 'wrath';
  return { state, rage };
}

export function Arena({ onClose }: Readonly<{ onClose: () => void }>) {
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(1);

  useEffect(() => {
    let live = true;
    fetchLevels()
      .then((ls) => { if (live) setLevels(ls); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, []);

  const level = levels?.find((l) => l.number === selected) ?? null;
  const boss = bossFor(selected);

  return (
    <section className="arena" aria-label="The Arena">
      <div className="arena-top">
        <div className="arena-title">
          <span className="arena-badge">The Arena</span>
          <span className="arena-sub">boss fight · The Hexwarden · levels 1-9, live</span>
        </div>
        <div className="arena-top-btns">
          <button type="button" className="authbtn ghost" onClick={onClose}>back to launcher</button>
        </div>
      </div>

      <p className="arena-lead">
        The same levels as the launcher, but cracked live inside the arena while The Hexwarden watches, with no
        download and no local tools he cannot see. Step in here and you leave the invisible offline world for his
        home ground, the server. He grows angrier the further you climb, and at the top he withdraws server-side,
        where nothing on your machine can reach him.
      </p>

      {error && <div className="banner banner-error">the arena is unreachable. is the backend running on localhost:38080?</div>}

      {levels && (
        <div className="arena-grid">
          <div className="arena-boss">
            <Hexwarden state={boss.state} rage={boss.rage} />
          </div>

          <div className="arena-main">
            <div className="arena-levels" aria-label="arena levels">
              {levels.map((l) => (
                <button
                  key={l.number}
                  type="button"
                  aria-current={l.number === selected ? 'true' : undefined}
                  className={`arena-lvl ${l.number === selected ? 'on' : ''} ${l.available ? '' : 'locked'}`}
                  onClick={() => setSelected(l.number)}
                >
                  <span className="arena-lvl-n">{String(l.number).padStart(2, '0')}</span>
                  <span className="arena-lvl-name">{l.name}</span>
                  <span className="arena-lvl-diff">{l.difficulty}</span>
                </button>
              ))}
            </div>

            {level && (
              <div className="arena-stage">
                <div className="arena-stage-h">
                  <div className="arena-stage-id">
                    <span className="arena-stage-name">Level {level.number} · {level.name}</span>
                    <span className="arena-stage-sub">{level.tier} · {level.difficulty}</span>
                  </div>
                  <span className={`arena-stage-flag ${level.available ? 'live' : 'soon'}`}>
                    {level.available ? 'playable' : 'not built yet'}
                  </span>
                </div>
                <p className="arena-stage-lead">{level.summary}</p>

                <div className="arena-panes">
                  <div className="arena-pane">
                    <div className="arena-pane-h">in-arena workbench</div>
                    <div className="arena-pane-body arena-soon">
                      The level&apos;s real IL / C# opens here (method tree + code), where you read the key, reverse
                      the serial, or patch the gate, live and with the warden watching. Lands in Phase 2.
                    </div>
                  </div>
                  <div className="arena-pane">
                    <div className="arena-pane-h">the warden</div>
                    <div className="arena-pane-body arena-soon">
                      Every action you take feeds his rage and adaptation, and he taunts you through the Threats
                      feed. Decided on the server. Lands in Phase 3.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!levels && !error && <div className="banner">loading the arena...</div>}
    </section>
  );
}
