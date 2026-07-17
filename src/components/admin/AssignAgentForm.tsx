"use client";

import { useActionState } from "react";
import { adminAssignAgent } from "@/app/admin/clients/[id]/actions";

const inputClass =
  "h-10 min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

// For a client who came in some other way than clicking a referral link or
// typing an agent's name at signup (most obviously: admin-created clients,
// src/app/admin/clients/new) — lets admin credit the agent who actually
// brought them in, after the fact. See adminAssignAgent's own comment for
// why setting this any time before the client's first payment is enough
// for the existing commission webhook to pick it up correctly.
export function AssignAgentForm({
  clientId,
  agents,
  currentAgentId,
}: {
  clientId: string;
  agents: { id: string; full_name: string }[];
  currentAgentId: string | null;
}) {
  const [state, action, pending] = useActionState(adminAssignAgent, null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-500">Referring agent</label>
        <select name="agentId" defaultValue={currentAgentId ?? ""} className={inputClass}>
          <option value="">None</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-green-700">Saved.</p>}
    </form>
  );
}
