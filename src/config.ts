// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The one place the backend origin lives. Every API module (the launcher's api.ts, the auth/console
// auth.ts) builds its URLs from here, so if the origin moves or gets locked down later it changes in a
// single spot rather than in each file.
export const API = 'http://localhost:5080/api';
