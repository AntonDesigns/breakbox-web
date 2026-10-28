// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useState } from 'react';
import { fetchEvents, runAttack } from './auth';
import { EventFeed } from './EventFeed';
import { useLoad } from './useLoad';

// The window into the system: it reads the audit log so I can actually SEE what is happening, not guess.
// It refreshes every few seconds, so a login, a sign-out, a wrong password (and later a blocked attack)
// show up live. The server scopes the feed, so a normal user only ever sees their own rows here; the admin
// sees everything. The feed itself is rendered by the shared EventFeed, the same one the Console uses.
export function Monitor({ onClose }: Readonly<{ onClose: () => void }>) {
  const { data, error: loadError, reload } = useLoad(fetchEvents);
  const [error, setError] = useState<string | null>(null);   // errors from the attack-demo trigger
  const [attacking, setAttacking] = useState(false);

  useEffect(() => {
    const timer = setInterval(reload, 4000);   // live-ish without a websocket
    return () => clearInterval(timer);
  }, [reload]);

  // Fire the dev-only attack harness, then refresh so the blocked attempts appear in the feed.
  const runDemo = async () => {
    setAttacking(true);
    try {
      const res = await runAttack();
      if (!res.ok) throw new Error(res.status === 404 ? 'the attack harness is dev-only' : `attack demo failed (${res.status})`);
      setError(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setAttacking(false);
    }
  };

  const scope = data?.scope ?? '';

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
          <button type="button" className="ghost" onClick={reload}>refresh</button>
          <button type="button" className="ghost" onClick={onClose}>back to launcher</button>
        </div>
      </div>

      {(error ?? loadError) && <div className="banner banner-error">{error ?? loadError}</div>}

      <EventFeed
        events={data?.events ?? []}
        emptyHint="No events yet. Sign out and in, or try a wrong password, and watch them appear here."
      />
    </section>
  );
}
