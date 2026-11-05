// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type HTMLAttributes, type SetStateAction } from 'react';
import { downloadTarget } from '../api';
import { runAttack } from '../auth';
import { ANTICHEATS, HACKS } from './armsRace';

// The Hack tab: the offensive mirror of the Anti-cheat tab, and it now works the same way. Each level has
// a single toggle: flip it ON and the attack runs in its live window (the key is never shown) and then
// LATCHES as applied; the state is shared + persisted, so an applied hack stays applied across a reload,
// exactly like an armed anti-cheat stays armed. While it is applied the Download hands over the dynamic
// build named for the anti-cheat (the generator bakes a real bypass, so it unlocks with any key). The one
// level that cannot be applied is the Level 3 licence: the forge is rejected server-side, so its toggle
// runs to FORGE FAILED and does not latch. Only server-key (Level 1) is a real bypass in the generator
// today; the rest narrate the attack and ship their generator bypass in a later sprint.
export function HackTab({ armed, hackOn, setHackOn, level, setLevel }: Readonly<{
  armed: Record<string, boolean>;
  hackOn: Record<number, boolean>;
  setHackOn: Dispatch<SetStateAction<Record<number, boolean>>>;
  level: number;
  setLevel: Dispatch<SetStateAction<number>>;
}>) {
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);   // the run ended in FORGE FAILED (licence): nothing applied
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [dl, setDl] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const stop = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } };

  const runnable = HACKS.find((h) => h.level === level && h.state === 'live') ?? null;
  const armedDefs = ANTICHEATS.filter((a) => a.level === level && armed[a.id]);
  const appliedAc = armedDefs.map((a) => a.id).join(', ') || 'none';
  // Some anti-cheats cannot be hacked: a 'defeated' outcome means the proper server-side defence wins and
  // the run ends in failure with no bypassed build. That is the end of the client-side arms race (Level 3
  // licence). 'applied' is the persisted ON state, and only a bypassable hack can latch there.
  const defeated = armedDefs.some((a) => HACKS.find((x) => x.id === a.id)?.outcome === 'defeated');
  const applied = !!hackOn[level] && !!runnable && !defeated;
  // The build the run hands you is named for the whole armed stack (same convention as the Anti-cheat tab).
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
      : ['> patching the check to always pass · ********', 'HACK COMPLETE', 'the anti-cheat is bypassed: this build unlocks with any key'];
    return [...head, ...body, ...tail];
  }, [level, armed]);

  const run = useCallback(() => {
    stop(); setRunning(true); setFailed(false); setDl(false); setLines([]); setProgress(0);
    void runAttack().catch(() => { /* logging the run to the feed is best-effort */ });
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setLines(script.slice(0, i));
      setProgress(Math.min(100, Math.round((i / script.length) * 100)));
      if (i >= script.length) {
        stop(); setRunning(false);
        if (defeated) setFailed(true);                               // forge rejected: does not latch
        else setHackOn((h) => ({ ...h, [level]: true }));            // bypassed: persist that it is applied
      }
    }, 420);
  }, [script, defeated, level, setHackOn]);

  // The single toggle, mirroring the Anti-cheat tab: ON runs the attack then latches applied; OFF clears it.
  const toggle = () => {
    if (!runnable || running) return;
    if (applied) { stop(); setHackOn((h) => ({ ...h, [level]: false })); setFailed(false); setLines([]); setProgress(0); setDl(false); return; }
    run();
  };

  const pickLevel = (n: number) => { if (n === level) return; stop(); setRunning(false); setFailed(false); setLines([]); setProgress(0); setDl(false); setLevel(n); };

  const download = () => {
    setDl(true);
    // Add the 'hacked' feature so the generator bakes a real bypass: the download keeps the same name but the
    // anti-cheat is defeated (it unlocks with any key and reveals the real flag). The web cannot patch a file
    // on your disk, but it can ask the generator to compile a cracked build.
    void downloadTarget(level, buildName, [...armedDefs.map((a) => a.id), 'hacked']);
  };

  // What the terminal shows: the live run while running; the completed run once applied or failed (so a
  // reopened tab shows the finished state, not a blank window); empty when the hack is simply off.
  const settled = applied || failed;
  const termLines = running ? lines : (settled ? (lines.length ? lines : script) : []);
  const termProgress = running ? progress : (settled ? 100 : 0);

  return (
    <div className="hk">
      <p className="ace-lead">flip the hack on; watch the attack run, then grab the cracked build</p>
      <p className="ace-ver">
        latest dynamic version · Level {level} · applied anti-cheat: {appliedAc}
      </p>

      <div className="ace-grid">
        <div className="ace-list">
          <div className="ace-list-h">hacks · click one to target its level</div>
          {HACKS.map((h) => {
            const live = h.level === level && h.state === 'live';
            const reason = h.level !== level ? 'cross-level, locked' : (h.state !== 'live' ? 'shield not live yet' : '');
            // Clicking a card that is not the current level targets that level: the cards are the level picker
            // now, so the old 1 2 3 buttons are gone. The handler sits on the text region, never wrapping the
            // toggle, so there is no interactive-inside-interactive and the keyboard path stays clean.
            const navMain: HTMLAttributes<HTMLDivElement> = h.level === level ? {} : {
              role: 'button', tabIndex: 0,
              onClick: () => pickLevel(h.level),
              onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickLevel(h.level); } },
            };
            return (
              <div key={h.id} className={`ace-card ${live ? (applied ? 'on' : 'native') : 'locked'}`}>
                <div className="ace-card-main" {...navMain}>
                  <div className="ace-card-name"><b>{h.id}</b> · {h.tagline}</div>
                  <div className="ace-card-bound">counters: {h.id}{reason ? ` — ${reason}` : ''}</div>
                </div>
                {live && (
                  <button
                    type="button"
                    className={`toggle ${applied ? 'on' : ''}`}
                    aria-label={`toggle ${h.id} hack`} aria-pressed={applied}
                    disabled={running}
                    onClick={toggle}
                  >
                    <span className="knob" />
                  </button>
                )}
                <span className="ace-lvl">L{h.level}</span>
              </div>
            );
          })}
          <p className="hk-foot">enabling it runs the attack in its own live window (right), and logs to the Threats feed.</p>
        </div>

        <div className="hk-win">
          <div className="hk-win-h"><span>hacking Level {level} (dynamic)</span><span className="live-dot">live</span></div>
          <div className="hk-term">
            {termLines.length === 0 ? (
              runnable
                ? <div className="hk-term-idle">Hack is off for Level {level}. Flip it on to run the bypass; the build it hands back unlocks with any key.</div>
                : <div className="hk-term-idle">No live hack for Level {level} yet. Pick a made level (1-3) to run its bypass.</div>
            ) : termLines.map((l, i) => <div key={i} className="hk-line">{l}</div>)}
          </div>
          {(running || settled) && <div className="hk-bar"><div className="hk-bar-fill" style={{ width: `${termProgress}%` }} /></div>}
          {applied && (
            <div className="hk-build">
              <div className="hk-build-t">your dynamic build is ready</div>
              <div className="hk-build-name">{buildName}</div>
              <div className="hk-build-sub">same name as the anti-cheat version, but the anti-cheat is defeated: it unlocks with any key</div>
              <div className="hk-build-bar">
                <button type="button" className="hk-dl" onClick={download}>{dl ? 'downloaded' : 'Download (instant)'}</button>
              </div>
            </div>
          )}
          {failed && (
            <div className="hk-build hk-defeated">
              <div className="hk-build-t">the defence held</div>
              <div className="hk-build-sub">no bypassed build: the licence is signed by the server, so a forged grant is rejected and the flag stays the server&apos;s to give. This is where the client-side arms race ends.</div>
            </div>
          )}
          {(applied || failed) && runnable && <p className="hk-note">{runnable.note}</p>}
        </div>
      </div>

      <p className="con-note">Flipping a hack on opens its own live window; the whole run streams to the Threats feed. The key is never shown.</p>
    </div>
  );
}
