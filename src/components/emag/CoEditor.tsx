"use client";

import { useState, useTransition } from "react";
import type { CoEditorDraft, CoEditorTurn } from "@/lib/emag/coeditor";
import type { Block, Opener } from "@/lib/emag/types";

// The co-editor, sitting beside the article rather than in another window.
//
// It writes and it composes. It does not lay out: what comes back is a
// headline, a standfirst and a list of blocks, and the same measurer that
// handles typed text decides where the pages break. So the page count stays
// honest whoever wrote the words.
//
// Nothing it produces goes into the article until the editor says so. The
// draft sits here, gets argued with, and only lands when Use this draft is
// pressed.

export function CoEditor({
  articleId,
  currentOpener,
  onAsk,
  onAccept,
}: {
  articleId: string;
  currentOpener: Opener;
  onAsk: (articleId: string, turns: CoEditorTurn[]) => Promise<CoEditorDraft>;
  onAccept: (opener: Opener, blocks: Block[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<CoEditorTurn[]>([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<CoEditorDraft | null>(null);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ask() {
    const said = input.trim();
    if (!said) return;

    setError(null);
    // Shown immediately, so the editor can see what they asked while it is
    // being answered rather than staring at an empty box.
    const next: CoEditorTurn[] = [...turns, { role: "user", content: said }];
    setTurns(next);
    setInput("");

    startBusy(async () => {
      try {
        const result = await onAsk(articleId, next);
        setDraft(result);
        // The reply is kept as the model's own turn so the next request
        // carries the conversation, and asking for a change means changing
        // that draft rather than starting again.
        setTurns([
          ...next,
          { role: "assistant", content: JSON.stringify({ note: result.note, headline: result.headline, blocks: result.blocks.length }) },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "The co-editor could not answer.");
        setTurns(turns);
      }
    });
  }

  if (!open) {
    return (
      <div style={panel}>
        <button type="button" onClick={() => setOpen(true)} style={openButton}>
          Write with the co-editor
        </button>
        <p style={{ fontSize: 12.5, color: "#6b6864", margin: "8px 0 0", lineHeight: 1.5 }}>
          It knows this section, the pillar it sits under, how long the piece should run, and
          the magazine&apos;s voice and rules. It writes and suggests where pictures belong.
          Nothing reaches the article until you accept it.
        </p>
      </div>
    );
  }

  return (
    <div style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={panelTitle}>Co-editor</h2>
        <button type="button" onClick={() => setOpen(false)} style={quietButton}>
          Close
        </button>
      </div>

      {error ? <p style={{ ...notice, background: "#fdeaea", color: "#8a1f1f" }}>{error}</p> : null}

      {turns.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b6864", margin: "0 0 12px", lineHeight: 1.55 }}>
          Tell it what the piece is about. Paste your notes, an interview, a rough draft, or
          just describe it. The more real detail you give it, the less it has to leave out, and
          it will not invent anything you did not tell it.
        </p>
      ) : null}

      {turns
        .filter((t) => t.role === "user")
        .map((turn, i) => (
          <p key={i} style={said}>
            {turn.content}
          </p>
        ))}

      {busy ? <p style={{ fontSize: 13, color: "#6b6864", margin: "0 0 12px" }}>Writing</p> : null}

      {draft ? (
        <div style={draftBox}>
          {draft.note ? <p style={{ fontSize: 13, lineHeight: 1.55, margin: "0 0 12px" }}>{draft.note}</p> : null}

          <p style={{ fontFamily: "var(--font-mx-playfair), serif", fontSize: 21, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.15 }}>
            {draft.headline}
            {draft.headlineTurn ? <span style={{ color: "#c85a1e" }}> {draft.headlineTurn}</span> : null}
          </p>
          {draft.standfirst ? (
            <p style={{ fontStyle: "italic", fontSize: 14, margin: "0 0 10px", lineHeight: 1.45 }}>
              {draft.standfirst}
            </p>
          ) : null}

          <p style={{ fontSize: 12.5, color: "#6b6864", margin: "0 0 10px" }}>
            {draft.blocks.filter((b) => b.type === "p").length} paragraphs,{" "}
            {draft.blocks.filter((b) => b.type === "subhead").length} subheadings,{" "}
            {draft.blocks.filter((b) => b.type === "pullquote").length} pull quotes
          </p>

          {draft.imagesNeeded.length ? (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#c85a1e", margin: "0 0 6px" }}>
                Pictures this needs
              </p>
              {draft.imagesNeeded.map((image, i) => (
                <p key={i} style={{ fontSize: 12.5, color: "#4a4744", margin: "0 0 4px", lineHeight: 1.45 }}>
                  <strong>{image.where}</strong>, {image.what}. Supply at least{" "}
                  {image.widthPx} by {image.heightPx} pixels.
                </p>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onAccept(
                {
                  ...currentOpener,
                  kicker: draft.kicker || currentOpener.kicker,
                  headline: draft.headline || currentOpener.headline,
                  headlineTurn: draft.headlineTurn || undefined,
                  standfirst: draft.standfirst ? { text: draft.standfirst } : currentOpener.standfirst,
                },
                draft.blocks
              );
              setDraft(null);
            }}
            style={acceptButton}
          >
            Use this draft
          </button>
          <span style={{ fontSize: 12.5, color: "#6b6864", marginLeft: 10 }}>
            This replaces the body. Or ask for changes below.
          </span>
        </div>
      ) : null}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        disabled={busy}
        placeholder={
          turns.length === 0
            ? "What is this piece about? Paste your notes or an interview here."
            : "Make the opening stronger. Cut the fourth paragraph. Add a pull quote near the end."
        }
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <button type="button" onClick={ask} disabled={busy || !input.trim()} style={askButton}>
        {busy ? "Writing" : turns.length === 0 ? "Write it" : "Ask for changes"}
      </button>
    </div>
  );
}

const panel = {
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
  borderLeft: "3px solid #0b6e6e",
  padding: "16px 18px",
  marginBottom: 14,
};

const panelTitle = {
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#0b6e6e",
  fontWeight: 700,
  margin: "0 0 10px",
};

const said = {
  fontSize: 13,
  lineHeight: 1.5,
  background: "#f2efea",
  padding: "8px 11px",
  margin: "0 0 8px",
  whiteSpace: "pre-wrap" as const,
};

const draftBox = {
  border: "1px solid rgba(11,110,110,0.3)",
  background: "#f7fbfb",
  padding: "14px 16px",
  margin: "0 0 12px",
};

// Named inputStyle rather than input, because the component already has a
// piece of state called input holding what the editor is typing, and the
// state was shadowing the style object.
const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid rgba(30,32,32,0.25)",
  padding: "9px 11px",
  fontSize: 14,
  fontFamily: "inherit",
};

const openButton = {
  border: 0,
  background: "#0b6e6e",
  color: "#fff",
  padding: "11px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const askButton = {
  border: 0,
  background: "#0b6e6e",
  color: "#fff",
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 8,
};

const acceptButton = {
  border: 0,
  background: "#c85a1e",
  color: "#fff",
  padding: "9px 18px",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};

const quietButton = {
  border: "1px solid rgba(30,32,32,0.2)",
  background: "#fff",
  padding: "5px 11px",
  fontSize: 12.5,
  cursor: "pointer",
};

const notice = { margin: "0 0 12px", padding: "9px 12px", fontSize: 13.5, lineHeight: 1.5 };
