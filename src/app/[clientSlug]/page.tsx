import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientLandingPageView } from "@/components/landing/ClientLandingPageView";
import { PageViewTracker } from "@/components/landing/PageViewTracker";
import { ClientPageNavBar } from "@/components/landing/ClientPageNavBar";
import { getCustomPage, getCustomPageMeta } from "@/lib/custom-pages/registry";
import type { PublicBookableUnit } from "@/components/landing/BookingSection";
import type { PublicShopProduct } from "@/components/landing/ShopSection";
import type { PublicReview } from "@/components/reviews/ReviewsSection";

type LandingPageRow = {
  id: string;
  headline: string;
  subheadline: string | null;
  about_text: string | null;
  services_text: string | null;
  cta_label: string;
  page_type: string;
  custom_page_key: string | null;
};
type TestimonialRow = { id: string; author_name: string; quote: string; rating: number | null };
type PhotoRow = { id: string; storage_path: string };
type BookableUnitRow = PublicBookableUnit;
type BookingRulesRow = { operating_hours: Record<string, { open: string; close: string }[]>; buffer_minutes: number };
type ShopProductRow = PublicShopProduct;

// CLAUDE.md Section 7.1 — every client, including the pilot, is served
// through this one route by slug, never a hardcoded page. params is a
// Promise in this Next.js version (14 and earlier had it synchronous, which
// is what the spec's own sample code assumed).
//
// Cached at the edge and revalidated every 60s rather than re-querying
// Supabase on every visit: a marketing page's content only changes when the
// client edits it, and repeat cold Vercel-function executions were the
// single biggest source of LCP variance in testing (a cold run measured 8.9s
// LCP against a warm ~2.3s for the identical page).
export const revalidate = 60;
// Task #12, real root cause found by testing locally rather than guessing:
// a route with a dynamic segment ([clientSlug]) and no generateStaticParams
// defaults to on-demand SSR in this Next.js version — `revalidate` alone
// doesn't make it static-cacheable, regardless of whether any Dynamic API
// is actually used (confirmed: removing the two real cookies() call sites
// on this page and its header, in the two commits before this one, made no
// difference at all — X-Vercel-Cache stayed MISS on every request). Forcing
// static generation explicitly is what actually fixes it — verified via a
// local production build (`npm run build`) that this page compiles and
// generates successfully as static (○) with this set, with no error about
// a remaining dynamic API, before ever redeploying to test it live again.
export const dynamic = "force-static";

// Every client page previously inherited the root layout's generic
// "DigitalFlyer Growth" title/description — meaning a client's own business
// name never appeared in their own browser tab or Google search result.
// This gives every client a real, individual title/description/social
// preview, plus the domain-verification tags added earlier. A small
// dedicated query rather than threading values through the page component
// below: generateMetadata runs as a separate render pass in Next.js and
// keeping it self-contained is simpler than restructuring the page's own
// data fetching to share it.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}): Promise<Metadata> {
  const { clientSlug } = await params;
  const admin = createAdminClient();
  // Performance pass, 2026-07-18: this used to be two sequential round
  // trips (client, then landing_pages) — the exact same class of "one extra
  // serial Supabase round trip" latency the comment on `revalidate` below
  // already measured at ~1.8s. Embedding landing_pages into the same query
  // (same pattern as /marketplace and /shop's `!inner` + dot-filter) turns
  // it into one Postgrest round trip instead of two.
  const { data: client } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, tagline, business_description, logo_path, google_site_verification, facebook_domain_verification, industry, city, landing_pages!inner(page_type, custom_page_key)"
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .eq("landing_pages.published", true)
    .single();

  if (!client) return {};

  // A custom page (STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 2/4) needs
  // its own metadata shape — the generic business-listing fields below
  // (business_description, logo_path as a business logo) don't apply to a
  // book. Its title/description live in the custom-pages registry
  // alongside its component, so a future custom page's metadata stays
  // defined in one place rather than branched here per page.
  //
  // Embedded via a to-many relationship (no unique constraint on
  // landing_pages.growth_client_id alone — see init_schema.sql), so this
  // comes back as an array even filtered down to one row by the query
  // above; `!inner` + the dot-filter already guarantees at least one match.
  const landingPages = client.landing_pages as unknown as { page_type: string; custom_page_key: string | null }[];
  const customCheck = landingPages[0];
  if (customCheck?.page_type === "custom") {
    const meta = getCustomPageMeta(customCheck.custom_page_key);
    if (!meta) return {};
    const url = `/${clientSlug}`;
    return {
      title: meta.title,
      description: meta.description,
      alternates: { canonical: url },
      openGraph: { title: meta.title, description: meta.description, url },
      twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
    };
  }

  // SEO fix: title used to be just the bare business name, relying
  // entirely on the root layout's "%s | DigitalFlyer Growth" template for
  // any context at all — no industry or city, so Google had nothing to
  // match against an unbranded local search ("plumber in Boksburg"). The
  // layout template still adds the brand suffix automatically, this just
  // adds the middle segment. Falls back gracefully — a business missing
  // industry or city keeps a shorter title rather than a broken one with
  // stray "in undefined" text.
  const locationSegment = [client.industry, client.city].filter(Boolean).join(" in ");
  const title = locationSegment ? `${client.business_name} | ${locationSegment}` : client.business_name;
  const description =
    client.tagline || client.business_description?.slice(0, 160) || `${client.business_name} on DigitalFlyer.`;
  const image = client.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${client.logo_path}`
    : "/brand/logo-blue.png";
  const url = `/${clientSlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    verification: {
      google: client.google_site_verification ?? undefined,
      other: client.facebook_domain_verification
        ? { "facebook-domain-verification": client.facebook_domain_verification }
        : undefined,
    },
  };
}

