"use client";

import { useActionState } from "react";
import {
  adminSaveBusinessInfo,
  adminSaveBusinessProfile,
  adminSaveBrandKit,
  adminSaveTemplate,
  adminSaveLandingCopy,
  adminSavePackages,
} from "@/app/admin/clients/[id]/actions";
import { PROVINCES } from "@/lib/schemas/intake";
import { templates } from "@/lib/templates/registry";

const inputClass =
  "h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const textareaClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";
const smallLabelClass = "flex flex-col gap-1 text-xs font-medium text-gray-500";
const sectionClass = "flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";
const saveBtnClass =
  "mt-1 inline-flex w-fit items-center justify-center rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50";

function SaveFeedback({ state }: { state: { error?: string; success?: boolean } | null }) {
  if (state?.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state?.success) return <p className="text-xs text-green-700">Saved.</p>;
  return null;
}

export type AdminClientBuilderData = {
  clientId: string;
  slug: string;
  businessName: string;
  contactEmail: string;
  callPhone: string;
  whatsappPhone: string;
  province: string;
  industry: string;
  businessAddress: string;
  city: string;
  businessDescription: string;
  tagline: string;
  productsServices: string;
  additionalNotes: string;
  facebookUrl: string;
  instagramUrl: string;
  websiteUrl: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  template: string | null;
  headline: string;
  subheadline: string;
  aboutText: string;
  servicesText: string;
  ctaLabel: string;
  packages: { type?: string; name: string; price: string; description: string }[];
};

