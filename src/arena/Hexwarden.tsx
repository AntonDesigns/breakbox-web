// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import contempt from './art/hexwarden-1-contempt.svg?raw';
import enraged from './art/hexwarden-2-enraged.svg?raw';
import wrath from './art/hexwarden-3-wrath.svg?raw';
import server from './art/hexwarden-4-server.svg?raw';

// The boss: The Hexwarden, the anti-cheat/defence personified. This is the STATIC wiring (Phase 1): it
// renders the right body for the given state and shows the rage meter + taunt from the boss spec. The
// reactive behaviour - eyes and beams tracking the line you are on, a plate shattering when its anti-cheat
// is beaten, rage driven by your real actions - is decided on the server and lands in Phase 3; the props are
// already shaped for it (watching / beaten) and reflected onto the element, so the component's signature does
// not change then. The SVG is our own generated file (design/arena/hexwarden.py), not user input, so
// rendering it inline is safe, and inline (not an <img>) is what lets Phase 3 reach inside it.
export type HexState = 'contempt' | 'enraged' | 'wrath' | 'server';

const ART: Record<HexState, string> = { contempt, enraged, wrath, server };

interface Phase { label: string; taunt: string }
const PHASES: Record<HexState, Phase> = {
  contempt: { label: 'contempt', taunt: 'Pathetic.' },
  enraged: { label: 'enraged', taunt: 'You read a string. I read you.' },
  wrath: { label: 'wrath', taunt: 'Every patch you make, I unmake.' },
  server: { label: 'the server', taunt: 'Nothing on your machine reaches me.' },
};

export function Hexwarden({ state = 'contempt', rage = 0, watching, beaten = [] }: Readonly<{
  state?: HexState;
  rage?: number;
  watching?: { line: string };   // the line the warden is fixed on (Phase 3 aims eyes/beams here)
  beaten?: string[];             // anti-cheats whose plate has been shattered (Phase 3 cracks the plate)
}>) {
  const phase = PHASES[state];
  const pct = Math.max(0, Math.min(100, (rage / 9) * 100));
  return (
    <div
      className={`hx hx-${state}`}
      data-rage={rage}
      data-beaten={beaten.join(' ')}
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
        <p className="hx-taunt">&ldquo;{phase.taunt}&rdquo;</p>
      </div>
    </div>
  );
}