export default async function ClientLandingPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const admin = createAdminClient();

  // Performance pass, 2026-07-18: this used to be a client lookup followed
  // by a 6-way Promise.all keyed on client.id — two sequential stages, plus
  // ClientLandingPageView.tsx and ReviewsSection.tsx each ran their own
  // additional reviews query on top of that (4 sequential round trips on
  // the real critical path in total). The comment below already measured
  // one extra serial round trip at ~1.8s of real LCP cost; four of them
  // compounds badly, and matches the "~2.3s warm" Lighthouse number Dewald
  // flagged as critical. Collapsed into a single embedded query — every
  // child table's own rows come back nested under `client` in one Postgrest
  // round trip, filtered/ordered per relation the same way /marketplace and
  // /shop already do it (`!inner` + dot-notation `.eq()`, `.order()`'s
  // `foreignTable` option for embedded resources). The visitor's own auth
  // session used to be fetched here too, server-side — moved to
  // OwnerBarGate (client-side) as part of Task #12's cold-start fix, since
  // reading cookies() anywhere in this route's render path was forcing the
  // entire page to bypass static rendering/ISR regardless of `revalidate`.
  const { data: client } = await admin
    .from("growth_clients")
    .select(
      `id, business_name, contact_email, call_phone, whatsapp_phone, brand_primary_color, brand_secondary_color, tagline, business_address, packages, logo_path, additional_notes, facebook_url, instagram_url, website_url, template, industry, city, meta_pixel_id, hero_photo_id, booking_enabled, shop_enabled, fallback_photo_url,
      landing_pages!inner(id, headline, subheadline, about_text, services_text, cta_label, page_type, custom_page_key),
      testimonials(id, author_name, quote, rating),
      client_photos!client_photos_growth_client_id_fkey(id, storage_path),
      bookable_units(id, name, unit_type, description, base_price_cents, capacity, duration_minutes),
      booking_operational_rules(operating_hours, buffer_minutes),
      shop_products(id, title, description, base_price_cents, sale_count),
      reviews(id, rating, review_text, business_reply, created_at, reviewer_accounts(display_name))`
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .eq("landing_pages.published", true)
    .eq("bookable_units.is_active", true)
    .eq("shop_products.status", "active")
    .eq("reviews.status", "published")
    .order("position", { ascending: true, referencedTable: "client_photos" })
    .order("position", { ascending: true, referencedTable: "bookable_units" })
    .order("position", { ascending: true, referencedTable: "shop_products" })
    .order("created_at", { ascending: false, referencedTable: "reviews" })
    .limit(5, { referencedTable: "testimonials" })
    .single();

  if (!client) return notFound();

  // Every one of these is embedded as a to-many relationship (no unique
  // constraint ties any of these child tables to exactly one
  // growth_clients row at the DB level — see init_schema.sql), so each
  // comes back as an array regardless of how many rows actually matched.
  // `landing_pages` is guaranteed non-empty by `!inner` + the dot-filter
  // above; everything else defaults to `[]` the same way the old
  // `?? []` fallbacks did.
  const landingPage = (client.landing_pages as unknown as LandingPageRow[])[0];
  const testimonials = client.testimonials as unknown as TestimonialRow[];
  const photos = client.client_photos as unknown as PhotoRow[];
  const bookableUnits = client.bookable_units as unknown as BookableUnitRow[];
  // booking_operational_rules.growth_client_id is its own primary key (a
  // real one-to-one, not just an indexed FK) — Postgrest embeds this as a
  // single object or null, unlike every other child table here which is a
  // genuine to-many relationship and embeds as an array.
  const bookingRules = client.booking_operational_rules as unknown as BookingRulesRow | null;
  const shopProducts = client.shop_products as unknown as ShopProductRow[];
  const reviews = client.reviews as unknown as PublicReview[];

  if (!landingPage) return notFound();

  // STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 2/4: everything above came
  // back in the same single embedded query regardless of which branch this
  // takes (the query doesn't know in advance), so branching here costs
  // nothing extra in latency, just discards the fields a custom page has no
  // use for — its own component tree fetches whatever data it actually
  // needs, the same way ClientLandingPageView owns its own shape.
  if (landingPage.page_type === "custom") {
    /* eslint-disable react-hooks/static-components -- this looks up an
       existing component from a stable module-level registry (the same
       shape as lib/templates/registry.ts selecting a template renderer), it
       doesn't define a new one on every render; the rule can't tell the two
       apart from a capitalised variable assigned from a function call. */
    const CustomPage = getCustomPage(landingPage.custom_page_key);
    if (!CustomPage) return notFound();
    return (
      <>
        <PageViewTracker slug={clientSlug} />
        <ClientPageNavBar />
        <CustomPage
          clientId={client.id}
          businessName={client.business_name}
          metaPixelId={client.meta_pixel_id}
          landingPageId={landingPage.id}
          contactEmail={client.contact_email}
          callPhone={client.call_phone}
          whatsappPhone={client.whatsapp_phone}
          bookingEnabled={client.booking_enabled}
          bookableUnits={bookableUnits}
          bookingRules={bookingRules}
        />
      </>
    );
    /* eslint-enable react-hooks/static-components */
  }

  return (
    <>
      <PageViewTracker slug={clientSlug} />
      <ClientPageNavBar />
      <ClientLandingPageView
        client={client}
        landingPage={landingPage}
        testimonials={testimonials}
        photos={photos}
        bookableUnits={bookableUnits}
        bookingRules={bookingRules}
        shopProducts={shopProducts}
        reviews={reviews}
        clientSlug={clientSlug}
        mode="live"
      />
    </>
  );
}
