"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAnswer,
  updateAnswer,
  deleteAnswer,
  moveAnswer,
  updateBotCopy,
  saveSettings,
  type AnswerFormResult,
} from "@/app/admin/whatsapp/answers/actions";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

// Client pieces of /admin/whatsapp/answers: a saved answer card that edits
// in place, the add form, a system copy row with its approve tick, and the
// retention settings form.

export type SavedAnswer = {
  id: string;
  group_slug: string;
  button_label: string;
  body: string;
  active: boolean;
};

export type BotCopyRowData = {
  slug: string;
  label: string;
  body: string;
  approved: boolean;
};

export const GROUP_OPTIONS = [
  { id: "member", label: "Member support (offered behind door 2)" },
  { id: "join", label: "Joining (door 3 follow-ups)" },
  { id: "job", label: "Job requests" },
  { id: "general", label: "General (only you see these)" },
];

const inputClasses =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand";

export function SavedAnswerCard({ answer, isFirst, isLast }: { answer: SavedAnswer; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Explicit transition rather than useActionState: the edit form must
  // close itself only on a successful save, and closing is a state change
  // that belongs in the action callback, not an effect.
  const handleSave = (formData: FormData) =>
    startTransition(async () => {
      const result = await updateAnswer(answer.id, null, formData);
      if (result && !result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setEditing(false);
      router.refresh();
    });

  const run = (action: () => Promise<unknown>) =>
    startTransition(async () => {
      await action();
      router.refresh();
    });

  const busy = isPending;

  if (!editing) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">{answer.button_label}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Move up"
              disabled={busy || isFirst}
              onClick={() => run(() => moveAnswer(answer.id, "up"))}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:border-brand disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={busy || isLast}
              onClick={() => run(() => moveAnswer(answer.id, "down"))}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:border-brand disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
            >
              Edit
            </button>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-gray-600">{answer.body}</p>
      </div>
    );
  }

  return (
    <form action={handleSave} className="flex flex-col gap-2 rounded-xl border border-brand/40 bg-white p-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        Button label (max 20 characters)
        <input name="button_label" defaultValue={answer.button_label} maxLength={20} required className={inputClasses} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        Full reply
        <textarea name="body" defaultValue={answer.body} rows={4} required className={inputClasses} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        Group
        <select name="group_slug" defaultValue={answer.group_slug} className={inputClasses}>
          {GROUP_OPTIONS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="secondary" size="sm" className="bg-white" disabled={busy} onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Delete the saved answer "${answer.button_label}"? It disappears from the door menus and the composer. There is no undo.`)) return;
            run(() => deleteAnswer(answer.id));
          }}
        >
          Delete
        </Button>
      </div>
    </form>
  );
}

export function NewAnswerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // On success the form clears for the next answer; on failure the typed
  // text stays exactly where it is.
  const handleCreate = (formData: FormData) =>
    startTransition(async () => {
      const result = await createAnswer(null, formData);
      if (result && !result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      formRef.current?.reset();
      router.refresh();
    });

  return (
    <form
      ref={formRef}
      action={handleCreate}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-3"
    >
      <p className="text-sm font-semibold text-gray-900">Add a saved answer</p>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        Button label (max 20 characters)
        <input name="button_label" maxLength={20} required placeholder="e.g. Reset my password" className={inputClasses} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        Full reply
        <textarea
          name="body"
          rows={4}
          required
          placeholder="The exact message that gets sent, written by you."
          className={inputClasses}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        Group
        <select name="group_slug" defaultValue="member" className={inputClasses}>
          {GROUP_OPTIONS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Add answer"}
        </Button>
      </div>
    </form>
  );
}

export function BotCopyRow({ row }: { row: BotCopyRowData }) {
  const [state, formAction, pending] = useActionState<AnswerFormResult, FormData>(
    updateBotCopy.bind(null, row.slug),
    null
  );
  const isButton = row.slug.includes("button");

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{row.label}</p>
        {row.approved ? <StatusPill tone="success">Approved</StatusPill> : <StatusPill tone="warning">Draft</StatusPill>}
      </div>
      <textarea
        name="body"
        defaultValue={row.body}
        rows={isButton ? 1 : 3}
        maxLength={isButton ? 20 : undefined}
        required
        className={inputClasses}
      />
      {isButton && <p className="text-xs text-gray-400">A button label, 20 characters at most.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <input type="checkbox" name="approved" defaultChecked={row.approved} className="h-4 w-4 accent-brand" />
          Approved to send
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        {state && !state.ok && <span className="text-xs text-red-600">{state.message}</span>}
        {state?.ok && <span className="text-xs text-green-700">Saved</span>}
      </div>
    </form>
  );
}

export function SettingsForm({
  retentionHours,
  autoResolveDays,
}: {
  retentionHours: number;
  autoResolveDays: number;
}) {
  const [state, formAction, pending] = useActionState<AnswerFormResult, FormData>(saveSettings, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        Hours a finished conversation is kept before it deletes itself
        <input
          type="number"
          name="retention_hours"
          defaultValue={retentionHours}
          min={1}
          inputMode="numeric"
          className={`${inputClasses} w-32`}
        />
      </label>
      <p className="text-xs text-amber-700">
        The 72 hour default is a build default, not legal advice. Set the final number once your attorney confirms
        it.
      </p>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        Days of silence before a conversation with no outcome finishes itself
        <input
          type="number"
          name="auto_resolve_days"
          defaultValue={autoResolveDays}
          min={1}
          inputMode="numeric"
          className={`${inputClasses} w-32`}
        />
      </label>
      {state && !state.ok && <p className="text-xs text-red-600">{state.message}</p>}
      {state?.ok && <p className="text-xs text-green-700">Saved</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
