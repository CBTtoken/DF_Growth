"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addLabel,
  removeLabel,
  setOutcome,
  reopenConversation,
  saveJobFields,
} from "@/app/admin/whatsapp/actions";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

// The facts about a conversation: door 1's structured fields, labels, and
// the outcome. Outcome sits behind a disclosure because it is the rare
// action with a real consequence — it starts the retention clock — and the
// screen says exactly that next to the buttons.
const OUTCOMES = [
  { id: "converted", label: "Converted" },
  { id: "unmatched", label: "Unmatched" },
  { id: "declined", label: "Declined" },
  { id: "resolved", label: "Resolved" },
];

export function ThreadDetails({
  conversationId,
  door,
  trade,
  suburb,
  urgency,
  labels,
  outcome,
  outcomeAt,
  retentionHours,
}: {
  conversationId: string;
  door: string | null;
  trade: string | null;
  suburb: string | null;
  urgency: string | null;
  labels: string[];
  outcome: string | null;
  outcomeAt: string | null;
  retentionHours: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);

  const run = (action: () => Promise<unknown>) =>
    startTransition(async () => {
      await action();
      router.refresh();
    });

  const deleteAt = outcomeAt
    ? new Date(new Date(outcomeAt).getTime() + retentionHours * 60 * 60 * 1000)
    : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      {door === "job" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Job request</p>
            <button
              type="button"
              className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
              onClick={() => setFieldsOpen((open) => !open)}
            >
              {fieldsOpen ? "Close" : "Edit"}
            </button>
          </div>
          {fieldsOpen ? (
            <form
              action={(formData) => {
                setFieldsOpen(false);
                run(() => saveJobFields(conversationId, formData));
              }}
              className="flex flex-col gap-2"
            >
              {[
                { name: "trade", label: "What work", value: trade },
                { name: "suburb", label: "Where", value: suburb },
                { name: "urgency", label: "How soon", value: urgency },
              ].map((f) => (
                <label key={f.name} className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
                  {f.label}
                  <input
                    name={f.name}
                    defaultValue={f.value ?? ""}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal text-gray-900 outline-none focus:border-brand"
                  />
                </label>
              ))}
              <div>
                <Button type="submit" size="sm" disabled={isPending}>
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-800">
              <span>
                <span className="text-gray-400">What: </span>
                {trade ?? "not answered"}
              </span>
              <span>
                <span className="text-gray-400">Where: </span>
                {suburb ?? "not answered"}
              </span>
              <span>
                <span className="text-gray-400">How soon: </span>
                {urgency ?? "not answered"}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {labels.map((label) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
            {label}
            <button
              type="button"
              aria-label={`Remove label ${label}`}
              disabled={isPending}
              onClick={() => run(() => removeLabel(conversationId, label))}
              className="text-gray-400 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newLabel.trim()) return;
            const value = newLabel;
            setNewLabel("");
            run(() => addLabel(conversationId, value));
          }}
          className="inline-flex"
        >
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Add label"
            className="w-24 rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs outline-none focus:border-brand"
          />
        </form>
      </div>

      {outcome ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusPill tone="success">{outcome}</StatusPill>
          {deleteAt && (
            <span className="text-xs text-gray-500">
              This conversation deletes itself around {deleteAt.toLocaleString()}. The job facts survive without the
              person.
            </span>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => reopenConversation(conversationId))}
            className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
          >
            Reopen
          </button>
        </div>
      ) : outcomeOpen ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">
            Marking an outcome finishes the conversation and starts the cleanup timer: the whole thread, name and
            number included, is deleted automatically about {retentionHours} hours later.
          </p>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <Button
                key={o.id}
                type="button"
                variant="secondary"
                size="sm"
                className="bg-white"
                disabled={isPending}
                onClick={() => {
                  setOutcomeOpen(false);
                  run(() => setOutcome(conversationId, o.id));
                }}
              >
                {o.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="bg-white text-gray-400"
              onClick={() => setOutcomeOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setOutcomeOpen(true)}
            className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
          >
            Mark outcome
          </button>
        </div>
      )}
    </div>
  );
}
