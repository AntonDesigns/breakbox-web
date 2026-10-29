// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { fetchEvents } from '../auth';
import { useLoad } from '../useLoad';
import { analyse, kindOf, type Analysis, type Kind, type Ranked, type SourceRow } from './threats';

// The Threats tab: a live security-operations dashboard over the audit log. It is the firehose of the
// whole system, so instead of a plain list it reads like a monitoring console: a metric strip with
// live rate sparklines, a throughput chart that stacks the event kinds over time, two breakdown panels
// (what kind of threat, and which source), and the raw log stream at the bottom. Every panel is derived
// from the one analyse() pass over the same events the server scopes to the admin, so nothing can
// disagree. Monochrome on purpose (the blueprint look): a threat is a muted stamp, not a red alarm, and
// weight, position and labels carry the emphasis, never hue alone.

const STACK_ORDER: Kind[] = ['other', 'auth', 'write', 'threat'];   // drawn bottom to top
const LEGEND_ORDER: Kind[] = ['threat', 'write', 'auth', 'other'];
const KIND_LABEL: Record<Kind, string> = { threat: 'threats', write: 'db writes', auth: 'auth', other: 'other' };

// A tiny single-series trend line for a metric tile. One series, no axes: it shows the shape of the rate,
// the number beside it carries the value.
function Sparkline({ data, tone }: Readonly<{ data: number[]; tone: string }>) {
  const W = 240, H = 26, p = 2;
  if (data.length < 2) return <svg className="spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" />;
  const max = Math.max(1, ...data), n = data.length;
  const x = (i: number) => p + (i / (n - 1)) * (W - 2 * p);
  const y = (v: number) => p + (1 - v / max) * (H - 2 * p);
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={line} className="spark-line" style={{ stroke: tone }} />
    </svg>
  );
}

// The throughput chart: events per time-slice stacked by kind, so the shape shows both how busy the
// system is and what it was busy with. A crosshair + read-out card breaks any slice down on hover.
function Throughput({ a }: Readonly<{ a: Analysis }>) {
  const [hover, setHover] = useState<number | null>(null);
  const { stacks, mix } = a;
  const W = 900, H = 200, padT = 16, padB = 24, padX = 8;
  const n = stacks.length;
  if (n === 0) {
    return <div className="event-empty">No activity yet. Sign out and in, or trip a wrong password, and the stream fills in.</div>;
  }
  const totals = stacks.map((s) => s.threat + s.write + s.auth + s.other);
  const maxTotal = Math.max(1, ...totals);
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - 2 * padX);
  const y = (v: number) => padT + (1 - v / maxTotal) * (H - padT - padB);

  // cumulative lower/upper edge per kind, stacked bottom to top
  const lower: Record<Kind, number[]> = { threat: [], write: [], auth: [], other: [] };
  const upper: Record<Kind, number[]> = { threat: [], write: [], auth: [], other: [] };
  stacks.forEach((s, i) => {
    let c = 0;
    for (const k of STACK_ORDER) { lower[k][i] = c; c += s[k]; upper[k][i] = c; }
  });
  const botIdx = [...Array(n).keys()].reverse();
  const bandArea = (k: Kind) => {
    const top = stacks.map((_, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(upper[k][i]).toFixed(1)}`).join(' ');
    const bot = botIdx.map((i) => `L${x(i).toFixed(1)} ${y(lower[k][i]).toFixed(1)}`).join(' ');
    return `${top} ${bot} Z`;
  };
  const bandLine = (k: Kind) => stacks.map((_, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(upper[k][i]).toFixed(1)}`).join(' ');

  const fmt = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => maxTotal * f);
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.min(n - 1, Math.max(0, Math.round(((vx - padX) / (W - 2 * padX)) * (n - 1)))));
  };
  const tip = hover !== null ? stacks[hover] : null;
  const tipTotal = tip ? tip.threat + tip.write + tip.auth + tip.other : 0;
  const tipLeft = hover !== null ? Math.min(94, Math.max(6, (x(hover) / W) * 100)) : 0;

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="tgraph" role="img" aria-label="events over time, stacked by kind"
        onMouseLeave={() => setHover(null)} onMouseMove={onMove}>
        {gridVals.map((v, gi) => <line key={gi} x1={padX} y1={y(v)} x2={W - padX} y2={y(v)} className="tg-grid" />)}
        {STACK_ORDER.map((k) => <path key={`f-${k}`} d={bandArea(k)} className={`tb-fill kind-${k}`} />)}
        {STACK_ORDER.map((k) => <path key={`l-${k}`} d={bandLine(k)} className={`tb-line kind-${k}`} fill="none" />)}
        <line x1={padX} y1={H - padB} x2={W - padX} y2={H - padB} className="tg-axis" />
        <text x={padX} y={padT - 5} className="tg-peaklabel">max {maxTotal}/slice</text>
        <text x={padX} y={H - 7} className="tg-tick">{fmt(stacks[0].t)}</text>
        <text x={W / 2} y={H - 7} className="tg-tick" textAnchor="middle">{fmt(stacks[Math.floor(n / 2)].t)}</text>
        <text x={W - padX} y={H - 7} className="tg-tick" textAnchor="end">{fmt(stacks[n - 1].t)}</text>
        {hover !== null && <line x1={x(hover)} y1={padT} x2={x(hover)} y2={H - padB} className="tg-cross" />}
      </svg>
      {tip && (
        <div className="tg-tip" style={{ left: `${tipLeft}%` }}>
          <div className="tg-tip-t">{fmt(tip.t)}</div>
          {LEGEND_ORDER.filter((k) => tip[k] > 0).map((k) => (
            <div key={k} className="tg-tip-row"><span>{KIND_LABEL[k]}</span><span className="v">{tip[k]}</span></div>
          ))}
          <div className="tg-tip-row total"><span>total</span><span className="v">{tipTotal}</span></div>
        </div>
      )}
      <div className="tmix-legend">
        {LEGEND_ORDER.map((k) => (
          <span key={k} className="tmix-item"><span className={`tmix-key kind-${k}`} />{mix[k]} {KIND_LABEL[k]}</span>
        ))}
      </div>
    </>
  );
}

