"use client";

import { useState } from "react";
import { AGENT_THEME_LIST } from "@/lib/agent-page/themes";
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
  const [theme, setTheme] = useState(agent.theme);
  const [bio, setBio] = useState(agent.bio ?? "");

  return (
    <>
      {/* v3: "Four curated themes, no free colour picker. The agent picks a
          theme, not a colour." Each swatch shows the real hero and accent
          stops, so what is clicked is what renders. */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-gray-700">Your theme</label>
        <input type="hidden" name="pageTheme" value={theme} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {AGENT_THEME_LIST.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={`flex flex-col overflow-hidden rounded-xl border-2 text-left transition ${
                theme === option.id ? "border-brand" : "border-transparent hover:border-gray-200"
              }`}
            >
              <span className="h-10 w-full" style={{ backgroundColor: option.heroBg }} />
              <span className="flex items-center gap-1.5 px-2.5 py-2" style={{ backgroundColor: option.tint }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.accentOnLight }} />
                <span className="text-xs font-semibold text-neutral-ink">{option.name}</span>
              </span>
            </button>
          ))}
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
