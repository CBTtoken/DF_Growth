"use client";

import { useState, useTransition } from "react";
import type { PlannedBlock, Problem } from "@/lib/emag/flatplan";

// The flatplan, as one screen showing every block in running order.
//
// Page numbers on the left are not stored anywhere. They are recomputed in
// the browser the moment two blocks swap, so the numbering a publisher sees
// while dragging is the numbering they will get, and then the same
// calculation runs again on the server when it saves. Showing one number
// and saving another would undermine the whole point of the screen.

/** A block with the words the screen shows for it, worked out on the server. */
export type Row = PlannedBlock & { label: string; detail: string };

type Props = {
  editionId: string;
  blocks: Row[];
  problems: Problem[];
  canEdit: boolean;
  onSave: (editionId: string, orderedIds: string[]) => Promise<void>;
  /**
   * Takes a block out of this edition's running order.
   *
   * Dewald, 2 August 2026: "there is no way to remove or delete or mark what
   * should not go in this edition". There was not. The server action had
   * existed since the flatplan was built and nothing on the screen ever
   * called it, so an article dragged into an edition was in it for good.
   *
   * Worth being exact about what this does, because the wording on the
   * button is the only thing standing between a publisher and a bad
   * assumption: it removes the block from THIS edition. The article, its
   * pictures and its approved page breaks are untouched and can be put
   * straight back, or held for next month, which is usually the actual
   * intention.
   */
  onRemove: (editionId: string, blockId: string) => Promise<void>;
};

/**
 * Renumbers a running order in the browser.
 *
 * Deliberately the same rule as the server's planPages, including the
 * quarter-page pairing, because a preview that renumbers differently from
 * the save is worse than no preview.
 */
function renumber(rows: Row[]): Row[] {
  let page = 1;
  let openQuarter: number | null = null;

  return rows.map((row) => {
    const isQuarter = row.kind === "ad" && row.ad?.format === "quarter";

    if (isQuarter && openQuarter !== null) {
      const at = openQuarter;
      openQuarter = null;
      return { ...row, firstPage: at, lastPage: at };
    }

    // Same rule as the server: an approved article's real count wins,
    // an unwritten one uses the extent planned for it.
    const planned =
      row.kind === "article" && row.article && row.article.pageCount > 0
        ? row.article.pageCount
        : row.pages;
    const extent = Math.max(1, planned);
    const firstPage = page;
    const lastPage = page + extent - 1;
    page = lastPage + 1;
    if (isQuarter) openQuarter = firstPage;

    return { ...row, firstPage, lastPage };
  });
}

