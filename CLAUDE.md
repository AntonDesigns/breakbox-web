# BreakBox Web — CLAUDE.md

The BreakBox launcher + Console (frontend). Written by Max-Anton Horvat, HBO-i S6 "Complex Software
Systems". Signature 0x4D414836 = "MAH6". Canonical rules for this repo: read it before building.

## Stack
- **React 19 + Vite + TypeScript**. Linter: **oxlint**. No unit-test runner yet (see TDD note below).
- Entry: `src/main.tsx` -> `src/App.tsx`. The launcher, auth, Monitor and the admin **Console** are views
  switched by state in `App.tsx`, not a router.
- All backend access goes through `src/api.ts` (public levels) and `src/auth.ts` (credentialed calls). The
  API base URL lives in one place per file.

## Architecture rules (do not break these)
- One place for the API origin. Every credentialed call uses `fetch(..., { credentials: 'include' })` so the
  HttpOnly session cookie rides along; the frontend never reads or stores the token.
- The frontend NEVER makes a trust decision. Admin-only UI (the Console, the monitor's "all events") is a
  convenience; the server re-checks every time. Show the server's 401/403 honestly, don't fake access.
- Honest UI: a feature that is designed but not built is drawn as "designed, not built yet", never faked.

## Engineering standards (non-negotiable, every change)
1. **KISS / YAGNI / SOLID.** Simplest thing that works; build only what the task needs; small, focused
   components; lift shared logic only when it is actually shared.
2. **Strict TDD, red-green-refactor** for any non-trivial logic: write ONE failing test, see it FAIL, minimum
   code to pass (GREEN), refactor. Test-after is not allowed.
   - There is no test runner here yet (YAGNI). The first time we add non-trivial web logic worth unit-testing,
     add **vitest** and TDD it. Until then, pure-UI changes are verified by build + lint + a real browser check.
3. **No "done" without real proof:** run the build and lint and paste the ACTUAL output; for UI, confirm in the
   browser (screenshot) and check the console for errors. Never "should work".
4. **No refactor outside the task scope.**

## Verify (run before declaring any task finished)
```
npm run build   # tsc -b && vite build  (type-check + bundle)
npm run lint    # oxlint
```
For UI work, also load the page, exercise the change, and check `read_console_messages` for errors. `/verify`
runs build + lint for you. CI runs the same on every PR and gates the merge.

## Conventions
- Every source file starts with the author/signature header comment, as the existing files do.
- Comments explain WHY in plain first-person, matching the surrounding files. No em dashes.
- Keep the glass + monochrome-blueprint look: style through the CSS variables in `src/index.css`, don't hardcode
  one-off colours.
