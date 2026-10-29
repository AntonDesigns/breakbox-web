// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ANTICHEATS } from './armsRace';

// The Anti-cheat tab: enable a feature, watch the level get shielded. The left list toggles the anti-cheats
// (paired with their hack, bound to a level); flipping one on plays the fancy shielding visual on the right
// (build the defence -> SHIELD UP -> LEVEL N PROTECTED -> crack blocked). The armed set is shared with the
// Hack tab, so the two stay in sync. server-key is the real one: it is the live completion loop.
export function AntiCheat({ armed, setArmed }: Readonly<{
  armed: Record<string, boolean>;
  setArmed: Dispatch<SetStateAction<Record<string, boolean>>>;
}>) {
  const firstArmed = ANTICHEATS.find((a) => armed[a.id])?.id ?? ANTICHEATS[0].id;
  const [focus, setFocus] = useState<string>(firstArmed);
  const [phase, setPhase] = useState<'idle' | 'building' | 'up'>(armed[firstArmed] ? 'up' : 'idle');
  const [progress, setProgress] = useState(armed[firstArmed] ? 100 : 0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const build = () => {
    if (timer.current) window.clearInterval(timer.current);
    setPhase('building'); setProgress(0);
    let p = 0;
    timer.current = window.setInterval(() => {
      p += 8;
      setProgress(Math.min(100, p));
      if (p >= 100) { if (timer.current) window.clearInterval(timer.current); setPhase('up'); }
    }, 70);
  };

  const toggle = (id: string) => {
    const next = !armed[id];
    setArmed((a) => ({ ...a, [id]: next }));
    setFocus(id);
    if (next) build();
    else { if (timer.current) window.clearInterval(timer.current); setPhase('idle'); setProgress(0); }
  };

  const select = (id: string) => {
    setFocus(id);
    setPhase(armed[id] ? 'up' : 'idle');
    setProgress(armed[id] ? 100 : 0);
  };

  const ac = ANTICHEATS.find((a) => a.id === focus) ?? ANTICHEATS[0];
  const on = !!armed[ac.id];

  return (
    <div className="ace">
      <p className="ace-lead">enable a feature; watch the level get shielded</p>
      <p className="ace-ver">latest dynamic version · Level {ac.level} <span className="ace-sync">(in sync)</span></p>

      <div className="ace-grid">
        <div className="ace-list">
          <div className="ace-list-h">anti-cheats (paired with their hack)</div>
          {ANTICHEATS.map((a) => (
            <div
              key={a.id}
              className={`ace-card ${a.id === focus ? 'on' : ''}`}
              role="button" tabIndex={0}
              onClick={() => select(a.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') select(a.id); }}
            >
              <div className="ace-card-main">
                <div className="ace-card-name"><b>{a.id}</b> · {a.tagline}</div>
                <div className="ace-card-bound">bound to Level {a.level}</div>
              </div>
              <button
                type="button"
                className={`toggle ${armed[a.id] ? 'on' : ''}`}
                aria-label={`toggle ${a.id}`} aria-pressed={!!armed[a.id]}
                onClick={(e) => { e.stopPropagation(); toggle(a.id); }}
              >
                <span className="knob" />
              </button>
              <span className="ace-lvl">L{a.level}</span>
            </div>
          ))}
        </div>

        <div className="ace-shield">
          <div className="ace-shield-h"><span>shielding Level {ac.level} (dynamic)</span><span className="live-dot">live</span></div>
          {on ? (
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
                    <div className="shield-prot">LEVEL {ac.level} PROTECTED · {ac.id}</div>
                    <div className="shield-blocked">crack blocked</div>
                  </>
                )}
            </div>
          ) : (
            <div className="shield-off">Enable {ac.id} to shield Level {ac.level}.</div>
          )}
        </div>
      </div>

      <p className="con-note">paired with its hack · shown live in Data (key_hash) and the Threats feed.</p>
    </div>
  );
}
