// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import type { CSSProperties } from 'react';
import contempt from './art/hexwarden-1-contempt.svg?raw';
import enraged from './art/hexwarden-2-enraged.svg?raw';
import wrath from './art/hexwarden-3-wrath.svg?raw';
import server from './art/hexwarden-4-server.svg?raw';
import './phase5.css';

// The boss: The Hexwarden, the anti-cheat/defence personified. Every value here is decided on the SERVER: which body
// he shows (his mood, the server form on the arena's last rung, or defeated), his rage, the member he watches, his
// words, the plates of armour your grudge has broken and the one a move just shattered. Since Phase 5 he moves:
// his eyes open one by one as his rage climbs, his beams pulse, a plate shatters and pulls back into its outline,
// he shakes on entering wrath, sinks into the server on the last rung and goes grey when he falls (phase5.css, all
// of it off under prefers-reduced-motion). The SVG is our own generated file (design/arena/hexwarden.py), not user
// input, so rendering it inline is safe, and inline (not an <img>) is what lets the CSS reach inside it.
export type HexState = 'contempt' | 'enraged' | 'wrath' | 'server' | 'defeated';

// He falls on the last rung, so his defeated body is the server form, put out.
const ART: Record<HexState, string> = { contempt, enraged, wrath, server, defeated: server };

interface Phase { label: string; taunt: string }
const PHASES: Record<HexState, Phase> = {
  contempt: { label: 'contempt', taunt: 'Pathetic.' },
  enraged: { label: 'enraged', taunt: 'You read a string. I read you.' },
  wrath: { label: 'wrath', taunt: 'Every patch you make, I unmake.' },
  server: { label: 'the server', taunt: 'Nothing on your machine reaches me.' },
  defeated: { label: 'defeated', taunt: 'You came through the honest way.' },
};

// How far open his eyes are (0..1), from the server's rage within his current body: enraged opens its 19 eyes over
// rage 3 to 6, wrath its four extra eyes over rage 7 to 9. The art gives each eye its place in that order (--n).
function litFor(state: HexState, rage: number): number {
  const clamp = (v: number, lo: number) => Math.max(lo, Math.min(1, v));
  if (state === 'enraged') return clamp((rage - 2) / 4, 0.35);
  if (state === 'wrath') return clamp((rage - 5) / 4, 0.5);
  return 1;
}

export function Hexwarden({ state = 'contempt', rage = 0, watching, beaten = [], shattered, line }: Readonly<{
  state?: HexState;
  rage?: number;
  watching?: { line: string };   // the member he is fixed on
  beaten?: string[];             // plates the player's grudge has broken (server-decided)
  shattered?: string | null;     // the plate the latest move broke, so the break plays once (server-decided)
  line?: string;                 // what he actually said, decided on the server; else his phase taunt
}>) {
  const phase = PHASES[state];
  const pct = Math.max(0, Math.min(100, (rage / 9) * 100));
  const lit = { '--lit': litFor(state, rage) } as CSSProperties;
  return (
    <div
      className={`hx hx-${state}`}
      style={lit}
      data-rage={rage}
      data-beaten={beaten.join(' ')}
      data-breaking={shattered ?? ''}
      data-watching={watching?.line ?? ''}
    >
      <div className="hx-art" dangerouslySetInnerHTML={{ __html: ART[state] }} />
      <div className="hx-meta">
        <div className="hx-state">
          <span className="label">The Hexwarden</span>
          <span className="hx-state-name">{phase.label}</span>
        </div>
        <div className="hx-rage" aria-label={`rage ${rage} of 9`}>
          <span className="hx-rage-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="hx-taunt">&ldquo;{line ?? phase.taunt}&rdquo;</p>
      </div>
    </div>
  );
}
