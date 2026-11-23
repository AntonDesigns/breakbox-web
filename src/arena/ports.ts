// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import {
  fetchWorkbenchSource, observeWarden, runWorkbenchApp, runWorkbenchHack, runWorkbenchPatch, submitFlag,
  type AppRun, type HackKind, type HackResult, type PatchRun, type WardenView, type WorkbenchMethod,
} from '../api';

// One target in the workbench: which level's template it is (that picks the app, NoteBox or Ledger), its file, its
// method map and its source. key changes whenever the server issues a different target, which is how the
// workbench knows to morph.
export interface Target { key: string; level: number; fileName: string; methods: WorkbenchMethod[]; source: string; }

// What the workbench needs from wherever its target comes from (Phase 6): the ladder (one level and its own
// endpoints) or the gauntlet (the warden's choice, morphing in place). Every verdict still comes from the server;
// a port only says WHICH endpoints judge this target.
export interface WorkbenchPort {
  open?: () => Promise<{ target: Target; warden?: WardenView | null }>;   // the ladder fetches its own target
  observe: (kind: 'read' | 'edit', member?: string, source?: string) => Promise<WardenView>;
  run: (source: string) => Promise<PatchRun>;
  app: (source: string, key: string) => Promise<AppRun>;
  submit: (flag: string) => Promise<{ correct: boolean; warden?: WardenView | null; message: string; solved?: string }>;
  hack?: (kind: HackKind, source: string, key: string) => Promise<HackResult>;   // the ladder's honest hacks only
}

// The ladder: one level, exactly the Phase 2-5 endpoints.
export function ladderPort(level: number, onSolved?: (level: number) => void): WorkbenchPort {
  return {
    open: async () => {
      const ws = await fetchWorkbenchSource(level);
      return {
        target: { key: `ladder-${level}`, level, fileName: ws.fileName, methods: ws.methods, source: ws.source },
        warden: ws.warden,
      };
    },
    observe: (kind, member, source) => observeWarden(level, kind, member, source),
    run: (source) => runWorkbenchPatch(level, source),
    app: (source, key) => runWorkbenchApp(level, source, key),
    submit: async (flag) => {
      const r = await submitFlag(level, flag);
      if (r.correct) onSolved?.(level);
      return r.correct
        ? { correct: true, warden: r.warden, message: 'Flag accepted. This level is cleared, the next rung is open.', solved: `Level ${level} cleared.` }
        : { correct: false, warden: r.warden, message: 'That flag is not right for this target.' };
    },
    hack: async (kind, source, key) => {
      const r = await runWorkbenchHack(level, kind, source, key);
      if (r.worked) onSolved?.(level);
      return r;
    },
  };
}
