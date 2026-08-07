import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientLandingPageView } from "@/components/landing/ClientLandingPageView";
import { PageViewTracker } from "@/components/landing/PageViewTracker";
import { ClientPageNavBar } from "@/components/landing/ClientPageNavBar";
import { getCustomPage, getCustomPageMeta } from "@/lib/custom-pages/registry";
import type { PublicBookableUnit } from "@/components/landing/BookingSection";
import type { PublicShopProduct } from "@/components/landing/ShopSection";
import { shapeShopProduct } from "@/lib/shop/queries";
import type { PublicReview } from "@/components/reviews/ReviewsSection";
import { truncateOnWord } from "@/lib/text";
import { getLiveAgentPage, getAgentSocialProof, getProofPages, getAgentPageByFormerSlug } from "@/lib/agent-page/data";
import { AgentPageView } from "@/components/agent-page/AgentPageView";
import { agentPageMetadata } from "@/lib/agent-page/og";

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
// A member can have more than one published landing_pages row: Buffelskop
// carried a custom row and a template row side by side, and taking [0] from
// an UNORDERED Postgrest embed let the generic template silently replace
// his hand-built page. Found live, 4 August 2026, when the wrong hero
// showed up in a home page screenshot. A custom row always wins; embed
// order must never decide what a visitor sees.
function pickLandingPage<T extends { page_type: string }>(rows: T[]): T {
  return rows.find((row) => row.page_type === "custom") ?? rows[0];
}

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
      "id, business_name, tagline, business_description, logo_path, fallback_photo_url, hero_photo_id, google_site_verification, facebook_domain_verification, industry, city, unlisted, landing_pages!inner(page_type, custom_page_key), client_photos!client_photos_growth_client_id_fkey(id, storage_path)"
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .eq("landing_pages.published", true)
    .single();

  // Agent Programme Phase 1 Sec 1.2: agent pages resolve at root level
  // through this same resolver, no prefix. Checked only after the business
  // lookup misses, which costs nothing on the overwhelmingly common path
  // and means an existing business slug can never be shadowed by a new
  // agent page (lib/slug-namespace.ts is what stops the two colliding in
  // the first place; this ordering is the belt to that's braces).
  if (!client) {
    const agent = await getLiveAgentPage(clientSlug);
    return agent ? agentPageMetadata(agent) : {};
  }

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
  // An unlisted member (Old Good demo pattern): the page works for anyone
  // holding the URL, but no crawler is invited. Applied before the custom/
  // template branch so it covers both shapes of page.
  const unlistedRobots = client.unlisted ? { robots: { index: false, follow: false } } : {};

  const landingPages = client.landing_pages as unknown as { page_type: string; custom_page_key: string | null }[];
  const customCheck = pickLandingPage(landingPages);
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
      ...unlistedRobots,
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
  // Agent Programme Phase 0.4: this was a raw .slice(160), which cut mid-word
  // ("...and for my bu") straight into Google results and WhatsApp link
  // previews. The tagline is truncated too, since a long one hit the same
  // wall at render time.
  const description = truncateOnWord(
    client.tagline || client.business_description || `${client.business_name} on DigitalFlyer.`,
    160
  );
  // Share-image preference: the member's own logo, else their own chosen
  // hero photo, else their curated trade image (media library fallback),
  // else the platform logo. A link preview showing the member's trade
  // beats a generic platform mark (platform queue item 1's image-SEO
  // ride-along).
  //
  // The hero-photo step was added 8 August 2026, after Dewald saw a real
  // Facebook share of a member page: a member with no logo AND no stored
  // fallback (anyone who never finished the wizard, e.g. a done-for-you
  // build) fell all the way through to the platform logo, which a
  // 1.91:1 link preview crops into half a DigitalFlyer mark. Their own
  // hero photo was sitting there unused, ranked below an ambient stock
  // image, which was backwards: a member's real photo is always the
  // better preview. Members WITH a logo are unaffected — that branch is
  // untouched, so no existing member's share image changes.
  const heroPhoto = client.hero_photo_id
    ? (client.client_photos as unknown as { id: string; storage_path: string }[] | null)?.find(
        (p) => p.id === client.hero_photo_id
      )
    : undefined;
  // A hero photo is usually portrait (a phone photo), and a link preview
  // is a wide 1.91:1 band — served raw, the crop cuts the subject in
  // half. Supabase's render endpoint returns a properly composed
  // 1200x630 for the preview only; the page itself still serves the
  // full-resolution original through next/image.
  const heroShareImage = heroPhoto
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/client-photos/${heroPhoto.storage_path}?width=1200&height=630&resize=cover`
    : null;
  const image = client.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${client.logo_path}`
    : (heroShareImage ?? client.fallback_photo_url ?? "/brand/logo-blue.png");
  // Explicit dimensions let Facebook render the large card on first
  // scrape instead of falling back to a small thumbnail while it fetches
  // the image to measure it.
  const shareImage = heroShareImage && image === heroShareImage ? { url: image, width: 1200, height: 630 } : image;
  const url = `/${clientSlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // Growth Build Kit B2 asks for og:locale en_ZA on a client page, and it
    // was missing here while the shop routes already set it. It tells a
    // scraper and a link preview which English this is, which is the
    // difference between a South African buyer seeing a date and a price
    // written the way they write them and seeing an American one.
    openGraph: { title, description, url, images: [shareImage], locale: "en_ZA", type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [shareImage] },
    verification: {
      google: client.google_site_verification ?? undefined,
      other: client.facebook_domain_verification
        ? { "facebook-domain-verification": client.facebook_domain_verification }
        : undefined,
    },
    ...unlistedRobots,
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
      `id, business_name, contact_email, call_phone, whatsapp_phone, brand_primary_color, brand_secondary_color, tagline, business_address, packages, logo_path, additional_notes, facebook_url, instagram_url, website_url, template, industry, city, meta_pixel_id, hero_photo_id, booking_enabled, shop_enabled, shop_flat_delivery_cents, shop_free_delivery_over_cents, fallback_photo_url,
      landing_pages!inner(id, headline, subheadline, about_text, services_text, cta_label, page_type, custom_page_key),
      testimonials(id, author_name, quote, rating),
      client_photos!client_photos_growth_client_id_fkey(id, storage_path),
      bookable_units(id, name, unit_type, description, base_price_cents, capacity, duration_minutes),
      booking_operational_rules(operating_hours, buffer_minutes),
      shop_products(id, slug, title, description, base_price_cents, image_paths, is_featured, track_stock, price_pending, position, created_at, shop_product_variants(id, sku, descriptor, price_cents, stock_quantity, is_active)),
      reviews(id, rating, review_text, business_reply, created_at, reviewer_accounts(display_name), board_identities(display_name)),
      bizup_accounts(id)`
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

  if (!client) {
    // Agent Programme Phase 1 Sec 1.2. Ordered ahead of the former-slug
    // redirect below because an agent page is a live destination and a
    // former slug is a historical one: if a slug is somehow both, serving
    // the live page beats redirecting away from it.
    const agent = await getLiveAgentPage(clientSlug);
    if (agent) {
      const [socialProof, proofPages] = await Promise.all([getAgentSocialProof(agent.id), getProofPages()]);
      return <AgentPageView agent={agent} socialProof={socialProof} proofPages={proofPages} mode="live" />;
    }

    // v3 slug rules: a live agent slug never changes without a permanent
    // redirect, because these links live in WhatsApp threads forever.
    const renamedAgent = await getAgentPageByFormerSlug(clientSlug);
    if (renamedAgent) permanentRedirect(`/${renamedAgent.currentSlug}`);

    // The slug may be a former slug (renamed during the URL-shortening
    // cleanup). 301 to the current slug so old links, shares, and the
    // reactivation emails already sent all keep working.
    const { data: renamed } = await admin
      .from("growth_clients")
      .select("slug")
      .contains("previous_slugs", [clientSlug])
      .eq("status", "active")
      .maybeSingle();
    if (renamed?.slug) permanentRedirect(`/${renamed.slug}`);
    // Sec 1.2: "404 on unknown or inactive agent slugs." A draft agent
    // page falls through to here, since getLiveAgentPage only ever returns
    // a published one.
    return notFound();
  }

  // Every one of these is embedded as a to-many relationship (no unique
  // constraint ties any of these child tables to exactly one
  // growth_clients row at the DB level — see init_schema.sql), so each
  // comes back as an array regardless of how many rows actually matched.
  // `landing_pages` is guaranteed non-empty by `!inner` + the dot-filter
  // above; everything else defaults to `[]` the same way the old
  // `?? []` fallbacks did.
  const landingPage = pickLandingPage(client.landing_pages as unknown as LandingPageRow[]);
  const testimonials = client.testimonials as unknown as TestimonialRow[];
  const photos = client.client_photos as unknown as PhotoRow[];
  const bookableUnits = client.bookable_units as unknown as BookableUnitRow[];
  // booking_operational_rules.growth_client_id is its own primary key (a
  // real one-to-one, not just an indexed FK) — Postgrest embeds this as a
  // single object or null, unlike every other child table here which is a
  // genuine to-many relationship and embeds as an array.
  const bookingRules = client.booking_operational_rules as unknown as BookingRulesRow | null;
  // Shaped through the same helper the shop's own routes use, so a product
  // is one shape everywhere: image_paths defaulted from jsonb, and inactive
  // variants dropped before anything can price against one.
  const shopProducts: ShopProductRow[] = ((client.shop_products ?? []) as unknown[]).map(shapeShopProduct);
  // Job 1/4 (scripts/handoff-unified-account-and-reviews.md): a review left
  // through KatisoBiz before this business had a Growth page (or before the
  // two accounts were linked) is stored against bizup_account_id, not this
  // business_id. Most businesses have no linked bizup_accounts row at all
  // (embedded above as `bizup_accounts(id)`, cheap either way), so this
  // second query only runs for the minority that do, rather than adding a
  // round trip to every single page render.
  const linkedBizUpAccount = (client.bizup_accounts as unknown as { id: string }[] | { id: string } | null) ?? null;
  const linkedBizUpAccountId = Array.isArray(linkedBizUpAccount)
    ? (linkedBizUpAccount[0]?.id ?? null)
    : linkedBizUpAccount?.id ?? null;

  const growthReviews = (client.reviews as unknown as PublicReview[]) ?? [];
  const bizUpReviews = linkedBizUpAccountId
    ? ((
        (
          await admin
            .from("reviews")
            .select("id, rating, review_text, business_reply, created_at, reviewer_accounts(display_name), board_identities(display_name)")
            .eq("bizup_account_id", linkedBizUpAccountId)
            .eq("status", "published")
        ).data ?? []
      ) as unknown as PublicReview[])
    : [];
  const reviews = [...growthReviews, ...bizUpReviews].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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
          photos={photos}
          photosStorageBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`}
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
