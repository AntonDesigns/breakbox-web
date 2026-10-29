// BreakBox launcher. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The one place the backend origin lives. Every API module (the launcher's api.ts, the auth/console
// auth.ts) builds its URLs from here. In dev we call a same-origin "/api" that Vite proxies to the API
// (see vite.config.ts), so the app runs on any port without hitting the API's CORS lock; a production
// build calls the real API origin directly.
export const API = import.meta.env.DEV ? '/api' : 'http://localhost:5080/api';
