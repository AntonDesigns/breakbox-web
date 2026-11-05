// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useState } from 'react';

// A localStorage-backed useState, so a bit of console state survives a reload: an armed anti-cheat stays
// armed and an applied hack stays applied, instead of resetting every time the page is opened. It is the
// same idea as usePersistentBool in App.tsx, generalised to any JSON value. Storage can be unavailable
// (private window, blocked site data), so every read and write is guarded and falls back to in-memory,
// which keeps the app working, just without the memory across reloads.
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable: keep it in memory */ }
      return next;
    });
  }, [key]);

  return [value, set];
}
