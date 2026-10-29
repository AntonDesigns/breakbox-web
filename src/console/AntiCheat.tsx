// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useMemo } from 'react';
import { fetchEvents } from '../auth';
import { useLoad } from '../useLoad';
import { kindOf } from './threats';
import { ARMS, LIVE_DEFENCES } from './armsRace';

// The Anti-cheat tab: the defender's half of the arms race. It shows the platform defences that are
// enforced right now (each demonstrated by the dev attack harness, and shown "firing" live from the feed),
// then the per-level ladder of shields, honest about which are live and which are still designed. The
// counts come from the same audit feed the Threats tab reads, so the defence is shown working, not asserted.
export function AntiCheat() {
  const { data, error, reload } = useLoad(fetchEvents);

  useEffect(() => {
    const timer = setInterval(reload, 4000);
    return () => clearInterval(timer);
  }, [reload]);

  const events = useMemo(() => data?.events ?? [], [data]);
  const blocked = useMemo(() => events.filter((e) => kindOf(e.action) === 'threat').length, [events]);
  const firing = (prefix: string) => events.filter((e) => e.action.toLowerCase().startsWith(prefix)).length;
  const liveLevels = ARMS.filter((a) => a.state === 'live').length;

  return (
    <div className="ac">
      {error && <div className="banner banner-error">{error}</div>}

      <div className="tstrip">
        <div className="tstat"><span className="tstat-k">live defences</span><span className="tstat-v data">{LIVE_DEFENCES.length}</span><span className="tstat-sub">enforced now</span></div>
        <div className="tstat"><span className="tstat-k">levels shielded</span><span className="tstat-v">{liveLevels}<span className="tstat-u"> / {ARMS.length}</span></span><span className="tstat-sub">rest are designed</span></div>
        <div className="tstat"><span className="tstat-k">attacks blocked</span><span className="tstat-v">{blocked}</span><span className="tstat-sub">in the window</span></div>
      </div>

      <section className="ac-card">
        <div className="dx-head"><span className="dx-title">live platform defences</span><span className="dx-sub">enforced on the server, visible in the feed</span></div>
        <div className="ac-grid">
          {LIVE_DEFENCES.map((d) => {
            const n = firing(d.eventPrefix);
            return (
              <div key={d.id} className="ac-def">
                <div className="ac-def-h"><span className="ac-def-name">{d.name}</span><span className={`ac-state ${n > 0 ? 'firing' : 'live'}`}>{n > 0 ? `${n} fired` : 'armed'}</span></div>
                <p className="ac-attack"><span className="ac-lbl">stops</span>{d.attack}</p>
                <p className="ac-control">{d.control}</p>
                <span className="ac-owasp">{d.owasp}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ac-card">
        <div className="dx-head"><span className="dx-title">per-level arms race</span><span className="dx-sub">each shield, and whether it is live or designed</span></div>
        <div className="ac-ladder">
          {ARMS.map((a) => (
            <div key={a.number} className={`ac-rung state-${a.state}`}>
              <div className="ac-rung-h">
                <span className="ac-lvl">L{a.number}</span>
                <span className="ac-lvl-name">{a.name}</span>
                <span className={`ac-state ${a.state}`}>{a.state === 'live' ? 'live' : 'designed'}</span>
                <span className="ac-owasp">{a.owasp}</span>
              </div>
              <p className="ac-weak"><span className="ac-lbl">weakness</span>{a.weakness}</p>
              <p className="ac-shield"><span className="ac-lbl">shield</span>{a.defence}</p>
            </div>
          ))}
        </div>
        <p className="con-note">Level 1's anti-cheat is enforced now (server-side solve verification). The rest harden the target itself and bake into the generated build in Sprint 3; they are shown so the ladder stays honest about what is live.</p>
      </section>
    </div>
  );
}
