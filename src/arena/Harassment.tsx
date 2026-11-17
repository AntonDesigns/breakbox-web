// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useState } from 'react';
import type { WardenHarass } from '../api';

export interface HarassItem { id: number; harass: WardenHarass; }

const TITLES: Record<WardenHarass['kind'], string> = {
  trace: 'TRACE',
  scan: 'INTEGRITY SCAN',
  av: 'Defender',
  flicker: 'SIGNAL',
  countdown: 'LOCKOUT',
};

// The warden's harassment (Phase 4b), and only ever atmosphere. The server's plan step decides when and what; this
// shows it in a corner, never over the editor. It never takes focus and never catches a keystroke (the layer lets
// every pointer event through except its own close buttons, which stay out of the tab order), it is announced
// politely to screen readers, it disappears by itself, and under prefers-reduced-motion its motion is switched
// off in the stylesheet.
export function HarassLayer({ items, onDismiss }: Readonly<{ items: HarassItem[]; onDismiss: (id: number) => void }>) {
  return (
    <div className="hz" role="status" aria-live="polite">
      {items.map((it) => <HarassToast key={it.id} item={it} onDismiss={onDismiss} />)}
    </div>
  );
}

function HarassToast({ item, onDismiss }: Readonly<{ item: HarassItem; onDismiss: (id: number) => void }>) {
  const { kind, text } = item.harass;
  const [count, setCount] = useState(10);

  // The lockout counts down and stalls at one: it never fires, which is the whole joke.
  useEffect(() => {
    if (kind !== 'countdown') return undefined;
    const t = setInterval(() => setCount((c) => (c > 1 ? c - 1 : 1)), 500);
    return () => clearInterval(t);
  }, [kind]);

  return (
    <div className={`hz-toast hz-${kind}`}>
      <div className="hz-head">{TITLES[kind]}</div>
      <div className="hz-text">{kind === 'countdown' ? text.replace('10', String(count)) : text}</div>
      {kind === 'scan' && <div className="hz-scan" aria-hidden="true"><i /></div>}
      <button type="button" className="hz-x" tabIndex={-1} aria-label="dismiss" onClick={() => onDismiss(item.id)}>&times;</button>
    </div>
  );
}
