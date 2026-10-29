// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The arms race, as one shared model the Anti-cheat tab (defender view) and the Hack tab (attacker view)
// both read. Each level has a weakness, the anti-cheat that shields it, and the paired hack that breaks
// that shield. `state` is honest: "live" means the defence is really enforced in the running system now;
// "designed" means it is planned for a later dynamic build (the generator / Sprint 3), shown so the ladder
// is real but never pretends to do what it cannot yet.

export type DefenceState = 'live' | 'designed';

export interface ArmsEntry {
  number: number;
  name: string;
  weakness: string;   // what the attacker exploits
  defence: string;    // the anti-cheat that counters it
  hack: string;       // the paired attack that breaks the defence
  state: DefenceState;
  owasp: string;
}

// Only Level 1's anti-cheat is enforced today: the platform verifies the solve server-side (the completion
// loop), so reading the key still lets you solve honestly but never lets you fake it. The rest harden the
// target itself and need the Roslyn generator to bake them into the build, so they are "designed".
export const ARMS: ArmsEntry[] = [
  { number: 1, name: 'Password',  state: 'live',
    weakness: 'The licence key is a constant you read straight out of the client.',
    defence: 'The solve is verified server-side: submit checks the flag against the stored hash and records Progress, so a patched or faked client is ignored.',
    hack: 'Read the constant and submit the real flag. You can still solve it honestly; you just cannot fake the solve.',
    owasp: 'A04 Insecure Design' },
  { number: 2, name: 'Serial', state: 'designed',
    weakness: 'The serial is computed in the client (seed * 31 + 1337), so it can be reversed.',
    defence: 'Fold the seed into logic (read-only, not a plain field) so it cannot be read straight out, forcing a real reverse rather than a copy.',
    hack: 'Reverse the algorithm from the seed, or run the keygen in breakbox-security.',
    owasp: 'A04 Insecure Design' },
  { number: 3, name: 'Pixler', state: 'designed',
    weakness: 'The premium gate is a client-side boolean (IsPremium returns false) you can patch.',
    defence: 'Move the decision server-side and integrity-check the binary so a flipped bit is detected.',
    hack: 'Patch IsPremium to true by hand or with the Flip tool, and save the patched assembly.',
    owasp: 'A04 Insecure Design' },
  { number: 4, name: 'Protected', state: 'designed',
    weakness: 'The same gate as Pixler, but obfuscated and anti-debugged to slow the reading.',
    defence: 'Obfuscation + anti-debugging baked into the generated build, so the check is costly to find.',
    hack: 'Strip it with de4dot and step past the anti-debug in x64dbg, then patch as before.',
    owasp: 'A04 Insecure Design' },
  { number: 5, name: 'Overflow', state: 'designed',
    weakness: 'A planted memory-corruption bug in a small native program.',
    defence: 'Bounds checks plus the platform mitigations (ASLR / DEP / stack canaries) that stop the exploit.',
    hack: 'Craft the overflow to take control before the mitigations are in place.',
    owasp: 'A04 Insecure Design' },
  { number: 6, name: 'Cipher', state: 'designed',
    weakness: 'The key is hidden with weak, home-rolled crypto.',
    defence: 'Replace the weak scheme with a vetted algorithm so the key cannot be recovered cheaply.',
    hack: 'Break the weak cipher (CyberChef) and recover the key.',
    owasp: 'A02 Cryptographic Failures' },
  { number: 7, name: 'Sentinel', state: 'designed',
    weakness: 'The program checks itself and refuses to run if patched, but the self-check can be defeated.',
    defence: 'Server-attested integrity, so the check is not something the client alone can satisfy.',
    hack: 'Find and defeat the self-integrity check, then run the patched build.',
    owasp: 'A08 Software & Data Integrity Failures' },
  { number: 8, name: 'Specimen', state: 'designed',
    weakness: 'A sample whose malicious behaviour has to be understood before it can be caught.',
    defence: 'Behavioural detection (YARA signatures) written from the analysis, so the sample is flagged.',
    hack: 'Analyse the behaviour safely in a VM and write detection for it (blue-team, not creation).',
    owasp: 'A08 Software & Data Integrity Failures' },
  { number: 9, name: 'Keysmith', state: 'designed',
    weakness: 'The key is produced by a protected, obfuscated routine.',
    defence: 'Issue the key server-side so the routine the client holds is never the whole story.',
    hack: 'Reverse the protected routine and build a keygen that makes valid keys on demand.',
    owasp: 'A04 Insecure Design' },
];

// The platform-wide defences that are live right now, each demonstrated by the dev attack harness. The
// `eventPrefix` matches the audit actions those attempts write, so a tab can show the defence "firing"
// from the live feed.
export interface LiveDefence {
  id: string;
  name: string;
  attack: string;
  control: string;
  owasp: string;
  eventPrefix: string;
}

export const LIVE_DEFENCES: LiveDefence[] = [
  { id: 'completion', name: 'Solve verification', attack: 'Faking a level completion from the client',
    control: 'The server verifies the submitted flag against the stored hash and records Progress, so a faked or patched client is ignored.',
    owasp: 'A04 Insecure Design', eventPrefix: 'challenge_' },
  { id: 'sqli', name: 'SQL injection block', attack: "A login / query payload like admin' OR '1'='1' --",
    control: 'EF Core parameterises every query, and the query console is SELECT-only inside a rolled-back transaction.',
    owasp: 'A03 Injection', eventPrefix: 'attack_sqli' },
  { id: 'idor', name: 'Row-scoping (IDOR)', attack: "Reading another user's rows by guessing an id",
    control: 'Identity is resolved server-side and a normal user is scoped to their own rows, so the id cannot widen access.',
    owasp: 'A01 Broken Access Control', eventPrefix: 'attack_idor' },
  { id: 'brute', name: 'Brute-force throttle', attack: 'Password guessing in a burst',
    control: 'Failures are counted per source and the login is throttled; passwords are checked against a PBKDF2 hash.',
    owasp: 'A07 Authentication Failures', eventPrefix: 'attack_bruteforce' },
];
