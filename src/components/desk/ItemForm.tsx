"use client";

import { useActionState } from "react";
import { saveItem } from "@/app/desk/(app)/actions";
import type { DeskItem } from "@/lib/desk/types";

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-900";
const label = "text-xs uppercase tracking-wide text-neutral-400";

export function ItemForm({ item }: { item: DeskItem }) {
  const [state, formAction, pending] = useActionState(saveItem, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="blocked_since" value={item.blocked_since ?? ""} />

      <label className="flex flex-col gap-1">
        <span className={label}>Title</span>
        <textarea name="title" defaultValue={item.title} rows={2} spellCheck={false} className={field} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>Next action</span>
        <textarea
          name="next_action"
          defaultValue={item.next_action ?? ""}
          rows={2}
          spellCheck={false}
          className={field}
        />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className={label}>Venture</span>
          <input name="venture" defaultValue={item.venture ?? ""} spellCheck={false} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Area</span>
          <select name="area" defaultValue={item.area} className={field}>
            <option value="business">business</option>
            <option value="personal">personal</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Effort</span>
          <select name="effort" defaultValue={item.effort} className={field}>
            <option value="shallow">shallow</option>
            <option value="deep">deep</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className={label}>Blocked by</span>
          <input
            name="blocked_by"
            defaultValue={item.blocked_by}
            spellCheck={false}
            className={field}
            placeholder="me, a name, or date"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Due</span>
          <input name="due_date" type="date" defaultValue={item.due_date ?? ""} className={field} />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={label}>Status</span>
        <select name="status" defaultValue={item.status} className={field}>
          <option value="open">open</option>
          <option value="done">done</option>
          <option value="parked">parked</option>
          <option value="killed">killed</option>
        </select>
      </label>

      {/* The one rule. An item leaves the list by being done, parked with a
          written trigger, or killed with a date.

          Always on screen rather than revealed when parked is chosen: the
          field has to be fillable in the same pass as the status, and a form
          that depends on JavaScript to show a required field is a form that
          can trap you with an error you cannot clear. */}
      <label className="flex flex-col gap-1">
        <span className={label}>Park trigger, required to park</span>
        <input
          name="park_trigger"
          defaultValue={item.park_trigger ?? ""}
          spellCheck={false}
          placeholder="What has to be true for this to come back"
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>Notes</span>
        <textarea name="notes" defaultValue={item.notes ?? ""} rows={3} spellCheck={false} className={field} />
      </label>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.saved ? <p className="text-sm text-neutral-500">Saved.</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-neutral-900 px-4 py-4 text-base font-semibold text-white disabled:opacity-50"
      >
        {pending ? "..." : "Save"}
      </button>
    </form>
  );
}
