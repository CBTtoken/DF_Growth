import type { ComponentType } from "react";
import { Standing365Page } from "@/components/custom-pages/standing365/Standing365Page";
import { RebizNomadsPage } from "@/components/custom-pages/rebiz-nomads/RebizNomadsPage";

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 2 and 4: a hand-coded page
// is looked up here by landing_pages.custom_page_key, the same shape as
// lib/templates/registry.ts selecting a templated renderer by
// growth_clients.template, just for pages too custom for that system to
// produce. Add an entry here the next time a real member's custom page
// request is built, rather than branching page.tsx itself per page.
export type CustomPageProps = {
  clientId: string;
  businessName: string;
  metaPixelId: string | null;
};

export const customPages: Record<string, ComponentType<CustomPageProps>> = {
  "standing-365": Standing365Page,
  "rebiz-nomads": RebizNomadsPage,
};

// Own SEO metadata per custom page rather than the generic business-listing
// shape generateMetadata builds for a templated page (title/description
// there assume a business name and description, which don't apply to a
// book) — kept alongside the component in the same registry so a future
// custom page's metadata and rendering stay defined in one place.
export type CustomPageMeta = { title: string; description: string };

export const customPageMeta: Record<string, CustomPageMeta> = {
  "standing-365": {
    title: "Standing 365 — A Book for the Real Life",
    description:
      "365 Daily Devotions for Real People in Real Hard Seasons. Not for the people who have it all together — for everyone still standing in the middle of the hard thing.",
  },
  "rebiz-nomads": {
    title: "RE:Biz Nomads — A Private Business Community",
    description:
      "Included with every DigitalFlyer membership: a private business network, a real deal room, and monthly founder sessions for South African business owners.",
  },
};

export function getCustomPage(key: string | null) {
  if (!key) return null;
  return customPages[key] ?? null;
}

export function getCustomPageMeta(key: string | null) {
  if (!key) return null;
  return customPageMeta[key] ?? null;
}
