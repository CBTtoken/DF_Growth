"use client";

import { useActionState } from "react";
import { saveMyAgentPage } from "@/app/dashboard/role-actions";
import { AgentPageFields, buttonClass } from "@/components/agent-page/AgentPageFields";
import type { AgentPage } from "@/lib/agent-page/data";

// Agent page v3. The agent editing their own page, from their own
// dashboard.
//
// Dewald's call, moved forward out of phase 2: an agent must never be
// forced to hand over personal answers to get a page, and must be able to
// fill something in later themselves rather than mailing changes in
// forever. So the boxes sit here empty until they want them, and their
// page is already complete without any of it.
export function MyAgentPageForm({ agent }: { agent: AgentPage }) {
  const [state, action, saving] = useActionState(saveMyAgentPage, null);

  return (
    <form action={action} className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Your page</h2>
        <p className="mt-1 text-sm text-gray-500">
          Change any of this whenever you like. Anything you leave empty is simply not shown, and your page still
          reads as finished.
        </p>
      </div>

      <AgentPageFields agent={agent} />

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className={buttonClass}>
          {saving ? "Saving..." : "Save my page"}
        </button>
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state?.saved && <p className="text-xs text-green-700">Saved. Your page is updated.</p>}
      </div>
    </form>
  );
}
