// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useState } from 'react';
import { fetchEvents, runAttack, type AuditEvent } from './auth';

// The window into the system: it reads the audit log so I can actually SEE what is happening, not
// guess. It refreshes every few seconds, so a login, a sign-out, a wrong password (and later a
// blocked attack) show up live. The server scopes the feed, so a normal user only ever sees their
// own rows here; the admin sees everything.
export function Monitor({ onClose }: Readonly<{ onClose: () => void }>) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [scope, setScope] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attacking, setAttacking] = useState(false);

  const load = useCallback(async () => {
    try {
      const feed = await fetchEvents();
      setEvents(feed.events);
      setScope(feed.scope);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, 4000);   // live-ish without a websocket
    return () => clearInterval(timer);
  }, [load]);

  // Fire the dev-only attack harness, then refresh so the blocked attempts appear in the feed.
  const runDemo = async () => {
    setAttacking(true);
    try {
      const res = await runAttack();
      if (!res.ok) throw new Error(res.status === 404 ? 'the attack harness is dev-only' : `attack demo failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setAttacking(false);
    }
  };

  return (
    <section className="monitor">
      <div className="monitor-head">
        <h2 className="section">monitor <span className="dim">{scope === 'all' ? 'all events · admin' : 'your activity'}</span></h2>
        <div className="monitor-tools">
          {scope === 'all' && (
            <button type="button" className="attack-btn" onClick={() => { void runDemo(); }} disabled={attacking}>
              {attacking ? 'running...' : 'run attack demo'}
            </button>
          )}
          <button type="button" className="ghost" onClick={() => { void load(); }}>refresh</button>
          <button type="button" className="ghost" onClick={onClose}>back to launcher</button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="eventlist">
        <div className="event-row event-head">
          <span>time</span><span>action</span><span>user</span><span>detail</span><span>ip</span>
        </div>
        {events.length === 0 && !error && (
          <div className="event-empty">No events yet. Sign out and in, or try a wrong password, and watch them appear here.</div>
        )}
        {events.map((ev) => (
          <div key={ev.id} className="event-row">
            <span className="ev-time">{new Date(ev.at).toLocaleTimeString()}</span>
            <span className={`ev-action sev-${severity(ev.action)}`}>{ev.action}</span>
            <span className="ev-user">{ev.username ?? '—'}</span>
            <span className="ev-detail">{ev.detail ?? ''}</span>
            <span className="ev-ip">{ev.ip ?? ''}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Colour the action by what it means: a failure/block reads as a warning, a sign-in/register as ok.
function severity(action: string): string {
  if (action.includes('fail') || action.includes('blocked') || action.includes('denied')) return 'bad';
  if (action === 'login' || action === 'register') return 'good';
  return 'neutral';
}
