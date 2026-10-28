// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useState } from 'react';

// Load data from the API once, and again on demand via reload(). The fetch lives in an effect because it
// synchronises the component with an external system (the API); the live-guard drops a result that lands
// after the component unmounts. "loading" is left for the caller to derive (no data and no error yet), so
// the effect does no synchronous setState, which is the pattern the set-state-in-effect lint is happy
// with. `deps` re-run the load when they change (a table name, a page); reload() re-runs it on demand
// (after a write, or on a poll tick). It replaces the fetch/try/catch/useEffect block every panel had.
export function useLoad<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []): {
  data: T | null;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // exhaustive-deps is disabled for this one effect on purpose: `fetcher` is an inline function the caller
  // re-creates each render, so listing it would re-fetch on every render; re-runs are driven instead by
  // `deps` (the caller's own reactive values) and reload(). This is the standard shape for a fetch hook.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    let live = true;
    fetcher()
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : 'request failed'); });
    return () => { live = false; };
  }, [tick, ...deps]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
