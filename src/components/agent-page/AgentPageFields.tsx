"use client";

import { useState } from "react";
import { CURATED_ACCENTS, buildAgentPalette } from "@/lib/agent-page/palette";
import type { AgentPage } from "@/lib/agent-page/data";

// Agent Programme Phase 1. The page fields an agent owns, shared by the
// admin view and the agent's own dashboard so the two can never drift into
// editing subtly different things.
//
// Every box here can be left empty. The page hides whatever it has no copy
// for, so an agent who does not want to write about themselves still gets
// a real page with their name, their photo and their colour, and can come
// back and fill a box in whenever they feel like it. Nothing on this form
// is a required step.

export const inputClass =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
export const textareaClass =
  "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
export const buttonClass =
  "inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-full border border-gray-200 px-5 text-xs font-semibold text-gray-700 transition hover:border-gray-400 disabled:opacity-50";

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
  // Held in state so the swatches and the derived colours update as a
  // colour is picked. That preview is the only way to see what the
  // contrast floor did to a pale choice before saving it.
  const [accent, setAccent] = useState(agent.accentColor);
  const palette = buildAgentPalette(accent);

  return (
    <>
      <Field label="Town" hint="Left empty, your page simply does not mention a town.">
        <input name="town" defaultValue={agent.town ?? ""} className={inputClass} />
      </Field>

      <Field label="WhatsApp number" hint="Left empty, the WhatsApp button does not appear at all.">
        <input name="whatsappNumber" defaultValue={agent.whatsappNumber ?? ""} className={inputClass} />
      </Field>

      {/* Sec 1.4: curated set plus a custom picker, with the derived
          colours shown, since the contrast floor can move a pale pick a
          long way from what was clicked. */}
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
          <span className="rounded px-2 py-1 text-white" style={{ backgroundColor: palette.heroBg }}>
            Your page
          </span>
          <span className="rounded px-2 py-1" style={{ backgroundColor: palette.tint, color: palette.accentOnLight }}>
            Headings
          </span>
          <span className="rounded px-2 py-1" style={{ backgroundColor: "#0b1220", color: palette.accentOnDark }}>
            On dark
          </span>
          <span className="normal-case tracking-normal text-gray-400">
            Everything else is worked out from this one colour, and adjusted so it stays readable.
          </span>
        </div>
      </div>

      <Field label="The one line under your name" hint="Optional. One sentence about what you do for a business.">
        <textarea name="heroPromise" rows={2} defaultValue={agent.heroPromise ?? ""} className={textareaClass} />
      </Field>

      <Field
        label="Your story"
        hint="Optional. Two or three short paragraphs in your own words. Leave it empty and the section does not appear."
      >
        <textarea name="storyText" rows={7} defaultValue={agent.storyText ?? ""} className={textareaClass} />
      </Field>

      <Field label="What you do for a business" hint="Optional. One short paragraph.">
        <textarea name="offerText" rows={4} defaultValue={agent.offerText ?? ""} className={textareaClass} />
      </Field>

      {/* Sec 1.7: three services, same shape as a member's packages. */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Your own services</h3>
          <p className="text-xs text-gray-400">
            Optional, up to three. If you already do something else, photography, printing, design, this is where it
            goes. It sits below the DigitalFlyer part of your page, not competing with it.
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
    </>
  );
}