export function FlatplanBoard({
  editionId,
  blocks,
  problems,
  canEdit,
  onSave,
  onRemove,
}: Props) {
  const [rows, setRows] = useState<Row[]>(() => renumber(blocks));
  const [dragging, setDragging] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Which row is asking "are you sure". Held per row rather than as one
  // dialog, so the confirmation appears on the thing being removed and it
  // is impossible to confirm the wrong one.
  const [confirming, setConfirming] = useState<string | null>(null);

  function remove(row: Row) {
    setError(null);
    setConfirming(null);
    startSaving(async () => {
      try {
        await onRemove(editionId, row.id);
        // Dropped from the local list too, rather than waiting for the
        // server round trip, so the page numbers below it renumber at once.
        setRows((current) => renumber(current.filter((r) => r.id !== row.id)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not take that out of the edition.");
      }
    });
  }

  function move(fromId: string, toId: string) {
    if (fromId === toId) return;
    setRows((current) => {
      const from = current.findIndex((r) => r.id === fromId);
      const to = current.findIndex((r) => r.id === toId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return renumber(next);
    });
    setDirty(true);
  }

  // Keyboard equivalent of the drag. A flatplan is a list of a few dozen
  // things and dragging one of them thirty places is miserable, so up and
  // down do the same job one step at a time.
  function nudge(id: string, direction: -1 | 1) {
    setRows((current) => {
      const i = current.findIndex((r) => r.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= current.length) return current;
      const next = [...current];
      [next[i], next[j]] = [next[j], next[i]];
      return renumber(next);
    });
    setDirty(true);
  }

  function save() {
    setError(null);
    startSaving(async () => {
      try {
        await onSave(
          editionId,
          rows.map((r) => r.id)
        );
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save the running order.");
      }
    });
  }

  const totalPages = rows.length ? rows[rows.length - 1].lastPage : 0;
  const blocking = problems.filter((p) => p.severity === "blocking");
  const warnings = problems.filter((p) => p.severity === "warning");

  return (
    <div>
      <div style={bar}>
        <div>
          <strong style={{ fontSize: 22 }}>{totalPages}</strong>
          <span style={{ color: "#5a5754", marginLeft: 8 }}>
            pages{dirty ? ", not saved yet" : ""}
          </span>
        </div>
        {canEdit ? (
          <button type="button" onClick={save} disabled={!dirty || saving} style={saveButton(dirty)}>
            {saving ? "Saving" : "Save running order"}
          </button>
        ) : null}
      </div>

      {error ? <p style={{ ...note, background: "#fdeaea", color: "#8a1f1f" }}>{error}</p> : null}

      {blocking.length ? (
        <div style={{ ...note, background: "#fdeaea", color: "#8a1f1f" }}>
          <strong>Not ready to publish</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {blocking.map((p, i) => (
              <li key={i}>{p.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length ? (
        <div style={{ ...note, background: "#fdf5e6", color: "#7a5312" }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {warnings.map((p, i) => (
              <li key={i}>{p.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ol style={{ listStyle: "none", margin: "18px 0 0", padding: 0 }}>
        {rows.map((row, i) => {
          const pad = (n: number) => String(n).padStart(2, "0");
          const span =
            row.firstPage === row.lastPage
              ? pad(row.firstPage)
              : `${pad(row.firstPage)} to ${pad(row.lastPage)}`;

          return (
            <li
              key={row.id}
              draggable={canEdit}
              onDragStart={() => setDragging(row.id)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragging && move(dragging, row.id)}
              style={{
                ...card,
                borderLeftColor: kindColour(row),
                opacity: dragging === row.id ? 0.45 : 1,
                cursor: canEdit ? "grab" : "default",
              }}
            >
              <span style={folio}>{span}</span>

              <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{row.label}</span>
                <span style={{ display: "block", fontSize: 13, color: "#6b6864", marginTop: 2 }}>
                  {row.detail}
                </span>
              </span>

              <span style={extent}>
                {row.lastPage - row.firstPage + 1}{" "}
                {row.lastPage - row.firstPage === 0 ? "page" : "pages"}
              </span>

              {canEdit ? (
                <span style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => nudge(row.id, -1)}
                    disabled={i === 0}
                    style={nudgeButton}
                    aria-label={`Move ${row.label} earlier`}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => nudge(row.id, 1)}
                    disabled={i === rows.length - 1}
                    style={nudgeButton}
                    aria-label={`Move ${row.label} later`}
                  >
                    Down
                  </button>

                  {/* Two taps, because the first one is easy to hit while
                      dragging. The confirmation says where the work goes
                      rather than asking "are you sure", which tells a
                      publisher nothing they did not already know. */}
                  {confirming === row.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        disabled={saving}
                        style={confirmButton}
                      >
                        Take out, keep the work
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        style={nudgeButton}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(row.id)}
                      style={nudgeButton}
                      aria-label={`Take ${row.label} out of this edition`}
                    >
                      Take out
                    </button>
                  )}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {rows.length === 0 ? (
        <p style={{ color: "#6b6864", fontSize: 15 }}>
          Nothing in the running order yet. Add the cover and the contents page, then approve
          an article and it will appear here.
        </p>
      ) : null}
    </div>
  );
}

// Colour coding for planning, from the reference: editorial in charcoal,
// advertising in orange, Smart Value Club in teal.
function kindColour(row: Row) {
  if (row.kind === "ad") return "#c85a1e";
  if (row.article?.pillar === "savings") return "#0b6e6e";
  return "#1e2020";
}

const bar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "12px 16px",
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
};

const note = { margin: "12px 0 0", padding: "10px 14px", fontSize: 14, lineHeight: 1.5 };

const card = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
  borderLeft: "4px solid #1e2020",
  padding: "12px 16px",
  marginBottom: 6,
};

const folio = {
  flex: "0 0 auto",
  minWidth: 52,
  fontFamily: "var(--font-barlow-condensed), sans-serif",
  fontWeight: 700,
  fontSize: 20,
  color: "#c85a1e",
};

const extent = { flex: "0 0 auto", fontSize: 13, color: "#6b6864", whiteSpace: "nowrap" as const };

const nudgeButton = {
  border: "1px solid rgba(30,32,32,0.2)",
  background: "#fff",
  padding: "4px 9px",
  fontSize: 12,
  cursor: "pointer",
};

// Orange rather than red. Taking a block out of an edition is a planning
// decision, not a deletion, and dressing it as a danger would misrepresent
// what the button does.
const confirmButton = {
  border: 0,
  background: "#c85a1e",
  color: "#fff",
  padding: "4px 9px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

function saveButton(dirty: boolean) {
  return {
    border: 0,
    background: dirty ? "#c85a1e" : "rgba(30,32,32,0.15)",
    color: dirty ? "#fff" : "#6b6864",
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: dirty ? "pointer" : "default",
  };
}
