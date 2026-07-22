import type { ComponentType } from "react";
import { Standing365Page } from "@/components/custom-pages/standing365/Standing365Page";
import { RebizNomadsPage } from "@/components/custom-pages/rebiz-nomads/RebizNomadsPage";
import { BuffelskopPage } from "@/components/custom-pages/buffelskop/BuffelskopPage";
import { HelpliftPage } from "@/components/custom-pages/helplift/HelpliftPage";
import type { PublicBookableUnit } from "@/components/landing/BookingSection";

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
  // Added for RE:Biz Nomads' real contact form (LeadForm.tsx, the same
  // component every templated page already uses) — Standing 365 has no
  // form and doesn't read this, but it's on every custom page's props now
  // rather than adding a second, page-type-specific prop shape.
  landingPageId: string;
  contactEmail: string | null;
  // Added for Buffelskop's real "Call"/"WhatsApp" CTAs — both already
  // selected by [clientSlug]/page.tsx for the templated path, just not
  // threaded through to CustomPage until a custom page actually needed them.
  callPhone: string | null;
  whatsappPhone: string | null;
  // Dewald's ask, 2026-07-18: a custom page never received Booking data at
  // all — it renders through this registry, not ClientLandingPageView.tsx,
  // which is the only place BookingSection was ever wired in before now.
  // Same "already fetched by the shared query in page.tsx, just not
  // threaded through" story as callPhone/whatsappPhone above. Every custom
  // page receives these; only ones that actually want to show booking
  // (Standing 365 today) render BookingSection with them — the others are
  // free to ignore the props, and BookingSection itself no-ops on zero units
  // regardless.
  bookingEnabled: boolean;
  bookableUnits: PublicBookableUnit[];
  bookingRules: { operating_hours: Record<string, { open: string; close: string }[]>; buffer_minutes: number } | null;
  // Dewald's ask 2026-07-22 (Helplift): a custom page never received the
  // client's uploaded photo gallery, so a custom-page member couldn't
  // self-manage images from the dashboard the way every templated member
  // can. Threaded through now (already fetched by the shared query in
  // page.tsx) so Helplift's skills-development gallery reads from the same
  // dashboard-managed client_photos as everyone else. Pages that don't want
  // a photo gallery just ignore these.
  photos: { id: string; storage_path: string }[];
  photosStorageBase: string;
};

export const customPages: Record<string, ComponentType<CustomPageProps>> = {
  "standing-365": Standing365Page,
  "rebiz-nomads": RebizNomadsPage,
  buffelskop: BuffelskopPage,
  helplift: HelpliftPage,
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
  buffelskop: {
    title: "Premium Sundried Cayenne Chilli Powder | Fine & Coarse | Bulk Orders Available",
    description:
      "Premium preservative-free sundried cayenne chilli powder. Hand-picked, naturally sun-dried and freshly milled. Available in fine or coarse powder from R80/kg. Bulk orders and nationwide delivery from Rustenburg, South Africa.",
  },
  helplift: {
    title: "Helplift Network Vaal Triangle | Inspire and Enable people to help people",
    description:
      "Helplift Network Vaal Triangle (NPO 152-090) connects donors and volunteers with real community needs — through a voucher giving programme, affordable charity stores, skills development, and emotional support in Vanderbijlpark, South Africa.",
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
