// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The arms race, as the Anti-cheat and Hack tabs share it. Each anti-cheat is NAMED TO PAIR with its hack
// (server-key / licence / integrity) and bound to a level, so it is obvious which hack counters which
// anti-cheat. Only server-key (Level 1) is enforced for real today: enabling it is the completion loop,
// the key leaves the binary and lives hashed in the DB (challenge.ValidKeyHash = the flag's hash). The
// rest are bound to later levels and bake into the generated build in Sprint 3, so they are "designed".

export interface AntiCheatDef {
  id: string;        // shared with its paired hack: 'server-key' | 'licence' | 'integrity'
  tagline: string;   // what the feature does, in a few words
  level: number;     // the level it shields
  state: 'live' | 'designed';
}

export interface HackDef {
  id: string;        // the anti-cheat it counters (same id)
  tagline: string;   // what the attack does
  level: number;
  state: 'live' | 'locked';   // locked = the paired anti-cheat is not live yet
  terminal: string[];         // the lines the live window types out when the attack runs
  build: string;              // the dynamic file it hands you (named for the anti-cheat, not the hack)
  note: string;               // the escalation note under the window
}

export const ANTICHEATS: AntiCheatDef[] = [
  { id: 'server-key', tagline: 'hash the key into the DB', level: 1, state: 'live' },
  { id: 'licence', tagline: 'server-side licence check', level: 3, state: 'designed' },
  { id: 'integrity', tagline: 'tamper check', level: 3, state: 'designed' },
];

export const HACKS: HackDef[] = [
  {
    id: 'server-key', tagline: 'recover the key', level: 1, state: 'live',
    terminal: [
      '> breakbox-hack --target Level1 --dynamic',
      '> handshaking with the live DB ... ok',
      '> server returns only key_hash',
      '> recovering [##########] 100%',
      '> ACCESS GRANTED',
      'key recovered (hidden) · ********',
      'HACK COMPLETE',
      'the dynamic build is now silently bypassed',
    ],
    build: 'Level1_serverkey.zip',
    note: 'A proper PBKDF2 + server-only compare defeats this recover.',
  },
  {
    id: 'licence', tagline: 'forge the response', level: 3, state: 'locked',
    terminal: [], build: 'Level3_licence.zip',
    note: 'Unlocks once the licence anti-cheat ships into the generated build (Sprint 3).',
  },
  {
    id: 'integrity', tagline: 'patch the verifier', level: 3, state: 'locked',
    terminal: [], build: 'Level3_integrity.zip',
    note: 'Unlocks once the integrity anti-cheat ships into the generated build (Sprint 3).',
  },
];
