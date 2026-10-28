// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import type { AuditEvent } from './auth';

// Colour an action by what it means: a failure or a block reads as a warning, a sign-in or register as
// ok. Private to this file so EventFeed is the one thing it exports; the Monitor and the Console's Threats
// tab get the identical colouring by rendering through EventFeed rather than each keeping a copy.
function severity(action: string): string {
  if (action.includes('fail') || action.includes('blocked') || action.includes('denied')) return 'bad';
  if (action === 'login' || action === 'register') return 'good';
  return 'neutral';
}

// The audit-feed table, shared by the Monitor and the Console's Threats tab: the same rows, the same
// colouring, read from the same endpoint, so the two can never drift apart. The empty-state hint is the
// one thing each caller words for its own context.
export function EventFeed({ events, emptyHint }: Readonly<{ events: AuditEvent[]; emptyHint: string }>) {
  return (
    <div className="eventlist">
      <div className="event-row event-head">
        <span>time</span><span>action</span><span>user</span><span>detail</span><span>ip</span>
      </div>
      {events.length === 0 && <div className="event-empty">{emptyHint}</div>}
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
  );
}
