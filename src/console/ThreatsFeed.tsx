// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useMemo, useState, useEffect } from 'react';
import { fetchEvents, type AuditEvent } from '../auth';
import { useLoad } from '../useLoad';

// The Threats tab: the live feed of everything, read from the audit log. It is the firehose, so instead
// of a plain list it opens on a metric strip and two live graphs (what is happening and what kind), then
// the time-ordered timeline. Everything is computed from the same events the server scopes to the admin,
// so the numbers and the feed can never disagree. Monochrome on purpose (the blueprint look): a threat is
// a muted stamp, not a red alarm, and weight and position carry the emphasis, not hue.

type Kind = 'threat' | 'write' | 'auth' | 'other';

// What an action means, the one rule the strip, the graphs and the timeline all read, so a row's colour
// and the counts above it always agree.
function kindOf(action: string): Kind {
  const a = action.toLowerCase();
  if (a.includes('fail') || a.includes('block') || a.includes('denied') || a.includes('attack')
    || a.includes('brute') || a.includes('inject') || a.includes('idor')) return 'threat';
  if (a.startsWith('console.') || a === 'register') return 'write';
  if (a === 'login' || a === 'logout') return 'auth';
  return 'other';
}

interface Bucket { t: number; n: number; }
interface Analysis {
  posture: number;          // 100 when nothing recent is pressing the defences, dips under attack load
  perMin: number;           // events in the last minute
  blocked: string;          // every attack in this system is blocked, so this is 100% or a dash
  dbToday: number;          // audited DB writes since midnight
  attacks: number;          // threat-kind events in the window
  buckets: Bucket[];        // events over the loaded window, for the activity graph
  mix: Record<Kind, number>;
}

// Everything the strip and graphs need, derived once from the events.
function analyse(events: readonly AuditEvent[]): Analysis {
  const now = Date.now();
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const mix: Record<Kind, number> = { threat: 0, write: 0, auth: 0, other: 0 };
  const times: number[] = [];
  let attacks = 0, perMin = 0, dbToday = 0, recentThreats = 0;

  for (const e of events) {
    const k = kindOf(e.action);
    const t = new Date(e.at).getTime();
    mix[k]++;
    times.push(t);
    if (k === 'threat') { attacks++; if (now - t <= 300_000) recentThreats++; }
    if (now - t <= 60_000) perMin++;
    if (k === 'write' && t >= midnight.getTime()) dbToday++;
  }

  const n = 28;
  const buckets: Bucket[] = [];
  if (times.length > 0) {
    const max = Math.max(...times), min = Math.min(...times);
    const span = Math.max(max - min, 60_000);
    const step = span / n;
    for (let i = 0; i < n; i++) buckets.push({ t: min + (i + 0.5) * step, n: 0 });
    for (const t of times) {
      const idx = Math.min(n - 1, Math.max(0, Math.floor((t - min) / step)));
      buckets[idx].n++;
    }
  }

  return {
    posture: Math.max(60, 100 - Math.min(recentThreats * 4, 35)),
    perMin,
    blocked: attacks > 0 ? '100%' : '—',
    dbToday,
    attacks,
    buckets,
    mix,
  };
}

const KIND_LABEL: Record<Kind, string> = { threat: 'threats', write: 'db writes', auth: 'auth', other: 'other' };

