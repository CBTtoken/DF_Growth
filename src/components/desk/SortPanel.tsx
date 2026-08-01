"use client";

import { useActionState } from "react";
import { acceptTriage, sortItems, type SortState } from "@/app/desk/(app)/actions";

// Sort. Proposes four fields per untriaged item in one batched call, shows
// them as an editable list, and writes nothing until Accept.
//
// The title is displayed from the row the proposal was matched to, not from
// anything the model returned, and there is no field to edit it here. It
// stays exactly as it was typed.
const field =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900";

export function SortPanel() {
  const [sortState, runSort, sorting] = useActionState<SortState, FormData>(sortItems, null);
  const [acceptState, runAccept, accepting] = useActionState(acceptTriage, null);

  const proposals = acceptState?.accepted ? [] : (sortState?.proposals ?? []);

  return (
    <div className="flex flex-col gap-4">
      <form action={runSort}>
        <button
          type="submit"
          disabled={sorting}
          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 disabled:opacity-50"
        >
          {sorting ? "Sorting..." : "Sort what has no next action"}
        </button>
      </form>

      {sortState?.error ? <p className="text-sm text-red-600">{sortState.error}</p> : null}
      {acceptState?.accepted ? (
        <p className="text-sm text-neutral-500">
          {acceptState.accepted === 1 ? "1 item filled in." : `${acceptState.accepted} items filled in.`}
        </p>
      ) : null}

      {proposals.length > 0 ? (
        <form action={runAccept} className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">
            {proposals.length} proposed. Edit anything, then accept. Clear a next action to leave that
            item alone.
          </p>

          {proposals.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
              <input type="hidden" name="id" value={p.id} />
              <p className="text-sm font-medium">{p.title}</p>

              <input
                name={`next_action:${p.id}`}
                defaultValue={p.next_action}
                spellCheck={false}
                placeholder="Next physical step"
                className={field}
              />

              <div className="flex gap-2">
                <input
                  name={`venture:${p.id}`}
                  defaultValue={p.venture ?? ""}
                  spellCheck={false}
                  placeholder="Venture"
                  className={field}
                />
                <select name={`area:${p.id}`} defaultValue={p.area} className={field}>
                  <option value="business">business</option>
                  <option value="personal">personal</option>
                </select>
                <select name={`effort:${p.id}`} defaultValue={p.effort} className={field}>
                  <option value="shallow">shallow</option>
                  <option value="deep">deep</option>
                </select>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={accepting}
            className="rounded-2xl bg-neutral-900 px-4 py-4 text-base font-semibold text-white disabled:opacity-50"
          >
            {accepting ? "..." : "Accept all"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
