// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The arms race, per level, as the Anti-cheat and Hack tabs share it. Each feature is BOUND TO A LEVEL
// and NAMED TO PAIR with its opposite, so it is obvious which hack counters which anti-cheat. The ladder
// only carries the levels that are actually MADE (1-3 today); a level's anti-cheat + hack are added here
// when that level is built. Applying a higher-level feature to a lower-level build is cross-level and
// warns; a hack can only run against its own level's shield (cross-level is locked), per the handoff.
//
// server-key (Level 1) is enforced server-side today (the completion loop). computed-key / licence /
// integrity (L2-L3) bake a real variant into the dynamic build via the generator.

export const LEVELS = [1, 2, 3] as const;

export interface AntiCheatDef {
  id: string;        // shared with its paired hack
  tagline: string;   // what the feature does, in a few words
  level: number;
  state: 'live' | 'designed';
}

export interface HackDef {
  id: string;        // the anti-cheat it counters (same id)
  tagline: string;
  level: number;
  state: 'live' | 'locked';   // locked = the paired anti-cheat is not live yet
  terminal: string[];         // the lines the live window types out when the attack runs
  build: string;              // the dynamic file it hands you (named for the anti-cheat, not the hack)
  note: string;               // the escalation note under the window
}

export const ANTICHEATS: AntiCheatDef[] = [
  { id: 'server-key', tagline: 'hash the key into the DB', level: 1, state: 'live' },
  { id: 'computed-key', tagline: 'harden the serial algorithm', level: 2, state: 'live' },
  { id: 'licence', tagline: 'server-side licence check', level: 3, state: 'designed' },
  { id: 'integrity', tagline: 'tamper check', level: 3, state: 'designed' },
];

const LOCKED: string[] = [];

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
    id: 'computed-key', tagline: 'reverse the algorithm', level: 2, state: 'live',
    terminal: [
      '> breakbox-hack --target Level2 --dynamic',
      '> reading the dynamic build ... ok',
      '> serial is computed, not stored',
      '> reversing the hardened algorithm [##########] 100%',
      '> keygen built',
      'serial recovered (hidden) · ********',
      'HACK COMPLETE',
      'the dynamic build is now silently bypassed',
    ],
    build: 'Level2_computedkey.zip',
    note: 'Computing the serial server-side and never shipping the formula defeats the reverse.',
  },
  { id: 'licence', tagline: 'forge the response', level: 3, state: 'locked', terminal: LOCKED, build: 'Level3_licence.zip', note: 'A signed + nonce licence response defeats the forge.' },
  { id: 'integrity', tagline: 'patch the verifier', level: 3, state: 'locked', terminal: LOCKED, build: 'Level3_integrity.zip', note: 'Server-attested integrity defeats the patch.' },
];
