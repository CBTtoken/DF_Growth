"use client";

import { useActionState } from "react";
import Image from "next/image";
import {
  saveAgentPage,
  uploadAgentPhoto,
  removeAgentPhoto,
  setAgentPageStatus,
  type AgentPageFormState,
} from "@/app/admin/agents/page-actions";
import {
  AgentPageFields,
  Field,
  inputClass,
  buttonClass,
  secondaryButtonClass,
} from "@/components/agent-page/AgentPageFields";
import { resolveAgentTheme } from "@/lib/agent-page/themes";
import type { AgentPage } from "@/lib/agent-page/data";

// Agent Programme Phase 1 Sec 1.10, the admin view of an agent's page.
// Everything an agent can edit themselves comes from AgentPageFields, so
// the two views can never drift; this adds only what is admin-only, the
// web address, "active since", and publishing.

function Feedback({ state }: { state: AgentPageFormState }) {
  if (!state) return null;
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state.saved) return <p className="text-xs text-green-700">Saved.</p>;
  return null;
}

export function AgentPageForm({ agent }: { agent: AgentPage }) {
  const [saveState, saveAction, saving] = useActionState(saveAgentPage.bind(null, agent.id), null);
  const [photoState, photoAction, uploading] = useActionState(uploadAgentPhoto.bind(null, agent.id), null);
  const theme = resolveAgentTheme(agent.theme);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-ink">Agent page</h2>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                agent.status === "live" ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {agent.status === "live" ? "Live" : "Draft"}
            </span>
            <a
              href={`/admin/agents/${agent.id}/preview`}
              target="_blank"
              rel="noreferrer"
              className={secondaryButtonClass}
            >
              Preview
            </a>
            <form action={setAgentPageStatus.bind(null, agent.id, agent.status === "live" ? "draft" : "live")}>
              <button type="submit" className={buttonClass}>
                {agent.status === "live" ? "Take offline" : "Publish"}
              </button>
            </form>
          </div>
        </div>
        {agent.status !== "live" && (
          <p className="text-xs text-gray-500">
            A draft page is not reachable at its web address and returns a 404 to the public. Use Preview to see it.
          </p>
        )}
      </section>

      {/* Photo. Its own form because a file upload cannot ride along in
          the main save without re-posting the file on every text edit. */}
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold tracking-tight text-ink">Portrait</h2>
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-40 shrink-0">
            {agent.photoUrl ? (
              <div
                className="relative isolate aspect-[4/5] w-full overflow-hidden rounded-xl"
                style={{ backgroundColor: theme.duotoneHighlight }}
              >
                <Image
                  src={agent.photoUrl}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover object-top"
                  style={{ filter: "grayscale(1) contrast(1.08)", mixBlendMode: "multiply" }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ backgroundColor: theme.duotoneShadow, mixBlendMode: "lighten" }}
                />
              </div>
            ) : (
              <div
                className="flex aspect-[4/5] w-full items-center justify-center rounded-xl text-xs text-white/70"
                style={{ backgroundColor: theme.heroDeep }}
              >
                Monogram badge
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <p className="text-xs text-gray-500">
              This is exactly how the duotone will render on the page. With no photo the page falls back to the
              generated monogram badge, which is deliberate: no stock photos of strangers.
            </p>
            <form action={photoAction} className="flex flex-wrap items-center gap-3">
              <input type="file" name="photo" accept="image/*" className="text-xs text-gray-600" />
              <button type="submit" disabled={uploading} className={buttonClass}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </form>
            {agent.photoUrl && (
              <form action={removeAgentPhoto.bind(null, agent.id)}>
                <button type="submit" className={secondaryButtonClass}>
                  Remove photo
                </button>
              </form>
            )}
            <Feedback state={photoState} />
          </div>
        </div>
      </section>

      <form
        action={saveAction}
        className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold tracking-tight text-ink">Page details</h2>

        <Field label="Web address" hint="Lives at the root, e.g. growth.digitalflyersa.co.za/losaan. Admin only.">
          <input name="pageSlug" defaultValue={agent.slug} className={inputClass} required />
        </Field>

        <Field label="Active since" hint="Shows as a month and year in the credential strip. Admin only.">
          <input
            type="date"
            name="activeSince"
            defaultValue={agent.activeSince ? agent.activeSince.slice(0, 10) : ""}
            className={inputClass}
          />
        </Field>

        <AgentPageFields agent={agent} />

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className={buttonClass}>
            {saving ? "Saving..." : "Save page"}
          </button>
          <Feedback state={saveState} />
        </div>
      </form>

    </div>
  );
}
