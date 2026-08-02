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
  onImport: (editionId: string, source: string) => Promise<{ created: number; skipped: number }>;
}) {
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function read() {
    setError(null);
    setDone(null);
    start(async () => {
      try {
        setPreview(await onPreview(editionId, source));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that pack.");
      }
    });
  }

  function create() {
    setError(null);
    start(async () => {
      try {
        const result = await onImport(editionId, source);
        setDone(result);
        setPreview(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create the articles.");
      }
    });
  }

  const toCreate = preview?.articles.filter((a) => !a.exists).length ?? 0;

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
        {preview && toCreate > 0 ? (
          <button type="button" onClick={create} disabled={busy} style={primary}>
            {busy ? "Creating" : `Create ${toCreate} article${toCreate === 1 ? "" : "s"}`}
          </button>
        ) : null}
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
                <span style={folio}>{a.pageRange}</span>
                <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>
                    {a.heading}
                    {a.exists ? (
                      <span style={{ fontWeight: 400, color: "#6b6864" }}> · already in this edition, will be skipped</span>
                    ) : null}
                  </span>
                  <span style={{ display: "block", fontSize: 13, color: "#6b6864", marginTop: 2 }}>
                    {a.headline || "No headline in the pack"}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "#8a8681", marginTop: 3 }}>
                    {a.pillar} · {a.section} · {describe(a.counts)}
                  </span>
                  {a.notes.length ? (
                    <details style={{ marginTop: 5 }}>
                      <summary style={{ fontSize: 12, color: "#c85a1e", cursor: "pointer" }}>
                        {a.notes.length} layout note{a.notes.length === 1 ? "" : "s"} for you, kept off the page
                      </summary>
                      <ul style={{ margin: "5px 0 0", paddingLeft: 18, fontSize: 12, color: "#6b6864" }}>
                        {a.notes.map((n, j) => (
                          <li key={j}>{n}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
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