// Admin-operated equivalent of the /onboard wizard, for a client who's
// handing over access rather than filling this in themselves — see
// adminSave* actions' own comments for why these are separate from the
// client-facing ones rather than reused directly. Sections, not a
// multi-step wizard: admin already knows what they're entering and wants
// to save each part independently, not be walked through it sequentially.
// Logo and photo upload aren't covered here yet (Storage handling, out of
// scope for this pass) — add photos from the client's own dashboard once
// they're set up, or via a later follow-up build.
export function AdminClientBuilder(data: AdminClientBuilderData) {
  const [infoState, infoAction, infoPending] = useActionState(adminSaveBusinessInfo, null);
  const [profileState, profileAction, profilePending] = useActionState(adminSaveBusinessProfile, null);
  const [brandState, brandAction, brandPending] = useActionState(adminSaveBrandKit, null);
  const [templateState, templateAction, templatePending] = useActionState(adminSaveTemplate, null);
  const [copyState, copyAction, copyPending] = useActionState(adminSaveLandingCopy, null);
  const [packagesState, packagesAction, packagesPending] = useActionState(adminSavePackages, null);

  const p = data.packages;
  const pkg = (i: number) => p[i] ?? { type: "package", name: "", price: "", description: "" };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="mt-2 text-lg font-bold tracking-tight text-ink">Build This Client&apos;s Page</h2>

      <form action={infoAction} className={sectionClass}>
        <input type="hidden" name="clientId" value={data.clientId} />
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Business Info</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Business name
            <input type="text" name="businessName" defaultValue={data.businessName} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Contact email
            <input type="email" name="contactEmail" defaultValue={data.contactEmail} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Call number
            <input type="tel" name="callPhone" defaultValue={data.callPhone} className={inputClass} />
          </label>
          <label className={labelClass}>
            WhatsApp number
            <input type="tel" name="whatsappPhone" defaultValue={data.whatsappPhone} className={inputClass} />
          </label>
        </div>
        <button type="submit" disabled={infoPending} className={saveBtnClass}>
          {infoPending ? "Saving..." : "Save Business Info"}
        </button>
        <SaveFeedback state={infoState} />
      </form>

      <form action={profileAction} className={sectionClass}>
        <input type="hidden" name="clientId" value={data.clientId} />
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Business Profile</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Province
            <select name="province" defaultValue={data.province} required className={inputClass}>
              <option value="" disabled>
                Select a province
              </option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Industry
            <input type="text" name="industry" defaultValue={data.industry} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Business address
            <input type="text" name="businessAddress" defaultValue={data.businessAddress} required className={inputClass} />
          </label>
          <label className={labelClass}>
            City
            <input type="text" name="city" defaultValue={data.city} className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          Business description
          <textarea name="businessDescription" defaultValue={data.businessDescription} required rows={3} className={textareaClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Tagline
            <input type="text" name="tagline" defaultValue={data.tagline} className={inputClass} />
          </label>
          <label className={labelClass}>
            Products / services
            <input type="text" name="productsServices" defaultValue={data.productsServices} className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          Additional notes
          <textarea name="additionalNotes" defaultValue={data.additionalNotes} rows={2} className={textareaClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={smallLabelClass}>
            Facebook URL
            <input type="url" name="facebookUrl" defaultValue={data.facebookUrl} className={inputClass} />
          </label>
          <label className={smallLabelClass}>
            Instagram URL
            <input type="url" name="instagramUrl" defaultValue={data.instagramUrl} className={inputClass} />
          </label>
          <label className={smallLabelClass}>
            Website URL
            <input type="url" name="websiteUrl" defaultValue={data.websiteUrl} className={inputClass} />
          </label>
        </div>
        <button type="submit" disabled={profilePending} className={saveBtnClass}>
          {profilePending ? "Saving..." : "Save Business Profile"}
        </button>
        <SaveFeedback state={profileState} />
      </form>

      <form action={brandAction} className={sectionClass}>
        <input type="hidden" name="clientId" value={data.clientId} />
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Brand Kit</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Primary colour
            <input
              type="text"
              name="brandPrimaryColor"
              defaultValue={data.brandPrimaryColor || "#1081b8"}
              placeholder="#1081b8"
              required
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Secondary colour
            <input
              type="text"
              name="brandSecondaryColor"
              defaultValue={data.brandSecondaryColor || "#0b1220"}
              placeholder="#0b1220"
              required
              className={inputClass}
            />
          </label>
        </div>
        <p className="text-xs text-gray-400">Logo upload isn&apos;t available here yet — add it from the client&apos;s own dashboard once they have login access.</p>
        <button type="submit" disabled={brandPending} className={saveBtnClass}>
          {brandPending ? "Saving..." : "Save Brand Kit"}
        </button>
        <SaveFeedback state={brandState} />
      </form>

      <form action={templateAction} className={sectionClass}>
        <input type="hidden" name="clientId" value={data.clientId} />
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Template</h3>
        <label className={labelClass}>
          Layout
          <select name="template" defaultValue={data.template ?? "conversion"} className={inputClass}>
            <option value="conversion">Classic Conversion</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={templatePending} className={saveBtnClass}>
          {templatePending ? "Saving..." : "Save Template"}
        </button>
        <SaveFeedback state={templateState} />
      </form>

      <form action={copyAction} className={sectionClass}>
        <input type="hidden" name="clientId" value={data.clientId} />
        <input type="hidden" name="slug" value={data.slug} />
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Landing Copy</h3>
        <label className={labelClass}>
          Headline
          <input type="text" name="headline" defaultValue={data.headline} required className={inputClass} />
        </label>
        <label className={labelClass}>
          Subheadline
          <input type="text" name="subheadline" defaultValue={data.subheadline} required className={inputClass} />
        </label>
        <label className={labelClass}>
          About text
          <textarea name="aboutText" defaultValue={data.aboutText} required rows={3} className={textareaClass} />
        </label>
        <label className={labelClass}>
          Services text
          <textarea name="servicesText" defaultValue={data.servicesText} rows={2} className={textareaClass} />
        </label>
        <label className={labelClass}>
          CTA button label
          <input type="text" name="ctaLabel" defaultValue={data.ctaLabel || "Get In Touch"} required className={inputClass} />
        </label>
        <button type="submit" disabled={copyPending} className={saveBtnClass}>
          {copyPending ? "Saving..." : "Save Landing Copy"}
        </button>
        <SaveFeedback state={copyState} />
      </form>

      <form action={packagesAction} className={sectionClass}>
        <input type="hidden" name="clientId" value={data.clientId} />
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Packages</h3>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-4">
            <select name={`package${i + 1}Type`} defaultValue={pkg(i).type ?? "package"} className={inputClass}>
              <option value="package">Package</option>
              <option value="special">Special</option>
              <option value="discount">Discount</option>
            </select>
            <input type="text" name={`package${i + 1}Name`} defaultValue={pkg(i).name} placeholder="Name" className={inputClass} />
            <input type="text" name={`package${i + 1}Price`} defaultValue={pkg(i).price} placeholder="Price" className={inputClass} />
            <input
              type="text"
              name={`package${i + 1}Description`}
              defaultValue={pkg(i).description}
              placeholder="Description"
              className={inputClass}
            />
          </div>
        ))}
        <button type="submit" disabled={packagesPending} className={saveBtnClass}>
          {packagesPending ? "Saving..." : "Save Packages"}
        </button>
        <SaveFeedback state={packagesState} />
      </form>
    </div>
  );
}
