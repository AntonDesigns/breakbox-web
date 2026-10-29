// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEvents, runAttack } from '../auth';
import { useLoad } from '../useLoad';
import { kindOf } from './threats';
import { ARMS } from './armsRace';

// The Hack tab: the attacker's half of the arms race. "Run attack" fires the dev-only harness at the
// running app (SQL injection, IDOR, a brute-force burst) and the live window below fills with the blocked
// attempts straight from the feed, the defence working in real time. The ladder lists the paired hack for
// each level and whether its shield is live yet. The harness is dev-only and admin-only on the server.
interface AttackResult { attack: string; blocked: boolean; }

export function HackTab() {
  const { data, error, reload } = useLoad(fetchEvents);

  useEffect(() => {
    const timer = setInterval(reload, 4000);
    return () => clearInterval(timer);
  }, [reload]);

  const events = useMemo(() => data?.events ?? [], [data]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<AttackResult[] | null>(null);
  const [runErr, setRunErr] = useState<string | null>(null);

  const fire = useCallback(async () => {
    setRunning(true); setRunErr(null);
    try {
      const res = await runAttack();
      if (!res.ok) {
        setRunErr(res.status === 404 ? 'The attack harness is dev-only (the API returns 404 outside Development).' : `attack failed: ${res.status}`);
        return;
      }
      const body = await res.json() as { results: AttackResult[] };
      setResults(body.results);
      reload();                  // the blocked attempts land in the feed
      setTimeout(reload, 800);   // and once more as they settle
    } catch {
      setRunErr('Could not reach the API.');
    } finally {
      setRunning(false);
    }
  }, [reload]);

  const attackEvents = useMemo(
    () => events.filter((e) => kindOf(e.action) === 'threat' || e.action.toLowerCase().startsWith('attack_')),
    [events],
  );
  const fmt = (t: string) => new Date(t).toLocaleTimeString();

  return (
    <div className="hack">
      {error && <div className="banner banner-error">{error}</div>}

      <section className="ac-card">
        <div className="dx-head"><span className="dx-title">run attack</span><span className="dx-sub">fire the harness at the running app and watch it get blocked</span></div>
        <div className="hk-bar">
          <button type="button" className="run" disabled={running} onClick={() => { void fire(); }}>{running ? 'running...' : 'run attack'}</button>
          <span className="con-qhint">SQL injection, IDOR and a brute-force burst, fired live. Every one should be blocked and land in the feed.</span>
        </div>
        {runErr && <div className="banner banner-error hk-err">{runErr}</div>}
        {results && (
          <div className="hk-results">
            {results.map((r) => (
              <div key={r.attack} className={`hk-res ${r.blocked ? 'blocked' : 'through'}`}>
                <span className="hk-res-name">{r.attack}</span>
                <span className="hk-res-v">{r.blocked ? 'blocked' : 'GOT THROUGH'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ac-card">
        <div className="dx-head"><span className="dx-title">the hacks</span><span className="dx-sub">each attack, and whether its shield is live yet</span></div>
        <div className="ac-ladder">
          {ARMS.map((a) => (
            <div key={a.number} className={`ac-rung state-${a.state}`}>
              <div className="ac-rung-h">
                <span className="ac-lvl">L{a.number}</span>
                <span className="ac-lvl-name">{a.name}</span>
                <span className={`hk-lands ${a.state === 'live' ? 'no' : 'yes'}`}>{a.state === 'live' ? 'shield is live' : 'lands until the shield ships'}</span>
              </div>
              <p className="ac-weak"><span className="ac-lbl">hack</span>{a.hack}</p>
            </div>
          ))}
        </div>
      </section>

      <h3 className="con-subhead tl-head">live attack window</h3>
      <div className="qresult-scroll tl-scroll">
        <table className="qtable tl-table">
          <thead><tr><th>time</th><th>source</th><th>event</th><th>detail</th></tr></thead>
          <tbody>
            {attackEvents.length === 0 && !error && (
              <tr><td colSpan={4} className="tl-empty">No attacks yet. Hit "run attack" and watch them get blocked.</td></tr>
            )}
            {attackEvents.map((ev) => (
              <tr key={ev.id} className="tl-row kind-threat">
                <td className="tl-time">{fmt(ev.at)}</td>
                <td className="tl-actor">{ev.username ?? ev.ip ?? '—'}</td>
                <td className="tl-event"><span className="tl-dot kind-threat" />{ev.action}</td>
                <td className="tl-detail">{ev.detail ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="con-note">The harness is dev-only and admin-only on the server; it is the live demonstration of the defences holding. The paired hacks above break the per-level shields once those ship into the generated build.</p>
    </div>
  );
}
