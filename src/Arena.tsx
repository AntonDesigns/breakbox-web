// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useState } from 'react';
import { arenaMove, arenaStart, type ArenaProfile, type ArenaReasoning, type ArenaState } from './api';

// Level-Experimental: a live duel against an adaptive adversary. It models how you attack, shifts the
// defence to the technique you lean away from, escalates as you diversify, and ends server-side where
// nothing on your machine wins. It opens past what your account has cleared, and shows its own MAPE-K
// reasoning each round, so you can watch it reason about you. Everything is decided on the server.

const MOVES: Record<string, string> = {
  read: 'read the key',
  reverse: 'reverse it',
  patch: 'patch the gate',
  deobfuscate: 'deobfuscate',
};

// The adversary's live reasoning, shown as the autonomic MAPE-K loop it runs each round.
function Mind({ reasoning }: Readonly<{ reasoning: ArenaReasoning | null }>) {
  const steps: ReadonlyArray<readonly [string, string | undefined]> = [
    ['MONITOR', reasoning?.monitor],
    ['ANALYSE', reasoning?.analyse],
    ['PLAN', reasoning?.plan],
    ['EXECUTE', reasoning?.execute],
  ];
  return (
    <div className="arena-mind">
      <div className="arena-mind-h"><span className="label">adversary · MAPE-K</span><span className="live-dot">live</span></div>
      {steps.map(([k, v]) => (
        <div key={k} className="arena-mind-step">
          <span className="arena-mind-k">{k}</span>
          <span className="arena-mind-v">{v ?? 'waiting for your move...'}</span>
        </div>
      ))}
    </div>
  );
}

// The profile the adversary has built of you: how often you reach for each technique. The one it leans on
// (your signature) and the one it avoids (its blind spot) are what the defence targets.
function Profile({ profile }: Readonly<{ profile: ArenaProfile }>) {
  const rows: ReadonlyArray<readonly [string, number]> = [
    ['read', profile.read], ['reverse', profile.reverse], ['patch', profile.patch], ['deobfuscate', profile.deobfuscate],
  ];
  const total = rows.reduce((s, [, n]) => s + n, 0);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  const sig = total > 0 ? rows.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : null;
  const blind = total > 0 ? rows.reduce((a, b) => (b[1] < a[1] ? b : a))[0] : null;
  return (
    <div className="arena-profile">
      <div className="arena-mind-h"><span className="label">your attacker profile</span></div>
      {rows.map(([name, n]) => (
        <div key={name} className={`arena-prof-row ${name === sig ? 'sig' : ''} ${name === blind ? 'blind' : ''}`}>
          <span className="arena-prof-name">{name}{name === sig ? ' · signature' : name === blind ? ' · blind spot' : ''}</span>
          <span className="arena-prof-bar"><span className="arena-prof-fill" style={{ width: `${(n / max) * 100}%` }} /></span>
          <span className="arena-prof-n">{n}</span>
        </div>
      ))}
    </div>
  );
}

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
      setLog([`> the adversary opens at the ${s.rung} rung`]);
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

  return (
    <section className="arena" aria-label="Level-Experimental arena">
      <div className="arena-top">
        <div className="arena-title">
          <span className="arena-badge">Level-Experimental</span>
          <span className="arena-sub">adaptive adversary · Moving Target Defence · MAPE-K</span>
        </div>
        <div className="arena-top-btns">
          <button type="button" className="authbtn" onClick={start} disabled={busy}>restart duel</button>
          <button type="button" className="authbtn ghost" onClick={onClose}>back to launcher</button>
        </div>
      </div>

      <p className="arena-lead">
        This defence is not a script. It watches how you attack, builds a profile of you, and shifts to the
        technique you lean away from, so your favourite move stops working. Diversify and it escalates; drive
        it all the way to server-side and you hit the wall, where nothing on your machine wins. Watch its mind
        on the right. It opens past what your account has already cleared.
      </p>

      {failed && <div className="banner banner-error">the arena is unreachable. is the backend running on localhost:5080?</div>}

      {state && (
        <div className="arena-grid">
          <div className="arena-stage">
            <div className="arena-ladder-h"><span className="label">defence</span>{state.beaten.length} of {state.ladder.length - 1} rungs broken</div>
            <ol className="arena-ladder">
              {state.ladder.map((r) => {
                const isNow = r === state.rung;
                const isBeaten = state.beaten.includes(r);
                const isWall = r === 'server';
                const cls = isNow ? 'now' : isBeaten ? 'past' : 'ahead';
                return (
                  <li key={r} className={`arena-rung ${cls} ${isWall ? 'wall' : ''}`}>
                    <span className="arena-rung-dot" />
                    <span className="arena-rung-name">{r}</span>
                    {isNow && <span className="arena-rung-tag">defending now</span>}
                    {isWall && !isNow && <span className="arena-rung-tag wall">the wall</span>}
                    {isBeaten && !isNow && <span className="arena-rung-tag past">broken</span>}
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
                  THE DEFENCE IS SERVER-SIDE. You showed every technique and drove it to the wall: nothing you
                  run locally beats it, so the flag stays the server&apos;s to give. That is the whole point, and
                  the same place Level 3 ends.
                </div>
              )}
            </div>
          </div>

          <div className="arena-side">
            <div className="arena-meta">
              <span>round <b>{state.round}</b></span>
              <span className="sep">/</span>
              <span>fails <b>{state.fails}</b></span>
            </div>
            <Mind reasoning={state.reasoning} />
            <Profile profile={state.profile} />
            <div className="arena-log">
              {log.map((l, i) => <div key={i} className={`arena-log-line ${l.startsWith('✗') ? 'miss' : ''}`}>{l}</div>)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
