// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import Editor, { loader, type OnMount } from '@monaco-editor/react';

// The code surface for the in-arena workbench. Monaco is the locked editor, but it is heavy, so this module
// is only ever imported lazily (React.lazy, from the Workbench): the editor loads the first time you open the
// arena workbench, never on the launcher, so it stays off the main bundle.
//
// It is loaded from a PINNED Monaco build (one fixed version, not a floating "latest"), which also keeps
// Monaco's megabytes out of our own bundle. C# here is syntax colour + plain editing (read the key, patch the
// gate), no IntelliSense, so this is all it needs.
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.57.0/min/vs' } });

// Hands the parent a way to jump the caret to a line (the method tree uses it to reveal a method).
export type EditorJump = (line: number) => void;

const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';

export default function MonacoEditor({ value, onChange, onReady }: Readonly<{
  value: string;
  onChange: (next: string) => void;
  onReady?: (jump: EditorJump) => void;
}>) {
  const handleMount: OnMount = (editor) => {
    onReady?.((line) => {
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    });
  };

  return (
    <Editor
      language="csharp"
      theme="vs-dark"
      value={value}
      onChange={(next) => onChange(next ?? '')}
      onMount={handleMount}
      height="100%"
      loading={<div className="wb-editor-loading">loading the editor...</div>}
      options={{
        fontSize: 14,
        lineHeight: 21,
        fontFamily: MONO,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: 'line',
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
