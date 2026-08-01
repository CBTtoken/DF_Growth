"use client";

import { useState, useTransition } from "react";

// Deleting an article.
//
// Two clicks, never one. There is no undo behind this: the article, its
// pictures and its place in the running order all go, and a writer's work
// is not something to lose to a mis-click on a small screen.
//
// The confirmation names the article rather than saying "are you sure",
// because on a list of eighteen slots called things like "The Big Idea, one"
// and "The Big Idea, two", the question that matters is which one.

export function DeleteArticleButton({
  articleId,
  editionId,
  title,
  onDelete,
}: {
  articleId: string;
  editionId: string;
  title: string;
  onDelete: (id: string, editionId: string) => Promise<void>;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} style={quiet}>
        Delete this article
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 13.5 }}>
        Delete <strong>{title}</strong> and everything in it?
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setError(null);
          startBusy(async () => {
            try {
              await onDelete(articleId, editionId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not delete it.");
            }
          });
        }}
        style={danger}
      >
        {busy ? "Deleting" : "Yes, delete it"}
      </button>
      <button type="button" onClick={() => setArmed(false)} style={quiet}>
        Keep it
      </button>
      {error ? <span style={{ fontSize: 13, color: "#8a1f1f" }}>{error}</span> : null}
    </div>
  );
}

const quiet = {
  border: "1px solid rgba(30,32,32,0.2)",
  background: "#fff",
  padding: "7px 12px",
  fontSize: 13,
  cursor: "pointer",
};

const danger = {
  border: 0,
  background: "#8a1f1f",
  color: "#fff",
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
