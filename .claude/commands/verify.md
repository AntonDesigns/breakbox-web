---
description: Verify BreakBox Web — build + lint (and a browser check for UI) — and report the real result
---

Verification gate for the BreakBox web app. Run BOTH and paste the ACTUAL output, never "should work":

1. `npm run build`   (tsc -b && vite build — type-check + bundle)
2. `npm run lint`    (oxlint)

For any UI change, also start the preview, exercise the change in the browser, take a screenshot, and check
`read_console_messages` for errors.

The task is NOT finished unless the build and lint are clean (no new errors) and, for UI, the browser check
passes. Fix failures within the current task scope only, or report them honestly, then re-run.
