"use client";

import { useState, useTransition, type CSSProperties } from "react";
import type { ImportPreview } from "@/app/bizup/kwaaipress/moxie/editions/[id]/import/actions";

// Paste an edition, look at what the builder made of it, then decide.
//
// Reading and creating are two buttons because they are two different acts.
// Nothing is written until the second one, so a publisher can paste, look,
// fix the pack, and paste again as many times as it takes.

const BLOCK_NAMES: Record<string, string> = {
  p: "paragraph",
  subhead: "subheading",
  pullquote: "pull quote",
  tip: "Moxie Tip",
  stats: "fact grid",
  facts: "fact grid",
  figure: "picture",
  list: "list",
  rows: "rows",
  writer: "writer credit",
};

function describe(counts: Record<string, number>): string {
  const parts = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n} ${BLOCK_NAMES[type] ?? type}${n === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "nothing";
}

export function PackImporter({
  editionId,
  onPreview,
  onImport,
}: {
  editionId: string;
  onPreview: (editionId: string, source: string) => Promise<ImportPreview>;
  onImport: (
    editionId: string,
    source: string,
    chosen: string[]
  ) => Promise<{ created: number; skipped: number }>;
}) {
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function read() {
    setError(null);
    setDone(null);
    start(async () => {
      try {
        const result = await onPreview(editionId, source);
        setPreview(result);
        // Everything real starts ticked. Anything already in the edition, or
        // that looks like an unwritten slot, starts unticked: the common case
        // is to want it, and the dangerous case should need a deliberate act.
        setChosen(
          new Set(
            result.articles
              .filter((a) => !a.exists && !a.looksUnwritten)
              .map((a) => a.heading)
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that pack.");
      }
    });
  }

  function toggle(heading: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });
  }

  function create() {
    setError(null);
    start(async () => {
      try {
        const result = await onImport(editionId, source, [...chosen]);
        setDone(result);
        setPreview(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create the articles.");
      }
    });
  }

  const toCreate = chosen.size;
  const alreadyIn = preview?.articles.filter((a) => a.exists).length ?? 0;

  return (
    <div>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744", maxWidth: 640 }}>
        Paste the whole copy pack, headings and all. Nothing is created until you say so, and
        your words are never rewritten: every paragraph arrives exactly as you typed it.
      </p>

      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={12}
        placeholder="Paste the copy pack here, starting from the top of the file."
        style={{
          width: "100%",
          padding: 12,
          fontSize: 13,
          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
          border: "1px solid rgba(30,32,32,0.2)",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={read} disabled={!source.trim() || busy} style={secondary}>
          {busy && !preview ? "Reading" : "Read it"}
        </button>
        <span style={{ fontSize: 13, color: "#6b6864" }}>
          {source ? `${source.length.toLocaleString()} characters pasted` : ""}
        </span>
      </div>

      {error ? <p style={{ ...panel, background: "#fdeaea", color: "#8a1f1f" }}>{error}</p> : null}

      {done ? (
        <p style={{ ...panel, background: "#eaf5ea", color: "#1f5f2a" }}>
          Created {done.created} article{done.created === 1 ? "" : "s"}
          {done.skipped ? `, skipped ${done.skipped} already in this edition` : ""}. They are drafts,
          so nothing is on the flatplan until you approve them.
        </p>
      ) : null}

      {preview ? (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 10px" }}>
            {preview.articles.length} article{preview.articles.length === 1 ? "" : "s"} found
          </h2>

          {preview.warnings.length ? (
            <div style={{ ...panel, background: "#fdf4e6", color: "#7a4a10" }}>
              <strong>Worth a look before you create these</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <ol style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
            {preview.articles.map((a, i) => (
              <li key={i} style={{ ...card, opacity: a.exists ? 0.55 : 1 }}>
                <input
                  type="checkbox"
                  checked={chosen.has(a.heading)}
                  disabled={a.exists}
                  onChange={() => toggle(a.heading)}
                  aria-label={`Create ${a.heading}`}
                  style={{ marginTop: 4 }}
                />
                <span style={folio}>{a.pageRange}</span>
                <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>
                    {a.heading}
                    {a.exists ? (
                      <span style={{ fontWeight: 400, color: "#6b6864" }}> · already in this edition</span>
                    ) : a.looksUnwritten ? (
                      <span style={{ fontWeight: 400, color: "#a8641a" }}> · no headline, looks like a slot rather than an article</span>
                    ) : null}
                  </span>
                  <span style={{ display: "block", fontSize: 13, color: "#6b6864", marginTop: 2 }}>
                    {a.headline || "No headline in the pack"}
                  </span>
                  {a.standfirst ? (
                    <span style={{ display: "block", fontSize: 12, color: "#8a8681", marginTop: 2, fontStyle: "italic" }}>
                      {a.standfirst}
                    </span>
                  ) : null}
                  <span style={{ display: "block", fontSize: 12, color: "#8a8681", marginTop: 3 }}>
                    {a.pillar} · {a.section} · {describe(a.counts)}
                  </span>

                  <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setOpen(open === a.heading ? null : a.heading)}
                      style={linkButton}
                    >
                      {open === a.heading ? "Hide the words" : "Read the words"}
                    </button>
                    {a.notes.length ? (
                      <span style={{ fontSize: 12, color: "#6b6864" }}>
                        {a.notes.length} note{a.notes.length === 1 ? "" : "s"} kept off the page
                      </span>
                    ) : null}
                  </div>

                  {open === a.heading ? (
                    <div style={reader}>
                      {a.body.map((b, j) => (
                        <p key={j} style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.5 }}>
                          {b.type !== "p" ? (
                            <span style={blockTag}>{BLOCK_NAMES[b.type] ?? b.type}</span>
                          ) : null}
                          <span style={{ whiteSpace: "pre-wrap" }}>{b.text}</span>
                        </p>
                      ))}
                      {a.notes.length ? (
                        <div style={{ borderTop: "1px solid rgba(30,32,32,0.14)", marginTop: 10, paddingTop: 8 }}>
                          <strong style={{ fontSize: 12 }}>Notes for you, not printed</strong>
                          <ul style={{ margin: "5px 0 0", paddingLeft: 18, fontSize: 12, color: "#6b6864" }}>
                            {a.notes.map((n, j) => (
                              <li key={j}>{n}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>

          {/* The action, at the bottom where the decision is actually made,
              and stuck to the foot of the screen so it is reachable from
              anywhere in a thirteen item list.

              Dewald, 2 August 2026: "I can see the check marks but there is
              no action, seems to be hidden." Two mistakes, and the second
              was the worse one. The button sat above the paste box while the
              ticking happens far below it. And when nothing was ticked I
              hid it completely rather than saying why, so an edition where
              everything had already been imported looked like a broken
              screen instead of a finished job. A disabled button that
              explains itself is never worse than no button. */}
          <div style={actionBar}>
            <button
              type="button"
              onClick={create}
              disabled={busy || toCreate === 0}
              style={{ ...primary, opacity: toCreate === 0 ? 0.5 : 1 }}
            >
              {busy
                ? "Creating"
                : toCreate === 0
                  ? "Nothing ticked"
                  : `Create ${toCreate} article${toCreate === 1 ? "" : "s"}`}
            </button>

            <span style={{ fontSize: 13, color: "#4a4744" }}>
              {toCreate > 0 ? (
                <>
                  {toCreate} of {preview.articles.length} ticked.
                  {alreadyIn > 0 ? ` ${alreadyIn} already in this edition.` : ""}
                </>
              ) : alreadyIn === preview.articles.length ? (
                "Every article in this pack is already in this edition. There is nothing left to import."
              ) : alreadyIn > 0 ? (
                `Nothing ticked. ${alreadyIn} of these are already in this edition and cannot be added twice.`
              ) : (
                "Nothing ticked. Tick the articles you want and this will create them."
              )}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const panel: CSSProperties = { padding: "10px 12px", fontSize: 14, margin: "14px 0 0" };

const card: CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
  borderLeft: "3px solid #c85a1e",
  padding: "10px 12px",
  marginBottom: 7,
};

const folio: CSSProperties = {
  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
  fontSize: 13,
  color: "#6b6864",
  minWidth: 54,
};

const primary: CSSProperties = {
  border: 0,
  background: "#c85a1e",
  color: "#fff",
  padding: "9px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const secondary: CSSProperties = {
  border: "1px solid rgba(30,32,32,0.25)",
  background: "#fff",
  padding: "9px 16px",
  fontSize: 14,
  cursor: "pointer",
};

const linkButton: CSSProperties = {
  border: 0,
  background: "none",
  padding: 0,
  fontSize: 12,
  color: "#c85a1e",
  fontWeight: 600,
  cursor: "pointer",
};

const reader: CSSProperties = {
  marginTop: 8,
  padding: "10px 12px",
  background: "#faf8f5",
  border: "1px solid rgba(30,32,32,0.1)",
  maxHeight: 340,
  overflowY: "auto",
};

const blockTag: CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#c85a1e",
  fontWeight: 700,
  marginRight: 7,
};

// Stuck to the foot of the screen while a preview is open, because the list
// it belongs to is longer than the window and a button you have to go and
// find is a button that looks missing.
const actionBar: CSSProperties = {
  position: "sticky",
  bottom: 0,
  display: "flex",
  gap: 14,
  alignItems: "center",
  flexWrap: "wrap",
  background: "#f2efea",
  borderTop: "1px solid rgba(30,32,32,0.16)",
  padding: "12px 2px",
  marginTop: 10,
};
