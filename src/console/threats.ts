// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The pure analysis behind the Threats monitoring tab. I keep it out of the React component on purpose:
// it is just data in, numbers out, with no rendering, so the dashboard stays a thin view over it and the
// maths can be read (and later tested) on its own. Everything here is derived from the one audit stream
// the server already scopes to the admin, so every panel on the tab agrees by construction.

import type { AuditEvent } from '../auth';

export type Kind = 'threat' | 'write' | 'auth' | 'other';

// The one rule every panel reads, so a row's colour and the counts above it can never disagree.
export function kindOf(action: string): Kind {
  const a = action.toLowerCase();
  if (a.includes('fail') || a.includes('block') || a.includes('denied') || a.includes('attack')
    || a.includes('brute') || a.includes('inject') || a.includes('idor')) return 'threat';
  if (a.startsWith('console.') || a === 'register') return 'write';
  if (a === 'login' || a === 'logout') return 'auth';
  return 'other';
}

// A threat's human label, so the breakdown reads "brute force", not "attack.bruteforce". First keyword
// wins, so the more specific ones are listed before the generic "blocked"/"attack".
const THREAT_RULES: ReadonlyArray<readonly [string, string]> = [
  ['brute', 'brute force'],
  ['inject', 'injection'],
  ['idor', 'IDOR attempt'],
  ['fail', 'failed login'],
  ['denied', 'access denied'],
  ['block', 'blocked'],
  ['attack', 'attack'],
];
export function threatType(action: string): string {
  const a = action.toLowerCase();
  for (const [kw, label] of THREAT_RULES) if (a.includes(kw)) return label;
  return 'other threat';
}

export interface StackBucket { t: number; threat: number; write: number; auth: number; other: number; }
export interface Ranked { label: string; n: number; }
export interface SourceRow { key: string; total: number; threats: number; }
export type PostureState = 'calm' | 'watch' | 'elevated';

export interface Analysis {
  total: number;
  posture: number;            // 100 when nothing recent presses the defences, dips under recent threats
  postureState: PostureState; // the word next to the number
  perMin: number;             // events in the last 60s (the live rate)
  peakPerMin: number;         // busiest minute in the window
  perMinSeries: number[];     // events per minute across the window (the throughput sparkline)
  threatSeries: number[];     // threats per minute across the window (the threat sparkline)
  attacks: number;            // threat-kind events in the window
  blocked: string;            // every attack here is blocked, so 100% or a dash
  dbToday: number;            // audited DB writes since midnight
  activeActors: number;       // distinct usernames/IPs seen in the window
  openSessions: number;       // logins minus logouts, floored at 0
  windowStart: number;
  windowEnd: number;
  stacks: StackBucket[];      // events over time, split by kind (the throughput chart)
  byType: Ranked[];           // threats ranked by type
  sources: SourceRow[];       // the busiest sources, threat-heavy first
  mix: Record<Kind, number>;
}

const BUCKETS = 32;      // columns in the throughput chart
const MAX_MINUTES = 90;  // cap the per-minute series so a long window does not explode the sparkline
const RECENT = 300_000;  // "recent" = last 5 minutes, the window the posture reacts to
const MINUTE = 60_000;

// Everything the strip, the charts and the panels need, derived once from the events.
export function analyse(events: readonly AuditEvent[]): Analysis {
  const now = Date.now();
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const mix: Record<Kind, number> = { threat: 0, write: 0, auth: 0, other: 0 };
  const times: number[] = [];
  const typeCount = new Map<string, number>();
  const srcTotal = new Map<string, number>();
  const srcThreat = new Map<string, number>();
  const actors = new Set<string>();
  let attacks = 0, perMin = 0, dbToday = 0, recentThreats = 0, logins = 0, logouts = 0;

  for (const e of events) {
    const k = kindOf(e.action);
    const t = new Date(e.at).getTime();
    const src = e.username ?? e.ip ?? '—';
    mix[k]++;
    times.push(t);
    actors.add(src);
    srcTotal.set(src, (srcTotal.get(src) ?? 0) + 1);
    if (k === 'threat') {
      attacks++;
      if (now - t <= RECENT) recentThreats++;
      const label = threatType(e.action);
      typeCount.set(label, (typeCount.get(label) ?? 0) + 1);
      srcThreat.set(src, (srcThreat.get(src) ?? 0) + 1);
    }
    if (now - t <= MINUTE) perMin++;
    if (k === 'write' && t >= midnight.getTime()) dbToday++;
    const a = e.action.toLowerCase();
    if (a === 'login') logins++;
    else if (a === 'logout') logouts++;
  }

  const windowStart = times.length ? Math.min(...times) : now;
  const windowEnd = times.length ? Math.max(...times) : now;

  // Events over time, split by kind, for the stacked throughput chart.
  const stacks: StackBucket[] = [];
  if (times.length) {
    const span = Math.max(windowEnd - windowStart, MINUTE);
    const step = span / BUCKETS;
    for (let i = 0; i < BUCKETS; i++) {
      stacks.push({ t: windowStart + (i + 0.5) * step, threat: 0, write: 0, auth: 0, other: 0 });
    }
    for (const e of events) {
      const t = new Date(e.at).getTime();
      const idx = Math.min(BUCKETS - 1, Math.max(0, Math.floor((t - windowStart) / step)));
      stacks[idx][kindOf(e.action)]++;
    }
  }

  // Per-minute rate across the window: the throughput and threat sparklines, and the busiest minute.
  const perMinSeries: number[] = [];
  const threatSeries: number[] = [];
  if (times.length) {
    const startMin = Math.floor(windowStart / MINUTE);
    const endMin = Math.floor(windowEnd / MINUTE);
    const mins = Math.min(MAX_MINUTES, Math.max(1, endMin - startMin + 1));
    for (let i = 0; i < mins; i++) { perMinSeries.push(0); threatSeries.push(0); }
    for (const e of events) {
      const t = new Date(e.at).getTime();
      const mi = Math.min(mins - 1, Math.max(0, Math.floor(t / MINUTE) - startMin));
      perMinSeries[mi]++;
      if (kindOf(e.action) === 'threat') threatSeries[mi]++;
    }
  }
  const peakPerMin = perMinSeries.length ? Math.max(...perMinSeries) : 0;

  const byType = [...typeCount.entries()]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n);

  const sources = [...srcTotal.entries()]
    .map(([key, total]) => ({ key, total, threats: srcThreat.get(key) ?? 0 }))
    .sort((a, b) => (b.threats - a.threats) || (b.total - a.total))
    .slice(0, 6);

  let postureState: PostureState = 'calm';
  if (recentThreats >= 3) postureState = 'elevated';
  else if (recentThreats >= 1) postureState = 'watch';

  return {
    total: events.length,
    posture: Math.max(60, 100 - Math.min(recentThreats * 4, 35)),
    postureState,
    perMin,
    peakPerMin,
    perMinSeries,
    threatSeries,
    attacks,
    blocked: attacks > 0 ? '100%' : '—',
    dbToday,
    activeActors: actors.size,
    openSessions: Math.max(0, logins - logouts),
    windowStart,
    windowEnd,
    stacks,
    byType,
    sources,
    mix,
  };
}
