"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { Mark, RichText } from "@/lib/emag/types";
import { clearMarks, hasMark, shiftMarks, toggleMark } from "@/lib/emag/marks";

// A paragraph, with emphasis.
//
// A plain textarea rather than a rich text box, and that is a decision
// rather than a shortcut. A contenteditable holds HTML, and the moment the
// words live as HTML the browser owns them: it normalises whitespace,
// injects its own tags on paste, and silently changes the string. This
// build's one promise is that the printed words are the writer's words, so
// the text stays a plain string and the emphasis lives beside it as offsets.
//
// The cost is honest and worth naming: the textarea shows no bold. What
// shows bold is the page next to it, which is the thing being made and the
// only rendering that matters. The toolbar reports what the selection
// carries so nobody has to guess.

const KINDS: { kind: Mark["kind"]; label: string; hint: string }[] = [
  { kind: "bold", label: "Bold", hint: "Bold the selected words" },
  { kind: "italic", label: "Italic", hint: "Italicise the selected words" },
  { kind: "highlight", label: "Highlight", hint: "Tint the selected words in the accent colour" },
];

export function MarkedText({
  content,
  onChange,
  onPasteText,
  rows = 5,
  placeholder,
  style,
}: {
  content: RichText;
  onChange: (next: RichText) => void;
  /** Only supplied where a multi-paragraph paste should split into blocks. */
  onPasteText?: (text: string) => void;
  rows?: number;
  placeholder?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  function readSelection() {
    const el = ref.current;
    if (!el) return;
    setSelection({ start: el.selectionStart, end: el.selectionEnd });
  }

  function apply(kind: Mark["kind"]) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    if (end <= start) return;
    onChange(toggleMark(content, start, end, kind));
    // The selection survives the change, so a writer can bold and then
    // italicise the same phrase without reaching for the mouse again.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  const active = selection.end > selection.start;
  const marked = active ? (content.marks ?? []).length : 0;

  return (
    <div>
      <textarea
        ref={ref}
        value={content.text}
        // shiftMarks works out what changed and moves the offsets with it.
        // Without this, typing a word early in the paragraph leaves every
        // mark after it pointing at the wrong characters.
        onChange={(e) => onChange(shiftMarks(content, e.target.value))}
        onSelect={readSelection}
        onKeyUp={readSelection}
        onClick={readSelection}
        onPaste={(e) => {
          if (!onPasteText) return;
          const text = e.clipboardData.getData("text/plain");
          if (!text || !/\n[ \t]*\n/.test(text)) return;
          e.preventDefault();
          onPasteText(text);
        }}
        rows={rows}
        placeholder={placeholder}
        style={{ ...style, resize: "vertical" }}
      />

      <div style={bar}>
        {KINDS.map(({ kind, label, hint }) => {
          const on = active && hasMark(content, selection.start, selection.end, kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => apply(kind)}
              disabled={!active}
              title={active ? hint : "Select some words first"}
              style={button(on, active)}
            >
              {label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            const el = ref.current;
            if (!el || el.selectionEnd <= el.selectionStart) return;
            onChange(clearMarks(content, el.selectionStart, el.selectionEnd));
          }}
          disabled={!active}
          title={active ? "Remove all emphasis from the selected words" : "Select some words first"}
          style={button(false, active)}
        >
          Plain
        </button>

        <span style={note}>
          {active
            ? "Emphasis shows on the page beside this, not in the box."
            : marked > 0
              ? `${marked} emphasised ${marked === 1 ? "run" : "runs"} in this paragraph.`
              : "Select some words to emphasise them."}
        </span>
      </div>
    </div>
  );
}

const bar: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 6,
};

function button(on: boolean, enabled: boolean): CSSProperties {
  return {
    border: on ? "1px solid #c85a1e" : "1px solid rgba(30,32,32,0.2)",
    background: on ? "#c85a1e" : "#fff",
    color: on ? "#fff" : enabled ? "#1e2020" : "#a5a19c",
    fontWeight: on ? 700 : 500,
    padding: "3px 10px",
    fontSize: 12,
    cursor: enabled ? "pointer" : "default",
  };
}

const note: CSSProperties = { fontSize: 12, color: "#6b6864", marginLeft: 2 };