// Threats ranked by what they were, so the attack surface under pressure is named, not just counted.
function ByType({ rows }: Readonly<{ rows: Ranked[] }>) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((s, r) => s + r.n, 0);
  return (
    <div className="tpanel">
      <div className="tpanel-head"><span className="tpanel-title">threats by type</span><span className="tpanel-sub">{total} in window</span></div>
      {rows.length === 0
        ? <div className="tpanel-empty">No threats in the window. Quiet is good.</div>
        : (
          <div className="rb-list">
            {rows.map((r) => (
              <div key={r.label} className="rb-row">
                <span className="rb-label" title={r.label}>{r.label}</span>
                <span className="rb-track"><span className="rb-fill kind-threat" style={{ width: `${(r.n / max) * 100}%` }} /></span>
                <span className="rb-val">{r.n}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// The busiest sources, threat-heavy first, so a hostile host rises to the top on its own. The bar splits
// the source's events into its threats (stamp) and the rest (cyan), so one look says who is a problem.
function Sources({ rows }: Readonly<{ rows: SourceRow[] }>) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="tpanel">
      <div className="tpanel-head"><span className="tpanel-title">top sources</span><span className="tpanel-sub">by activity</span></div>
      {rows.length === 0
        ? <div className="tpanel-empty">No activity yet.</div>
        : (
          <div className="rb-list">
            {rows.map((r) => (
              <div key={r.key} className="rb-row">
                <span className="rb-label" title={r.key}>{r.key}</span>
                <span className="rb-track">
                  {r.threats > 0 && <span className="rb-fill kind-threat" style={{ width: `${(r.threats / max) * 100}%` }} />}
                  <span className="rb-fill kind-write" style={{ width: `${((r.total - r.threats) / max) * 100}%` }} />
                </span>
                <span className="rb-val">{r.total}{r.threats > 0 && <em> · {r.threats} threat</em>}</span>
              </div>
            ))}
          </div>
        )}
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
        <div className="tstat">
          <span className="tstat-k">posture<span className={`tstat-chip ${a.postureState}`}>{a.postureState}</span></span>
          <span className="tstat-v">{a.posture}<span className="tstat-u"> / 100</span></span>
          <span className="tstat-sub">{a.activeActors} active {a.activeActors === 1 ? 'source' : 'sources'}</span>
        </div>
        <div className="tstat">
          <span className="tstat-k">throughput</span>
          <span className="tstat-v data">{a.perMin}<span className="tstat-u"> /min</span></span>
          <Sparkline data={a.perMinSeries} tone="var(--cyan)" />
          <span className="tstat-sub">peak {a.peakPerMin}/min</span>
        </div>
        <div className="tstat">
          <span className="tstat-k">attacks blocked</span>
          <span className="tstat-v">{a.attacks}<span className="tstat-u"> · {a.blocked}</span></span>
          <Sparkline data={a.threatSeries} tone="var(--stamp)" />
        </div>
        <div className="tstat">
          <span className="tstat-k">open sessions</span>
          <span className="tstat-v data">{a.openSessions}</span>
          <span className="tstat-sub">signed in now</span>
        </div>
        <div className="tstat">
          <span className="tstat-k">db writes today</span>
          <span className="tstat-v data">{a.dbToday}</span>
          <span className="tstat-sub">all audited</span>
        </div>
      </div>

      <div className="tviz">
        <div className="tviz-head">
          <span className="tviz-title">throughput</span>
          <span className="tviz-sub">events over the loaded window, by kind ({a.total})</span>
        </div>
        <Throughput a={a} />
      </div>

      <div className="tgrid2">
        <ByType rows={a.byType} />
        <Sources rows={a.sources} />
      </div>

      <h3 className="con-subhead tl-head">live log</h3>
      <div className="qresult-scroll tl-scroll">
        <table className="qtable tl-table">
          <thead>
            <tr><th>time</th><th>source</th><th>event</th><th>detail</th></tr>
          </thead>
          <tbody>
            {events.length === 0 && !error && (
              <tr><td colSpan={4} className="tl-empty">No events yet. Sign out and in, or try a wrong password, and watch them stream in.</td></tr>
            )}
            {events.map((ev) => {
              const k = kindOf(ev.action);
              return (
                <tr key={ev.id} className={`tl-row kind-${k}`}>
                  <td className="tl-time">{fmtTime(ev.at)}</td>
                  <td className="tl-actor">{ev.username ?? ev.ip ?? '—'}</td>
                  <td className="tl-event"><span className={`tl-dot kind-${k}`} />{ev.action}</td>
                  <td className="tl-detail">{ev.detail ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="con-note">Every action, attack and DB change streams here live, newest first. (Click-through to the Purple-team breakdown lands with that tab.)</p>
    </div>
  );
}
