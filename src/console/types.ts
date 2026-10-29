// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The six Console tabs and their build stage, shared by the shell and the panels. Split out of the
// Console component so each panel file can import just the tab shape it needs.
export type TabId = 'threats' | 'purple' | 'anticheat' | 'hack' | 'data';
export type Stage = 'built' | 'sprint2' | 'sprint3';

export interface TabDef { id: TabId; label: string; stage: Stage; blurb: string; }

// The six tabs, in the order of the design sheet. The blurb is the one honest sentence of what each tab
// is for; the full behaviour lives in the architecture and the how-it-works document.
export const TABS: TabDef[] = [
  { id: 'threats',   label: 'Threats',     stage: 'built',   blurb: 'The live feed of everything: my own actions, attacks, and the database changes they cause, in one timeline.' },
  { id: 'purple',    label: 'Purple team', stage: 'built',   blurb: 'One event understood from both sides, with the exact code path that handled it and the OWASP category it maps to.' },
  { id: 'anticheat', label: 'Anti-cheat',  stage: 'built', blurb: 'Shield a level. The defence is real and lands in the database and the feed, and is baked into the next dynamic build.' },
  { id: 'hack',      label: 'Hack',        stage: 'built', blurb: 'Break one anti-cheat. Run attack opens its own live window; the hack counters exactly the defence it is paired with.' },
  { id: 'data',      label: 'Data',        stage: 'built',   blurb: 'A live database IDE over my own MySQL: the schema as a tree, a read-only query editor, and how each table was made.' },
];

export const STAGE_LABEL: Record<Stage, string> = { built: 'built', sprint2: 'Sprint 2', sprint3: 'Sprint 3' };