// The activity graph: a single-hue area of how many events landed in each slice of the loaded window, with
// a crosshair + count on hover. One series, so no legend; the title names it and the peak is labelled.
function ActivityGraph({ buckets }: Readonly<{ buckets: Bucket[] }>) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 900, H = 132, padT = 12, padB = 20, padX = 6;
  const maxN = Math.max(1, ...buckets.map((b) => b.n));
  const n = buckets.length;

  if (n === 0) return <div className="event-empty">No activity yet.</div>;

  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - 2 * padX);
  const y = (v: number) => padT + (1 - v / maxN) * (H - padT - padB);
  const pts = buckets.map((b, i) => [x(i), y(b.n)] as const);
  const line = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)} ${(H - padB).toFixed(1)} L${x(0).toFixed(1)} ${(H - padB).toFixed(1)} Z`;
  const peak = buckets.reduce((hi, b, i) => (b.n > buckets[hi].n ? i : hi), 0);
  const fmt = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tgraph" role="img" aria-label="events over the loaded window"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const vx = ((e.clientX - r.left) / r.width) * W;
        setHover(Math.min(n - 1, Math.max(0, Math.round(((vx - padX) / (W - 2 * padX)) * (n - 1)))));
      }}
    >
      <defs>
        <linearGradient id="tg-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <line x1={padX} y1={H - padB} x2={W - padX} y2={H - padB} className="tg-axis" />
      <path d={area} fill="url(#tg-fill)" />
      <path d={line} className="tg-line" fill="none" />
      <circle cx={x(peak)} cy={y(buckets[peak].n)} r="3.5" className="tg-peak" />
      <text x={x(peak)} y={y(buckets[peak].n) - 8} className="tg-peaklabel" textAnchor="middle">{buckets[peak].n}</text>
      <text x={padX} y={H - 6} className="tg-tick">{fmt(buckets[0].t)}</text>
      <text x={W - padX} y={H - 6} className="tg-tick" textAnchor="end">{fmt(buckets[n - 1].t)}</text>
      {hover !== null && (
        <g className="tg-hover">
          <line x1={x(hover)} y1={padT} x2={x(hover)} y2={H - padB} className="tg-cross" />
          <circle cx={x(hover)} cy={y(buckets[hover].n)} r="3.5" className="tg-dot" />
          <text x={x(hover)} y={padT + 2} className="tg-htext" textAnchor={hover > n / 2 ? 'end' : 'start'} dx={hover > n / 2 ? -6 : 6}>
            {buckets[hover].n} event{buckets[hover].n === 1 ? '' : 's'} · {fmt(buckets[hover].t)}
          </text>
        </g>
      )}
    </svg>
  );
}

// The event mix: one segmented bar of how the window splits across kinds, each segment directly labelled
// so identity never rests on colour alone. Threats sit in the muted stamp tone, the rest in cyan ink.
function MixBar({ mix, total }: Readonly<{ mix: Record<Kind, number>; total: number }>) {
  const order: Kind[] = ['threat', 'write', 'auth', 'other'];
  const shown = order.filter((k) => mix[k] > 0);
  if (total === 0) return null;
  return (
    <div className="tmix">
      <div className="tmix-bar">
        {shown.map((k) => (
          <div key={k} className={`tmix-seg kind-${k}`} style={{ flexGrow: mix[k] }} title={`${mix[k]} ${KIND_LABEL[k]}`} />
        ))}
      </div>
      <div className="tmix-legend">
        {shown.map((k) => (
          <span key={k} className="tmix-item">
            <span className={`tmix-key kind-${k}`} />{mix[k]} {KIND_LABEL[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ThreatsFeed() {
  const { data, error, reload } = useLoad(fetchEvents);

  useEffect(() => {
    const timer = setInterval(reload, 4000);
    return () => clearInterval(timer);
  }, [reload]);

  const events = useMemo(() => data?.events ?? [], [data]);
  const a = useMemo(() => analyse(events), [events]);
  const fmtTime = (t: string) => new Date(t).toLocaleTimeString();

  return (
    <div className="threats">
      {error && <div className="banner banner-error">{error}</div>}

      <div className="tstrip">
        <div className="tstat"><span className="tstat-k">posture</span><span className="tstat-v">{a.posture}<span className="tstat-u"> / 100</span></span></div>
        <div className="tstat"><span className="tstat-k">events / min</span><span className="tstat-v data">{a.perMin}</span></div>
        <div className="tstat"><span className="tstat-k">attacks blocked</span><span className="tstat-v">{a.blocked}</span></div>
        <div className="tstat"><span className="tstat-k">db writes today</span><span className="tstat-v data">{a.dbToday}</span></div>
      </div>

      <div className="tviz">
        <div className="tviz-head"><span className="tviz-title">activity</span><span className="tviz-sub">events over the loaded window ({events.length})</span></div>
        <ActivityGraph buckets={a.buckets} />
        <MixBar mix={a.mix} total={events.length} />
      </div>

      <h3 className="con-subhead tl-head">live timeline</h3>
      <div className="qresult-scroll tl-scroll">
        <table className="qtable tl-table">
          <thead>
            <tr><th>time</th><th>actor</th><th>event</th><th>detail</th></tr>
          </thead>
          <tbody>
            {events.length === 0 && !error && (
              <tr><td colSpan={4} className="tl-empty">No events yet. Sign out and in, or try a wrong password, and watch them appear here.</td></tr>
            )}
            {events.map((ev) => (
              <tr key={ev.id} className={`tl-row kind-${kindOf(ev.action)}`}>
                <td className="tl-time">{fmtTime(ev.at)}</td>
                <td className="tl-actor">{ev.username ?? ev.ip ?? '—'}</td>
                <td className="tl-event">{ev.action}</td>
                <td className="tl-detail">{ev.detail ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="con-note">Every action, attack and DB change streams here live. (Click-through to the Purple-team breakdown lands with that tab.)</p>
    </div>
  );
}
