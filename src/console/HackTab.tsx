// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { downloadTarget } from '../api';
import { runAttack } from '../auth';
import { ANTICHEATS, HACKS, LEVELS } from './armsRace';

// The Hack tab: the offensive mirror. Pick the dynamic-build level; a hack can only run against its own
// level's shield, so cross-level hacks are locked (a Level 1 hack cannot do a Level 3), per the handoff.
// "Run attack" opens its own live terminal window (the key is never shown) and ends by handing over the
// dynamic build named for the anti-cheat (the bypass is silent). The level + armed set are shared with the
// Anti-cheat tab. Only server-key (Level 1) is live today; the rest ship into the generator in Sprint 3.
export function HackTab({ armed, level, setLevel }: Readonly<{
  armed: Record<string, boolean>;
  level: number;
  setLevel: Dispatch<SetStateAction<number>>;
}>) {
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dl, setDl] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const stop = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } };
  const reset = () => { stop(); setLines([]); setRunning(false); setDone(false); setProgress(0); setDl(false); };

  const runnable = HACKS.find((h) => h.level === level && h.state === 'live') ?? null;
  const armedDefs = ANTICHEATS.filter((a) => a.level === level && armed[a.id]);
  const appliedAc = armedDefs.map((a) => a.id).join(', ') || 'none';
  // Some anti-cheats cannot be hacked: a 'defeated' outcome means the proper server-side defence wins and
  // the run ends in failure, with no bypassed build. That is the end of the client-side arms race (Level 3
  // licence). The build the run hands you (only when it is bypassable) is named for the whole armed stack.
  const defeated = armedDefs.some((a) => HACKS.find((x) => x.id === a.id)?.outcome === 'defeated');
  const buildName = armedDefs.length
    ? `Level${level}_${armedDefs.map((a) => a.id.replace(/-/g, '')).join('_')}.zip`
    : runnable?.build ?? `Level${level}.zip`;

  // The run is composed from the anti-cheats ARMED on this level: the hack narrates, step by step, how it
  // handles each one. Nothing armed = the plain build, nothing to bypass. If any armed anti-cheat is a
  // 'defeated' one (licence), the run ends in FORGE FAILED instead of a silent bypass.
  const script = useMemo(() => {
    const head = [`> breakbox-hack --target Level${level} --dynamic`, '> reading the dynamic build ... ok'];
    const armedHere = ANTICHEATS.filter((a) => a.level === level && armed[a.id]);
    const beaten = armedHere.some((a) => HACKS.find((x) => x.id === a.id)?.outcome === 'defeated');
    const body = armedHere.length === 0
      ? ['> no anti-cheat armed on this level', '> the plain build already reveals the key, nothing to bypass']
      : armedHere.flatMap((a) => {
          const h = HACKS.find((x) => x.id === a.id);
          return [`> anti-cheat detected: ${a.id} (${a.tagline})`, ...(h && h.bypass.length ? h.bypass : ['  no live bypass yet'])];
        });
    const tail = beaten
      ? ['> FORGE FAILED', '> the signed grant cannot be faked without the server key', 'the flag is the server’s to give; patching the client gets you nothing']
      : ['> key recovered (hidden) · ********', 'HACK COMPLETE', 'the dynamic build is now silently bypassed'];
    return [...head, ...body, ...tail];
  }, [level, armed]);

  const run = useCallback(() => {
    if (!runnable) return;
    stop(); setRunning(true); setDone(false); setDl(false); setLines([]); setProgress(0);
    void runAttack().catch(() => { /* logging the run to the feed is best-effort */ });
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setLines(script.slice(0, i));
      setProgress(Math.min(100, Math.round((i / script.length) * 100)));
      if (i >= script.length) { stop(); setRunning(false); setDone(true); }
    }, 420);
  }, [script, runnable]);

  const pickLevel = (n: number) => { reset(); setLevel(n); };
  const download = () => {
    if (!runnable) return;
    setDl(true);
    void downloadTarget(level, buildName, armedDefs.map((a) => a.id));
  };

  return (
    <div className="hk">
      <p className="ace-lead">run the attack in its own live window</p>
      <p className="ace-ver">
        latest dynamic version · Level{' '}
        <span className="lvl-pick">
          {LEVELS.map((n) => (
            <button key={n} type="button" className={`lvl-btn ${n === level ? 'on' : ''}`} onClick={() => pickLevel(n)}>{n}</button>
          ))}
        </span>
        · applied anti-cheat: {appliedAc}
      </p>

      <div className="ace-grid">
        <div className="ace-list">
          <div className="ace-list-h">hacks (paired with the anti-cheat they counter)</div>
          {HACKS.map((h) => {
            const live = h.level === level && h.state === 'live';
            const reason = h.level !== level ? 'cross-level, locked' : (h.state !== 'live' ? 'shield not live yet' : '');
            return (
              <div key={h.id} className={`ace-card ${live ? 'on' : 'locked'}`}>
                <div className="ace-card-main">
                  <div className="ace-card-name"><b>{h.id}</b> · {h.tagline}</div>
                  <div className="ace-card-bound">counters: {h.id}{reason ? ` — ${reason}` : ''}</div>
                </div>
                <span className="ace-lvl">L{h.level}</span>
              </div>
            );
          })}
          <button type="button" className="hk-run-btn" disabled={running || !runnable} onClick={run}>{running ? 'running...' : 'Run attack'}</button>
          <p className="hk-foot">opens its own live window (right), and logs to the Threats feed.</p>
        </div>

        <div className="hk-win">
          <div className="hk-win-h"><span>hacking Level {level} (dynamic)</span><span className="live-dot">live</span></div>
          <div className="hk-term">
            {lines.length === 0 && !running && (
              runnable
                ? <div className="hk-term-idle">Hit Run attack. It narrates how it defeats each armed anti-cheat; the key itself is never shown.</div>
                : <div className="hk-term-idle">No live hack for Level {level} yet. Arm an anti-cheat on a made level (1-3) to see its bypass.</div>
            )}
            {lines.map((l, i) => <div key={i} className="hk-line">{l}</div>)}
          </div>
          {(running || done) && <div className="hk-bar"><div className="hk-bar-fill" style={{ width: `${progress}%` }} /></div>}
          {done && runnable && !defeated && (
            <div className="hk-build">
              <div className="hk-build-t">your dynamic build is ready</div>
              <div className="hk-build-name">{buildName}</div>
              <div className="hk-build-sub">same name as the anti-cheat version; the hack is hidden inside</div>
              <div className="hk-build-bar">
                <button type="button" className="hk-dl" onClick={download}>{dl ? 'downloaded' : 'Download (instant)'}</button>
                <button type="button" className="hk-close" onClick={reset}>Close</button>
              </div>
            </div>
          )}
          {done && defeated && (
            <div className="hk-build hk-defeated">
              <div className="hk-build-t">the defence held</div>
              <div className="hk-build-sub">no bypassed build: the licence is signed by the server, so a forged grant is rejected and the flag stays the server&apos;s to give. This is where the client-side arms race ends.</div>
              <div className="hk-build-bar">
                <button type="button" className="hk-close" onClick={reset}>Close</button>
              </div>
            </div>
          )}
          {done && runnable && <p className="hk-note">{runnable.note}</p>}
        </div>
      </div>

      <p className="con-note">Run attack opens its own live window; the whole run streams to the Threats feed. The key is never shown.</p>
    </div>
  );
}
