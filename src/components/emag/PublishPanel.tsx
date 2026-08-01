"use client";

import { useState, useTransition } from "react";

// Publishing, unpublishing, and the PDF switch.
//
// The wording here matters more than usual. The PDF switch is a
// convenience, not a lock, and saying otherwise would be a promise the
// software cannot keep: anything a browser can display can be captured.

export function PublishPanel({
  editionId,
  status,
  pdfEnabled,
  readUrl,
  problems,
  onPublish,
  onUnpublish,
  onSetPdf,
}: {
  editionId: string;
  status: string;
  pdfEnabled: boolean;
  readUrl: string;
  problems: string[];
  onPublish: (id: string) => Promise<void>;
  onUnpublish: (id: string) => Promise<void>;
  onSetPdf: (id: string, enabled: boolean) => Promise<void>;
}) {
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState(pdfEnabled);
  const published = status === "published";

  function run(work: () => Promise<void>) {
    setError(null);
    startBusy(async () => {
      try {
        await work();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div style={panel}>
      {error ? <p style={{ ...notice, background: "#fdeaea", color: "#8a1f1f" }}>{error}</p> : null}

      {problems.length && !published ? (
        <div style={{ ...notice, background: "#fdf5e6", color: "#7a5312" }}>
          <strong>Not ready yet</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {published ? (
          <>
            <a href={readUrl} target="_blank" rel="noreferrer" style={primary}>
              Open the published edition
            </a>
            <button type="button" disabled={busy} onClick={() => run(() => onUnpublish(editionId))} style={secondary}>
              Take it down
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy || problems.length > 0}
            onClick={() => run(() => onPublish(editionId))}
            style={{ ...primary, opacity: problems.length ? 0.5 : 1 }}
          >
            {busy ? "Publishing" : "Publish"}
          </button>
        )}

        <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={pdf}
            disabled={busy}
            onChange={(e) => {
              setPdf(e.target.checked);
              run(() => onSetPdf(editionId, e.target.checked));
            }}
          />
          Offer a PDF download
        </label>
      </div>

      {published ? (
        <p style={{ fontSize: 13, color: "#6b6864", margin: "12px 0 0", lineHeight: 1.55 }}>
          Live at <code style={{ fontSize: 12.5 }}>{readUrl}</code>. Anyone with the link can
          read it: there is no subscription check in front of it yet.
        </p>
      ) : null}

      <p style={{ fontSize: 12.5, color: "#7a7671", margin: "10px 0 0", lineHeight: 1.55 }}>
        The PDF switch decides whether a download link is offered. It is a convenience, not a
        lock. Anything a browser can show can be captured, so it does not stop anyone passing
        the edition on.
      </p>
    </div>
  );
}

const panel = {
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
  borderLeft: "3px solid #c85a1e",
  padding: "16px 18px",
  marginBottom: 18,
};

const primary = {
  border: 0,
  background: "#c85a1e",
  color: "#fff",
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
};

const secondary = {
  border: "1px solid rgba(30,32,32,0.3)",
  background: "#fff",
  padding: "10px 16px",
  fontSize: 14,
  cursor: "pointer",
};

const notice = { margin: "0 0 12px", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.5 };
