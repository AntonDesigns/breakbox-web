// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import type { WardenView } from '../api';

// The boss bar (Phase 5): the Hexwarden's name and the body he is in, the arena's rungs as his health (the ones you
// broke with a real flag struck through, the one you are on lit, the last one marked as his server form), and how
// often you have beaten him. All of it is the server's ladder; the bar only draws it.
const FORM: Record<WardenView['form'], string> = {
  contempt: 'contempt',
  enraged: 'enraged',
  wrath: 'wrath',
  server: 'the server',
  defeated: 'defeated',
};

export function BossBar({ warden, level }: Readonly<{ warden: WardenView; level: number }>) {
  const { final, cleared, defeats } = warden.ladder;
  if (final < 1) return null;
  const broken = new Set(cleared);
  const rungs = Array.from({ length: final }, (_, i) => i + 1);
  const rungClass = (n: number) =>
    ['bb-rung', broken.has(n) ? 'broken' : '', n === level ? 'here' : '', n === final ? 'last' : ''].filter(Boolean).join(' ');

  return (
    <div className={`bb bb-${warden.form}`} role="group" aria-label={`the Hexwarden, ${broken.size} of ${final} rungs broken`}>
      <div className="bb-name">The Hexwarden<span className="bb-form">{FORM[warden.form]}</span></div>
      <ol className="bb-rungs">
        {rungs.map((n) => <li key={n} className={rungClass(n)}>{`0x0${n}`}</li>)}
      </ol>
      <div className="bb-tally">{defeats > 0 ? `beaten ${defeats}x` : 'never beaten'}</div>
    </div>
  );
}
