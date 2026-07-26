"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import {
  saveAgentPage,
  draftAgentPageCopy,
  uploadAgentPhoto,
  removeAgentPhoto,
  setAgentPageStatus,
  type AgentPageFormState,
} from "@/app/admin/agents/page-actions";
import { CURATED_ACCENTS, buildAgentPalette } from "@/lib/agent-page/palette";
import type { AgentPage } from "@/lib/agent-page/data";

// Agent Programme Phase 1 Sec 1.10, the admin-managed half of the agent
// page. Deliberately one long form rather than a wizard: this is an
// operator tool used a handful of times, and every field being visible at
// once is worth more here than a guided flow.

const inputClass =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const textareaClass =
  "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass =
  "inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-full border border-gray-200 px-5 text-xs font-semibold text-gray-700 transition hover:border-gray-400 disabled:opacity-50";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Feedback({ state }: { state: AgentPageFormState }) {
  if (!state) return null;
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state.saved) return <p className="text-xs text-green-700">Saved.</p>;
  return null;
}

export function AgentPageForm({
  agent,
  intake,
}: {
  agent: AgentPage;
  intake: { before: string; why: string; who: string; area: string };
}) {
  const [saveState, saveAction, saving] = useActionState(saveAgentPage.bind(null, agent.id), null);
  const [draftState, draftAction, drafting] = useActionState(draftAgentPageCopy.bind(null, agent.id), null);
  const [photoState, photoAction, uploading] = useActionState(uploadAgentPhoto.bind(null, agent.id), null);

  // Live in the form so the swatch and the derived hero colour update as
  // the colour is picked, which is the only way to see what the contrast
  // floor actually did to a pale choice before saving it.
  const [accent, setAccent] = useState(agent.accentColor);
  const palette = buildAgentPalette(accent);

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
            <a href={`/admin/agents/${agent.id}/preview`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
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
                style={{ backgroundColor: palette.duotoneHighlight }}
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
                  style={{ backgroundColor: palette.duotoneShadow, mixBlendMode: "lighten" }}
                />
              </div>
            ) : (
              <div
                className="flex aspect-[4/5] w-full items-center justify-center rounded-xl text-xs text-white/70"
                style={{ backgroundColor: palette.heroDeep }}
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

      {/* Sec 1.6: four questions in, drafted copy out. Placed above the
          copy fields it writes into, so the order on screen matches the
          order of the job. */}
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold tracking-tight text-ink">Draft the copy from their answers</h2>
        <p className="text-xs text-gray-500">
          Answer these in the agent&apos;s own words. Drafting overwrites the promise, story and offer fields below,
          which stay editable afterwards.
        </p>
        <form action={draftAction} className="flex flex-col gap-4">
          <Field label="What did they do before this?">
            <textarea name="before" rows={2} defaultValue={intake.before} className={textareaClass} />
          </Field>
          <Field label="Why did they join?">
            <textarea name="why" rows={2} defaultValue={intake.why} className={textareaClass} />
          </Field>
          <Field label="Who do they most want to help?">
            <textarea name="who" rows={2} defaultValue={intake.who} className={textareaClass} />
          </Field>
          <Field label="What area do they cover?">
            <textarea name="area" rows={2} defaultValue={intake.area} className={textareaClass} />
          </Field>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={drafting} className={buttonClass}>
              {drafting ? "Drafting..." : "Draft the copy"}
            </button>
            <Feedback state={draftState} />
          </div>
        </form>
      </section>

      <form action={saveAction} className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold tracking-tight text-ink">Page details</h2>

        <Field label="Web address" hint="Lives at the root, e.g. growth.digitalflyersa.co.za/losaan">
          <input name="pageSlug" defaultValue={agent.slug} className={inputClass} required />
        </Field>

        <Field label="Town">
          <input name="town" defaultValue={agent.town ?? ""} className={inputClass} />
        </Field>

        <Field label="WhatsApp number" hint="Leave blank to hide the WhatsApp button entirely.">
          <input name="whatsappNumber" defaultValue={agent.whatsappNumber ?? ""} className={inputClass} />
        </Field>

        <Field label="Active since" hint="Shows as a month and year in the credential strip.">
          <input
            type="date"
            name="activeSince"
            defaultValue={agent.activeSince ? agent.activeSince.slice(0, 10) : ""}
            className={inputClass}
          />
        </Field>

        {/* Sec 1.4: curated set plus a custom picker, with the derived
            colours shown, since the contrast floor can move a pale pick a
            long way from what was clicked. */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-gray-700">Accent colour</label>
          <input type="hidden" name="accentColor" value={accent} />
          <div className="flex flex-wrap gap-2">
            {CURATED_ACCENTS.map((option) => (
              <button
                key={option.hex}
                type="button"
                onClick={() => setAccent(option.hex)}
                title={option.name}
                aria-label={option.name}
                className={`h-9 w-9 rounded-full transition ${
                  accent.toLowerCase() === option.hex ? "ring-2 ring-brand ring-offset-2" : ""
                }`}
                style={{ backgroundColor: option.hex }}
              />
            ))}
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-full border border-gray-200 bg-white p-0.5"
              aria-label="Custom colour"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wide">
            <span className="rounded px-2 py-1 text-white" style={{ backgroundColor: palette.heroBg }}>
              Hero field
            </span>
            <span className="rounded px-2 py-1" style={{ backgroundColor: palette.tint, color: palette.accentOnLight }}>
              Accent on light
            </span>
            <span className="rounded px-2 py-1" style={{ backgroundColor: "#0b1220", color: palette.accentOnDark }}>
              Accent on dark
            </span>
            <span className="text-gray-400 normal-case tracking-normal">
              Derived automatically, adjusted to stay readable.
            </span>
          </div>
        </div>

        <Field label="The promise" hint="One sentence, sits under the name in the hero.">
          <textarea name="heroPromise" rows={2} defaultValue={agent.heroPromise ?? ""} className={textareaClass} />
        </Field>

        <Field label="Their story" hint="Two or three short paragraphs, first person. Set in the serif on the page.">
          <textarea name="storyText" rows={7} defaultValue={agent.storyText ?? ""} className={textareaClass} />
        </Field>

        <Field label="What they do for a business" hint="One short paragraph, first person.">
          <textarea name="offerText" rows={4} defaultValue={agent.offerText ?? ""} className={textareaClass} />
        </Field>

        {/* Sec 1.7: three services, same shape as a member's packages. */}
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-ink">Their own services</h3>
            <p className="text-xs text-gray-400">
              Optional, up to three. Renders as a subordinate block, not competing with the DigitalFlyer offer.
            </p>
          </div>
          {[0, 1, 2].map((i) => {
            const service = agent.services[i];
            return (
              <div key={i} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[2fr_1fr_1fr]">
                <input
                  name={`serviceName${i}`}
                  defaultValue={service?.name ?? ""}
                  placeholder="Name"
                  className={inputClass}
                />
                <input
                  name={`servicePrice${i}`}
                  defaultValue={service?.price ?? ""}
                  placeholder="Price (optional)"
                  className={inputClass}
                />
                <select name={`serviceType${i}`} defaultValue={service?.type ?? "package"} className={inputClass}>
                  <option value="package">Package</option>
                  <option value="special">Special</option>
                  <option value="discount">Discount</option>
                </select>
                <textarea
                  name={`serviceDescription${i}`}
                  rows={2}
                  defaultValue={service?.description ?? ""}
                  placeholder="Description (optional)"
                  className={`${textareaClass} sm:col-span-3`}
                />
              </div>
            );
          })}
        </div>

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
