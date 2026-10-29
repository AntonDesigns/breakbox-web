// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The arms race, per level, as the Anti-cheat and Hack tabs share it. Each feature is BOUND TO A LEVEL
// and NAMED TO PAIR with its opposite, so it is obvious which hack counters which anti-cheat. The full
// ladder is levels 1-9 (a level can carry more than one anti-cheat, like Level 3's licence + integrity).
// Only server-key (Level 1) is enforced for real today: enabling it is the completion loop, the key leaves
// the binary and lives hashed in the DB. The rest bake into the generated build in Sprint 3, so they are
// "designed" and their hacks are "locked". Applying a higher-level feature to a lower-level build is
// cross-level and warns; a hack can only run against its own level's shield (cross-level is locked), as the
// handoff spec says.

export const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

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
  { id: 'computed-key', tagline: 'compute the serial server-side', level: 2, state: 'designed' },
  { id: 'licence', tagline: 'server-side licence check', level: 3, state: 'designed' },
  { id: 'integrity', tagline: 'tamper check', level: 3, state: 'designed' },
  { id: 'obfuscation', tagline: 'obfuscate + anti-debug the build', level: 4, state: 'designed' },
  { id: 'memory-guard', tagline: 'bounds checks + mitigations', level: 5, state: 'designed' },
  { id: 'strong-crypto', tagline: 'replace the weak cipher', level: 6, state: 'designed' },
  { id: 'attest', tagline: 'server-attested integrity', level: 7, state: 'designed' },
  { id: 'detect', tagline: 'behavioural detection (YARA)', level: 8, state: 'designed' },
  { id: 'key-issue', tagline: 'server-side key issuance', level: 9, state: 'designed' },
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
  { id: 'computed-key', tagline: 'reverse the algorithm', level: 2, state: 'locked', terminal: LOCKED, build: 'Level2_computedkey.zip', note: 'Computing the serial server-side and never shipping the formula defeats the reverse. (Ships Sprint 3.)' },
  { id: 'licence', tagline: 'forge the response', level: 3, state: 'locked', terminal: LOCKED, build: 'Level3_licence.zip', note: 'A signed + nonce licence response defeats the forge. (Ships Sprint 3.)' },
  { id: 'integrity', tagline: 'patch the verifier', level: 3, state: 'locked', terminal: LOCKED, build: 'Level3_integrity.zip', note: 'Server-attested integrity defeats the patch. (Ships Sprint 3.)' },
  { id: 'obfuscation', tagline: 'strip and step past', level: 4, state: 'locked', terminal: LOCKED, build: 'Level4_obfuscation.zip', note: 'Moving the logic server-side leaves nothing on the client to deobfuscate. (Ships Sprint 3.)' },
  { id: 'memory-guard', tagline: 'craft the overflow', level: 5, state: 'locked', terminal: LOCKED, build: 'Level5_memoryguard.zip', note: 'Bounds checks plus ASLR / DEP / stack canaries stop the exploit. (Ships Sprint 3.)' },
  { id: 'strong-crypto', tagline: 'break the cipher', level: 6, state: 'locked', terminal: LOCKED, build: 'Level6_strongcrypto.zip', note: 'A vetted algorithm makes the key too costly to recover. (Ships Sprint 3.)' },
  { id: 'attest', tagline: 'defeat the self-check', level: 7, state: 'locked', terminal: LOCKED, build: 'Level7_attest.zip', note: 'Server-attested integrity is not something the client alone can satisfy. (Ships Sprint 3.)' },
  { id: 'detect', tagline: 'evade the signature', level: 8, state: 'locked', terminal: LOCKED, build: 'Level8_detect.zip', note: 'Behavioural detection catches the sample even when a signature is evaded. (Ships Sprint 3.)' },
  { id: 'key-issue', tagline: 'reverse the routine', level: 9, state: 'locked', terminal: LOCKED, build: 'Level9_keyissue.zip', note: 'Issuing the key server-side means the client routine is never the whole story. (Ships Sprint 3.)' },
];
