"use client";

import { useState } from "react";
import { CURATED_ACCENTS, buildAgentAccent } from "@/lib/agent-page/themes";
import type { AgentPage } from "@/lib/agent-page/data";

// Agent page v3. The page fields an agent owns, shared by the admin view
// and the agent's own dashboard so the two can never drift into editing
// subtly different things.
//
// Everything here can be left empty. The page hides or falls back for
// whatever it has no content for, so an agent who writes nothing still gets
// a complete page: sections 2, 3 and 4 are standard copy in their voice,
// and section 5 has a designed fallback. Nothing on this form is a step.

export const inputClass =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
export const textareaClass =
  "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
export const buttonClass =
  "inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-full border border-gray-200 px-5 text-xs font-semibold text-gray-700 transition hover:border-gray-400 disabled:opacity-50";

const BIO_MAX = 400;

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function AgentPageFields({ agent }: { agent: AgentPage }) {
  const [accent, setAccent] = useState(agent.accentColor);
  const [bio, setBio] = useState(agent.bio ?? "");
  const preview = buildAgentAccent(accent);

  return (
    <>
      {/* One colour, and the whole page ramp derives from it. Curated
          swatches for speed plus a free picker, since Dewald asked that an
          agent be able to use their own colour or DigitalFlyer's. The
          preview strip shows the three stops that actually carry text, so
          what is clicked is what renders. */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-gray-700">Your colour</label>
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
          <span className="rounded-full px-3 py-1.5 text-white" style={{ backgroundColor: preview[600] }}>
            Buttons
          </span>
          <span className="rounded px-2 py-1" style={{ backgroundColor: "#f5efe4", color: preview[700] }}>
            Headings
          </span>
          <span className="rounded px-2 py-1" style={{ backgroundColor: preview[950], color: preview[200] }}>
            Dark section
          </span>
          <span className="normal-case tracking-normal text-gray-400">
            Adjusted automatically so text stays readable on any colour.
          </span>
        </div>
      </div>

      <Field label="Town" hint="Shown next to your name. Left empty, your page simply does not mention a town.">
        <input name="town" defaultValue={agent.town ?? ""} className={inputClass} />
      </Field>

      <Field
        label="WhatsApp number"
        hint="This is the main button on your page. Left empty, the button emails you instead."
      >
        <input name="whatsappNumber" defaultValue={agent.whatsappNumber ?? ""} className={inputClass} />
      </Field>

      {/* v3 section 5, with the guidance the document specifies shown above
          the field rather than buried in a tooltip. */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-700">A few words from you</label>
        <p className="text-xs text-gray-500">
          Three or four sentences, written to the reader, not about yourself. What would you say to someone standing
          in front of you who is not sure yet?
        </p>
        <textarea
          name="bio"
          rows={5}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          className={textareaClass}
        />
        <p className={`text-xs ${bio.length > BIO_MAX - 40 ? "text-amber-600" : "text-gray-400"}`}>
          {bio.length} of {BIO_MAX} characters. Leave it empty and your page uses a standard line instead, which reads
          perfectly well.
        </p>
      </div>

      {/* Build spec 1.7: three services. v3 renders them as pills with no
          price shown, so the price box is kept but labelled honestly. */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Your own services</h3>
          <p className="text-xs text-gray-400">
            Optional, up to three. If you already do something else, photography, printing, design, this is where it
            goes. Only the name shows on your page, as a small tag under your bio.
          </p>
        </div>
        {[0, 1, 2].map((i) => {
          const service = agent.services[i];
          return (
            <div key={i} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[2fr_1fr]">
              <input
                name={`serviceName${i}`}
                defaultValue={service?.name ?? ""}
                placeholder="Name, e.g. Photography"
                className={inputClass}
              />
              <input
                name={`servicePrice${i}`}
                defaultValue={service?.price ?? ""}
                placeholder="Price (kept, not shown)"
                className={inputClass}
              />
              <textarea
                name={`serviceDescription${i}`}
                rows={2}
                defaultValue={service?.description ?? ""}
                placeholder="Description (kept, not shown)"
                className={`${textareaClass} sm:col-span-2`}
              />
              <input type="hidden" name={`serviceType${i}`} value={service?.type ?? "package"} />
            </div>
          );
        })}
      </div>
    </>
  );
}
