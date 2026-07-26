"use client";

import { useActionState } from "react";
import { saveMyAgentPage, draftMyAgentPageCopy } from "@/app/dashboard/role-actions";
import { AgentPageFields, buttonClass } from "@/components/agent-page/AgentPageFields";
import { AgentCopyDrafter, type AgentCopyIntake } from "@/components/agent-page/AgentCopyDrafter";
import type { AgentPage } from "@/lib/agent-page/data";

// Agent Programme Phase 1. The agent editing their own page, from their
// own dashboard.
//
// Dewald's call, moved forward out of phase 2: an agent who does not want
// to answer the copy questions still has to be able to fill a box in
// later, themselves. The boxes sit here empty until they do. Nothing is
// required and nothing blocks their page from existing, which is the whole
// point: the page renders fine with a name, a photo and a colour, and
// hides every section it has no copy for.
export function MyAgentPageForm({ agent, intake }: { agent: AgentPage; intake: AgentCopyIntake }) {
  const [state, action, saving] = useActionState(saveMyAgentPage, null);

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Your page</h2>
          <p className="mt-1 text-sm text-gray-500">
            Fill in as much or as little as you like, and change it whenever you want. Anything you leave empty
            simply does not appear on your page.
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

      <AgentCopyDrafter action={draftMyAgentPageCopy} intake={intake} />
    </div>
  );
}
