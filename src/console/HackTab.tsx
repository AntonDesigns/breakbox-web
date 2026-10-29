// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadTarget } from '../api';
import { runAttack } from '../auth';
import { HACKS } from './armsRace';

// The Hack tab: the offensive mirror of Anti-cheat. The left list is the hacks, each paired to the
// anti-cheat it counters and bound to its level (cross-level ones are locked). "Run attack" opens its own
// live window on the right: a terminal types the run out, the key is never shown, and it ends by handing
// you the dynamic build named for the anti-cheat (the bypass is silent, not in the name). The real run
// also fires the dev attack harness, so the whole thing lands in the Threats feed.
export function HackTab({ armed }: Readonly<{ armed: Record<string, boolean> }>) {
  const [sel, setSel] = useState<string>('server-key');
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dl, setDl] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const hack = HACKS.find((h) => h.id === sel) ?? HACKS[0];
  const appliedAc = HACKS.filter((h) => armed[h.id]).map((h) => h.id).join(', ') || 'none';

  const run = useCallback(() => {
    const h = HACKS.find((x) => x.id === sel) ?? HACKS[0];
    if (h.state !== 'live') return;
    if (timer.current) window.clearInterval(timer.current);
    setRunning(true); setDone(false); setDl(false); setLines([]); setProgress(0);
    void runAttack().catch(() => { /* logging the run to the feed is best-effort */ });
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setLines(h.terminal.slice(0, i));
      setProgress(Math.min(100, Math.round((i / h.terminal.length) * 100)));
      if (i >= h.terminal.length) { if (timer.current) window.clearInterval(timer.current); setRunning(false); setDone(true); }
    }, 420);
  }, [sel]);

  const close = () => { setDone(false); setLines([]); setProgress(0); setDl(false); };
  const download = () => { setDl(true); void downloadTarget(hack.level, hack.build); };

  return (
    <div className="hk">
      <p className="ace-lead">run the attack in its own live window</p>
      <p className="ace-ver">latest dynamic version · Level {hack.level} · applied anti-cheat: {appliedAc}</p>

      <div className="ace-grid">
        <div className="ace-list">
          <div className="ace-list-h">hacks (paired with the anti-cheat they counter)</div>
          {HACKS.map((h) => {
            const locked = h.state !== 'live';
            return (
              <div
                key={h.id}
                className={`ace-card ${h.id === sel ? 'on' : ''} ${locked ? 'locked' : ''}`}
                role="button" tabIndex={0}
                onClick={() => { if (!locked) setSel(h.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !locked) setSel(h.id); }}
              >
                <div className="ace-card-main">
                  <div className="ace-card-name"><b>{h.id}</b> · {h.tagline}</div>
                  <div className="ace-card-bound">counters: {h.id}{locked ? ' — locked' : ''}</div>
                </div>
                <span className="ace-lvl">L{h.level}</span>
              </div>
            );
          })}
          <button type="button" className="hk-run-btn" disabled={running || hack.state !== 'live'} onClick={run}>{running ? 'running...' : 'Run attack'}</button>
          <p className="hk-foot">opens its own live window (right), and logs to the Threats feed.</p>
        </div>

        <div className="hk-win">
          <div className="hk-win-h"><span>hacking Level {hack.level} (dynamic)</span><span className="live-dot">live</span></div>
          <div className="hk-term">
            {lines.length === 0 && !running && <div className="hk-term-idle">Select a hack and hit Run attack. The run types out here; the key is never shown.</div>}
            {lines.map((l, i) => <div key={i} className="hk-line">{l}</div>)}
          </div>
          {(running || done) && <div className="hk-bar"><div className="hk-bar-fill" style={{ width: `${progress}%` }} /></div>}
          {done && (
            <div className="hk-build">
              <div className="hk-build-t">your dynamic build is ready</div>
              <div className="hk-build-name">{hack.build}</div>
              <div className="hk-build-sub">same name as the anti-cheat version; the hack is hidden inside</div>
              <div className="hk-build-bar">
                <button type="button" className="hk-dl" onClick={download}>{dl ? 'downloaded' : 'Download (instant)'}</button>
                <button type="button" className="hk-close" onClick={close}>Close</button>
              </div>
            </div>
          )}
          {done && <p className="hk-note">{hack.note}</p>}
        </div>
      </div>

      <p className="con-note">Run attack opens its own live window; the whole run streams to the Threats feed. The key is never shown.</p>
    </div>
  );
}
