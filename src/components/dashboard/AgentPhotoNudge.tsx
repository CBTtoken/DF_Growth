"use client";

import { useActionState } from "react";
import { uploadMyAgentPhoto } from "@/app/dashboard/role-actions";

// Agent Programme Phase 1 Sec 1.5: "Show a single, non-nagging prompt in
// the dashboard noting that a real photo performs better, with a direct
// link to upload."
//
// Non-nagging is the actual requirement, so: it renders only when there is
// genuinely no photo, it says the true thing once, and it disappears
// permanently the moment one is uploaded. No dismiss button, because there
// is nothing to dismiss once it has done its job, and no repeat prompt to
// re-show later.
export function AgentPhotoNudge() {
  const [state, action, pending] = useActionState(uploadMyAgentPhoto, null);

  if (state?.saved) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div>
        <h3 className="text-sm font-bold text-amber-900">Your page is using a monogram badge</h3>
        <p className="mt-1 text-sm text-amber-800">
          It looks deliberate, not broken, so there is no rush. A real photo of you does perform better on a page
          that is asking someone to trust you.
        </p>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="file" name="photo" accept="image/*" className="text-xs text-amber-900" />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-full bg-amber-900 px-4 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
        >
          {pending ? "Uploading..." : "Upload a photo"}
        </button>
        {state?.error && <span className="text-xs text-red-700">{state.error}</span>}
      </form>
    </div>
  );
}
