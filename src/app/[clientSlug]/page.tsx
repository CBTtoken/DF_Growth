import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientLandingPageView } from "@/components/landing/ClientLandingPageView";
import { PageViewTracker } from "@/components/landing/PageViewTracker";
import { ClientPageNavBar } from "@/components/landing/ClientPageNavBar";
import { getCustomPage, getCustomPageMeta } from "@/lib/custom-pages/registry";

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
  const { data: client } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, tagline, business_description, logo_path, google_site_verification, facebook_domain_verification, industry, city"
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .single();

  if (!client) return {};

  // A custom page (STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 2/4) needs
  // its own metadata shape — the generic business-listing fields below
  // (business_description, logo_path as a business logo) don't apply to a
  // book. Its title/description live in the custom-pages registry
  // alongside its component, so a future custom page's metadata stays
  // defined in one place rather than branched here per page.
  const { data: customCheck } = await admin
    .from("landing_pages")
    .select("page_type, custom_page_key")
    .eq("growth_client_id", client.id)
    .eq("published", true)
    .single();
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

  const { data: client } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, contact_email, call_phone, whatsapp_phone, brand_primary_color, brand_secondary_color, tagline, business_address, packages, logo_path, additional_notes, facebook_url, instagram_url, website_url, template, industry, city, meta_pixel_id, hero_photo_id, booking_enabled, shop_enabled"
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .single();

  if (!client) return notFound();

  // landing_pages, testimonials, and photos don't depend on each other —
  // running them sequentially was adding a full extra network round-trip
  // to the time before the hero could render (confirmed via Lighthouse:
  // this route's LCP element render delay was ~1.8s higher than a page
  // with no DB calls at all, roughly what one extra serial Supabase
  // round-trip costs). The visitor's own auth session used to be fetched
  // here too, server-side — moved to OwnerBarGate (client-side) as part of
  // Task #12's cold-start fix, since reading cookies() anywhere in this
  // route's render path was forcing the entire page to bypass static
  // rendering/ISR on every single request, regardless of the `revalidate`
  // export below (confirmed live: Cache-Control was no-store/must-
  // revalidate and X-Vercel-Cache was MISS on every request, not
  // intermittently — this page was never actually eligible for caching).
  const [{ data: landingPage }, { data: testimonials }, { data: photos }, { data: bookableUnits }, { data: bookingRules }, { data: shopProducts }] =
    await Promise.all([
      admin
        .from("landing_pages")
        .select("id, headline, subheadline, about_text, services_text, cta_label, page_type, custom_page_key")
        .eq("growth_client_id", client.id)
        .eq("published", true)
        .single(),
      admin.from("testimonials").select("id, author_name, quote, rating").eq("growth_client_id", client.id).limit(5),
      // Sprint 1, Build Item 10: fetched unconditionally now (previously only
      // queried, limited to 1, for the Left-Heavy Split hero) — the dedicated
      // gallery section needs the full ordered list regardless of template.
      admin
        .from("client_photos")
        .select("id, storage_path")
        .eq("growth_client_id", client.id)
        .order("position", { ascending: true }),
      // Booking Sec 3.5: fetched unconditionally alongside everything else
      // above (cheap, and this route already fetches sections that may not
      // render) — BookingSection itself returns null when there's nothing
      // to show, same as every other section here.
      admin
        .from("bookable_units")
        .select("id, name, unit_type, description, base_price_cents, capacity, duration_minutes")
        .eq("growth_client_id", client.id)
        .eq("is_active", true)
        .order("position", { ascending: true }),
      admin
        .from("booking_operational_rules")
        .select("operating_hours, buffer_minutes")
        .eq("growth_client_id", client.id)
        .maybeSingle(),
      admin
        .from("shop_products")
        .select("id, title, description, base_price_cents, sale_count")
        .eq("growth_client_id", client.id)
        .eq("status", "active")
        .order("position", { ascending: true }),
    ]);

  if (!landingPage) return notFound();

  // STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 2/4: testimonials and
  // photos above were fetched in parallel regardless (Promise.all doesn't
  // know in advance which branch this takes), so branching here costs
  // nothing extra in latency, just discards two small results a custom
  // page has no use for — its own component tree fetches whatever data it
  // actually needs, the same way ClientLandingPageView owns its own shape.
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
        testimonials={testimonials ?? []}
        photos={photos ?? []}
        bookableUnits={bookableUnits ?? []}
        bookingRules={bookingRules ?? null}
        shopProducts={shopProducts ?? []}
        clientSlug={clientSlug}
        mode="live"
      />
    </>
  );
}
