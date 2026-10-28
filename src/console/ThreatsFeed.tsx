// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect } from 'react';
import { fetchEvents } from '../auth';
import { EventFeed } from '../EventFeed';
import { useLoad } from '../useLoad';

// The live feed for the Threats tab. It reads the same audit endpoint the Monitor does (and renders it
// through the same EventFeed), so an admin sees the whole system: a sign-out, a wrong password or a
// blocked attack appear within seconds. useLoad does the fetch; a 4s interval re-runs it, live-ish
// without a websocket.
export function ThreatsFeed() {
  const { data, error, reload } = useLoad(fetchEvents);

  useEffect(() => {
    const timer = setInterval(reload, 4000);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <>
      {error && <div className="banner banner-error">{error}</div>}
      <EventFeed
        events={data?.events ?? []}
        emptyHint="No events yet. Sign out and in, or try a wrong password, and watch them appear here."
      />
    </>
  );
}
