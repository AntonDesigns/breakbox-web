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
  bypass: string[];           // the steps this hack narrates to defeat its anti-cheat; the Hack tab
                              // composes the whole run from the bypasses of every ARMED anti-cheat
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
    bypass: [
      '  the key is gone from the binary, only its SHA-256 ships',
      '  handshaking with the live DB ... ok',
      '  the server returns only key_hash, never the key',
      '  recovering the key from the hash [##########] 100%',
    ],
    build: 'Level1_serverkey.zip',
    note: 'A proper PBKDF2 + server-only compare defeats this recover.',
  },
  {
    id: 'computed-key', tagline: 'reverse the algorithm', level: 2, state: 'live',
    bypass: [
      '  the serial is computed, not stored in the binary',
      '  lifting the hardened formula out of IsValid',
      '  reversing (((seed*31+1337)^0x5A5A)*2+7) [##########] 100%',
      '  keygen rebuilt for the hardened algorithm',
    ],
    build: 'Level2_computedkey.zip',
    note: 'Computing the serial server-side and never shipping the formula defeats the reverse.',
  },
  { id: 'licence', tagline: 'forge the response', level: 3, state: 'locked', bypass: LOCKED, build: 'Level3_licence.zip', note: 'A signed + nonce licence response defeats the forge.' },
  { id: 'integrity', tagline: 'patch the verifier', level: 3, state: 'locked', bypass: LOCKED, build: 'Level3_integrity.zip', note: 'Server-attested integrity defeats the patch.' },
];
