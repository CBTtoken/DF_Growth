"use client";

import { useActionState, useState, useTransition } from "react";
import { Scissors, Undo2 } from "lucide-react";
import { acceptTriage, sortItems, type SortState } from "@/app/desk/(app)/actions";
import { card, quietButton } from "@/components/desk/Shell";
import type { TriagePart, TriageProposal } from "@/lib/desk/triage";

// Sort. Proposes fields for untriaged items, and where one capture is really
// several things, proposes the split too.
//
// Nothing here is saved until Accept. Every proposed title is already checked
// against the original text on the server, so a split can only ever be made
// of spans the operator typed himself. What this screen adds is the way back:
// one tap on Merge puts a split proposal back together, because splitting is
// a judgement call and being wrong about it must cost nothing.
const small =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900";

type EditableProposal = TriageProposal & { merged: boolean };

export function SortPanel() {
  const [sortState, runSort, sorting] = useActionState<SortState, FormData>(sortItems, null);
  const [rows, setRows] = useState<EditableProposal[] | null>(null);
  const [result, setResult] = useState<{ accepted: number; created: number } | null>(null);
  const [accepting, startAccept] = useTransition();

  // Adopt a fresh batch when one arrives.
  const [seen, setSeen] = useState<TriageProposal[] | null>(null);
  if (sortState?.proposals && sortState.proposals !== seen) {
    setSeen(sortState.proposals);
    setRows(sortState.proposals.map((p) => ({ ...p, merged: false })));
    setResult(null);
  }

  function editPart(rowIndex: number, partIndex: number, patch: Partial<TriagePart>) {
    setRows((current) =>
      current!.map((row, i) =>
        i !== rowIndex
          ? row
          : { ...row, parts: row.parts.map((part, j) => (j === partIndex ? { ...part, ...patch } : part)) }
      )
    );
  }

  function toggleMerge(rowIndex: number) {
    setRows((current) =>
      current!.map((row, i) => (i === rowIndex ? { ...row, merged: !row.merged } : row))
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={runSort}>
        <button type="submit" disabled={sorting} className={`${quietButton} w-full py-3`}>
          {sorting ? "Sorting..." : "Sort what has no next action"}
        </button>
      </form>

      {sortState?.error ? <p className="text-sm text-red-600">{sortState.error}</p> : null}
      {result ? (
        <p className="text-sm text-neutral-500">
          {result.accepted} filled in
          {result.created > 0 ? `, ${result.created} split off into their own items` : ""}.
        </p>
      ) : null}

      {rows && rows.length > 0 && !result ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">
            {rows.length} proposed. Edit anything, then accept. Clear a next action to leave that item
            alone.
          </p>

          {rows.map((row, rowIndex) => {
            const split = row.parts.length > 1 && !row.merged;

            return (
              <div key={row.id} className={`${card} flex flex-col gap-3`}>
                {row.parts.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => toggleMerge(rowIndex)}
                    className="flex items-center gap-1.5 self-start rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
                  >
                    {row.merged ? <Scissors size={13} /> : <Undo2 size={13} />}
                    {row.merged ? `Split into ${row.parts.length} again` : "Merge back into one"}
                  </button>
                ) : null}

                {split ? (
                  row.parts.map((part, partIndex) => (
                    <PartFields
                      key={partIndex}
                      part={part}
                      onChange={(patch) => editPart(rowIndex, partIndex, patch)}
                    />
                  ))
                ) : (
                  <PartFields
                    part={{ ...row.parts[0], title: row.originalTitle }}
                    onChange={(patch) => editPart(rowIndex, 0, patch)}
                  />
                )}
              </div>
            );
          })}

          <button
            type="button"
            disabled={accepting}
            onClick={() => {
              const payload = rows.map((row) => ({
                id: row.id,
                parts: (row.merged ? [{ ...row.parts[0], title: row.originalTitle }] : row.parts).map(
                  (part) => ({
                    title: part.title,
                    area: part.area,
                    stream: part.stream,
                    venture: part.venture ?? "",
                    effort: part.effort,
                    next_action: part.next_action,
                  })
                ),
              }));

              startAccept(async () => {
                const outcome = await acceptTriage(payload);
                setResult(outcome);
              });
            }}
            className="rounded-2xl bg-neutral-900 px-4 py-4 text-base font-semibold text-white disabled:opacity-50"
          >
            {accepting ? "Saving..." : "Accept all"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PartFields({
  part,
  onChange,
}: {
  part: TriagePart;
  onChange: (patch: Partial<TriagePart>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-l-2 border-neutral-200 pl-3">
      {/* The title is shown, never edited here. It is his own words and Sort
          is not allowed to touch them. */}
      <p className="text-sm font-medium text-neutral-900 whitespace-pre-line">{part.title}</p>

      <input
        value={part.next_action}
        onChange={(e) => onChange({ next_action: e.target.value })}
        spellCheck={false}
        placeholder="Next physical step"
        className={small}
      />

      <div className="flex gap-2">
        <input
          value={part.venture ?? ""}
          onChange={(e) => onChange({ venture: e.target.value })}
          spellCheck={false}
          placeholder="Venture"
          className={small}
        />
        <select
          value={part.stream}
          onChange={(e) => onChange({ stream: e.target.value as TriagePart["stream"] })}
          className={small}
        >
          <option value="own">mine</option>
          <option value="client">client</option>
          <option value="life">life</option>
        </select>
        <select
          value={part.effort}
          onChange={(e) => onChange({ effort: e.target.value as TriagePart["effort"] })}
          className={small}
        >
          <option value="shallow">tired</option>
          <option value="deep">clear head</option>
        </select>
      </div>
    </div>
  );
}
