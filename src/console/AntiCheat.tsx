// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ANTICHEATS, LEVELS } from './armsRace';

// The Anti-cheat tab: pick the dynamic-build level, then enable its anti-cheats and watch the fancy
// shielding visual build the defence. Features are bound to levels; applying one bound to a different level
// than the build you are on is cross-level and warns (per the handoff). The level + armed set are shared
// with the Hack tab, so the two stay in sync. server-key (Level 1) is the real one: the live completion loop.
export function AntiCheat({ armed, setArmed, level, setLevel }: Readonly<{
  armed: Record<string, boolean>;
  setArmed: Dispatch<SetStateAction<Record<string, boolean>>>;
  level: number;
  setLevel: Dispatch<SetStateAction<number>>;
}>) {
  const nativeArmedFor = (n: number) => ANTICHEATS.filter((a) => a.level === n && armed[a.id]);
  const [phase, setPhase] = useState<'idle' | 'building' | 'up'>(nativeArmedFor(level).length ? 'up' : 'idle');
  const [progress, setProgress] = useState(nativeArmedFor(level).length ? 100 : 0);
  const [warn, setWarn] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const stop = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } };
  const build = () => {
    stop(); setPhase('building'); setProgress(0);
    let p = 0;
    timer.current = window.setInterval(() => {
      p += 8; setProgress(Math.min(100, p));
      if (p >= 100) { stop(); setPhase('up'); }
    }, 70);
  };

  const pickLevel = (n: number) => {
    stop(); setWarn(null); setLevel(n);
    const on = nativeArmedFor(n).length > 0;
    setPhase(on ? 'up' : 'idle'); setProgress(on ? 100 : 0);
  };

  const toggle = (id: string) => {
    const ac = ANTICHEATS.find((a) => a.id === id)!;
    const next = !armed[id];
    setArmed((a) => ({ ...a, [id]: next }));
    if (ac.level === level) {
      setWarn(null);
      if (next) build();
      else {
        const stillOn = ANTICHEATS.some((a) => a.level === level && a.id !== id && armed[a.id]);
        stop(); setPhase(stillOn ? 'up' : 'idle'); setProgress(stillOn ? 100 : 0);
      }
    } else {
      setWarn(next ? `${id} is a Level ${ac.level} anti-cheat on a Level ${level} build. Know what it does and how it is bypassed.` : null);
    }
  };

  const native = nativeArmedFor(level);
  const names = native.map((a) => a.id).join(' + ');
  const shielded = native.length > 0;

  return (
    <div className="ace">
      <p className="ace-lead">enable a feature; watch the level get shielded</p>
      <p className="ace-ver">
        latest dynamic version · Level{' '}
        <span className="lvl-pick">
          {LEVELS.map((n) => (
            <button key={n} type="button" className={`lvl-btn ${n === level ? 'on' : ''}`} onClick={() => pickLevel(n)}>{n}</button>
          ))}
        </span>
        <span className="ace-sync">(in sync)</span>
      </p>

      {warn && <div className="xlevel-warn"><span className="xlevel-k">cross-level</span>{warn}</div>}

      <div className="ace-grid">
        <div className="ace-list">
          <div className="ace-list-h">anti-cheats (paired with their hack)</div>
          {ANTICHEATS.map((a) => (
            <div key={a.id} className={`ace-card ${a.level === level ? 'native' : 'cross'}`}>
              <div className="ace-card-main">
                <div className="ace-card-name"><b>{a.id}</b> · {a.tagline}</div>
                <div className="ace-card-bound">bound to Level {a.level}</div>
              </div>
              <button
                type="button"
                className={`toggle ${armed[a.id] ? 'on' : ''}`}
                aria-label={`toggle ${a.id}`} aria-pressed={!!armed[a.id]}
                onClick={() => toggle(a.id)}
              >
                <span className="knob" />
              </button>
              <span className="ace-lvl">L{a.level}</span>
            </div>
          ))}
        </div>

        <div className="ace-shield">
          <div className="ace-shield-h"><span>shielding Level {level} (dynamic)</span><span className="live-dot">live</span></div>
          {shielded || phase === 'building' ? (
            <div className="shield-body">
              <svg viewBox="0 0 120 150" className="shield-svg" aria-hidden="true">
                <path className="arc" d="M34 46 A 34 30 0 0 1 86 46" />
                <path className="arc arc2" d="M26 54 A 46 40 0 0 1 94 54" />
                <path className="shield" d="M60 18 L98 32 V72 C98 101 81 119 60 130 C39 119 22 101 22 72 V32 Z" />
                <path className="check" d="M44 72 L55 85 L80 55" />
              </svg>
              <div className="shield-bar"><div className="shield-fill" style={{ width: `${progress}%` }} /></div>
              {phase === 'building'
                ? <div className="shield-status building">building the defence ... {progress}%</div>
                : (
                  <>
                    <div className="shield-status up">SHIELD UP</div>
                    <div className="shield-prot">LEVEL {level} PROTECTED · {names}</div>
                    <div className="shield-blocked">crack blocked</div>
                  </>
                )}
            </div>
          ) : (
            <div className="shield-off">No shield on Level {level} yet. Enable a Level {level} anti-cheat to shield it.</div>
          )}
        </div>
      </div>

      <p className="con-note">paired with its hack · shown live in Data (key_hash) and the Threats feed.</p>
    </div>
  );
}
