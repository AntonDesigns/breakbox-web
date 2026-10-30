// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useState } from 'react';
import { arenaMove, arenaStart, type ArenaState } from './api';

// Level-Experimental: a live Moving Target Defence duel. The defence sits on a ladder of rungs; pick the
// technique that beats the current rung and it SHIFTS to one you have not shown yet, until it goes
// server-side, where nothing on your machine wins. It opens past whatever your account has already cleared,
// so the more you have solved, the closer you start to that wall. Everything is decided on the server.

// The defence ladder, lowest to the wall. Server is the end: the same lesson as Level 3.
const RUNGS = ['plaintext', 'computed', 'patchable', 'obfuscated', 'server'] as const;

// The attacker's techniques, as the buttons label them.
const MOVES: Record<string, string> = {
  read: 'read the key',
  reverse: 'reverse it',
  patch: 'patch the gate',
  deobfuscate: 'deobfuscate',
};

export function Arena({ onClose }: Readonly<{ onClose: () => void }>) {
  const [state, setState] = useState<ArenaState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = useCallback(async () => {
    setBusy(true); setFailed(false); setLog([]);
    try {
      const s = await arenaStart();
      setState(s);
      setLog([`> duel opens at the ${s.rung} rung${s.repertoire.length ? ` (you already bring: ${s.repertoire.join(', ')})` : ''}`]);
    } catch { setFailed(true); } finally { setBusy(false); }
  }, []);

  // Open a duel on mount, so the view is live at rest rather than an empty shell.
  useEffect(() => { void start(); }, [start]);

  const play = async (move: string) => {
    if (!state || state.ended || busy) return;
    setBusy(true); setFailed(false);
    try {
      const s = await arenaMove(move);
      setState(s);
      if (s.narration) setLog((l) => [...l, `${s.beat ? '✓' : '✗'} ${move}: ${s.narration}`]);
    } catch { setFailed(true); } finally { setBusy(false); }
  };

  const rungIndex = state ? RUNGS.indexOf(state.rung as (typeof RUNGS)[number]) : 0;

  return (
    <section className="arena" aria-label="Level-Experimental arena">
      <div className="arena-top">
        <div className="arena-title">
          <span className="arena-badge">Level-Experimental</span>
          <span className="arena-sub">the adaptive arena · Moving Target Defence</span>
        </div>
        <div className="arena-top-btns">
          <button type="button" className="authbtn" onClick={start} disabled={busy}>restart duel</button>
          <button type="button" className="authbtn ghost" onClick={onClose}>back to launcher</button>
        </div>
      </div>

      <p className="arena-lead">
        Pick the technique that beats the current defence. Beat it and the defence shifts to something you
        have not shown yet, so the same move never works twice. Drive it all the way to server-side and you
        hit the wall: nothing on your machine wins there. It opens past what you have already cleared.
      </p>

      {failed && <div className="banner banner-error">the arena is unreachable. is the backend running on localhost:5080?</div>}

      {state && (
        <div className="arena-grid">
          <div className="arena-stage">
            <div className="arena-ladder-h"><span className="label">defence</span>rung {rungIndex + 1} of {RUNGS.length}</div>
            <ol className="arena-ladder">
              {RUNGS.map((r, i) => {
                const cls = r === state.rung ? 'now' : (i < rungIndex ? 'past' : 'ahead');
                return (
                  <li key={r} className={`arena-rung ${cls} ${r === 'server' ? 'wall' : ''}`}>
                    <span className="arena-rung-dot" />
                    <span className="arena-rung-name">{r}</span>
                    {r === state.rung && <span className="arena-rung-tag">defending now</span>}
                    {r === 'server' && <span className="arena-rung-tag wall">the wall</span>}
                  </li>
                );
              })}
            </ol>

            <div className="arena-moves">
              <div className="arena-moves-h"><span className="label">your move</span></div>
              <div className="arena-moves-row">
                {state.moves.map((m) => (
                  <button key={m} type="button" className="arena-move-btn" disabled={busy || state.ended} onClick={() => play(m)}>
                    {MOVES[m] ?? m}
                  </button>
                ))}
              </div>
              {state.ended && (
                <div className="arena-ended">
                  THE DEFENCE IS SERVER-SIDE. You drove it to the wall: nothing you run locally beats it, so
                  the flag stays the server&apos;s to give. That is the whole point, and the same place Level 3 ends.
                </div>
              )}
            </div>
          </div>

          <div className="arena-side">
            <div className="arena-meta">
              <span>round <b>{state.round}</b></span>
              <span className="sep">/</span>
              <span>fails <b>{state.fails}</b></span>
              <span className="sep">/</span>
              <span>proven <b>{state.repertoire.length}</b>/4</span>
            </div>
            <div className="arena-log">
              {log.map((l, i) => <div key={i} className={`arena-log-line ${l.startsWith('✗') ? 'miss' : ''}`}>{l}</div>)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
