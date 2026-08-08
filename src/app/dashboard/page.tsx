import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId, listMyGrowthClients, getMyPartnerId } from "@/lib/auth/require-growth-client";
import { AccountSwitcher } from "@/components/dashboard/AccountSwitcher";
import { AddTestimonialForm } from "@/components/dashboard/AddTestimonialForm";
import { MetaTokenForm } from "@/components/dashboard/MetaTokenForm";
import { MetaIdsForm } from "@/components/dashboard/MetaIdsForm";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { EcosystemAccess } from "@/components/EcosystemAccess";
import { PlatformFeatures } from "@/components/dashboard/PlatformFeatures";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { getMyAgentRecord, getActiveRolePreference } from "@/lib/agents/dashboard-role";
import { getMyBizUpAccount } from "@/lib/bizup/account";
import { BizUpFromGrowth } from "@/components/bizup/BizUpCrossSell";
import { GrowYourReviews } from "@/components/dashboard/GrowYourReviews";
import type { Tier } from "@/lib/paystack/plans";
import { AccountSection } from "@/components/dashboard/AccountSection";
import { ChangeTemplateSection } from "@/components/dashboard/ChangeTemplateSection";
import { PhotoGallery } from "@/components/dashboard/PhotoGallery";
import { AssetStyleSection } from "@/components/dashboard/AssetStyleSection";
import { SocialAssetGenerator } from "@/components/dashboard/SocialAssetGenerator";
import { DomainVerificationForm } from "@/components/dashboard/DomainVerificationForm";
import { PageChecklist } from "@/components/dashboard/PageChecklist";
import { SpotlightBanner } from "@/components/dashboard/SpotlightBanner";
import { OrdersSection, type SellerOrder } from "@/components/dashboard/OrdersSection";
import { PageViewsCard } from "@/components/dashboard/PageViewsCard";
import { ReviewsManagement, type DashboardReview } from "@/components/dashboard/ReviewsManagement";
import { BookingSection } from "@/components/dashboard/BookingSection";
import { ShopSection } from "@/components/dashboard/ShopSection";
import { BookingShopUpsell } from "@/components/dashboard/BookingShopUpsell";
import { DashboardTabs, type DashboardTab } from "@/components/dashboard/DashboardTabs";
import { YourPage, type YourPageInitialData } from "@/components/dashboard/YourPage";
import {
  PAGE_SECTION_ORDER,
  pageSectionStatus,
  type PageSectionKey,
} from "@/lib/page-readiness";
import { SiteFooter } from "@/components/SiteFooter";
import { logOut, markLeadHandled } from "@/app/dashboard/actions";

// Private, signed-in-only — see onboard/page.tsx for the same reasoning.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardPage({
  searchParams,
}: {
  // Which tab is open, and which Your page section within it, both live in
  // the URL so the checklist on Home can link straight at the one thing
  // that fixes an item. Read here rather than in the client component so
  // the right tab is open on the first paint, with no flash of Home.
  searchParams: Promise<{ tab?: string; open?: string }>;
}) {
  const { tab: tabParam, open: openParam } = await searchParams;
  const client = await requireGrowthClientId();

  // Agent Programme Phase 1 Sec 1.1: "An agent with no business membership
  // sees no switcher and lands directly in the agent dashboard." That case
  // used to hit requireGrowthClientId's "No account found for this login"
  // and dead-end on the log-in prompt below, despite the login having a
  // perfectly good approved agent record. Checked before the error branch
  // for exactly that reason.
  //
  // Sec 1.1 also asks the dashboard to "default to whichever role was used
  // last", which is the second condition: a dual-role login that last used
  // the agent side gets sent there rather than always landing on business.
  const agentRecord = await getMyAgentRecord();
  if (agentRecord && (client.error || (await getActiveRolePreference()) === "agent")) {
    redirect("/dashboard/agent");
  }

  // Same shape as the agent case above, for the same reason: a KatisoBiz-only
  // member has no growth_members row at all, so requireGrowthClientId
  // correctly reports "no account found" — but their login is perfectly
  // valid, it just belongs to the other product. Without this they would
  // dead-end on the log-in prompt below after arriving here from any
  // /dashboard link.
  if (client.error && (await getMyBizUpAccount())) {
    redirect("/bizup");
  }

  if (client.error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Please log in</h1>
          <p className="text-sm text-gray-500">This page needs you to be signed in.</p>
          <Link href="/login" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
            Log in
          </Link>
        </div>
        <SiteFooter />
      </main>
    );
  }

  // TS can't narrow `client.id` to `string` from `if (client.error)` above —
  // `error` is a plain `string` in the error branch, and an empty string is
  // falsy, so TS can't rule out that branch here even though
  // requireGrowthClientId() never actually returns one. Asserted, not
  // re-checked, since there's nothing to recover into if it somehow did.
  const growthClientId = client.id!;
  // Reused below for the KatisoBiz card, so a member who already has KatisoBiz sees
  // "Go to KatisoBiz" rather than being invited to set up something they have.
  const bizUpAccount = await getMyBizUpAccount();

  const admin = createAdminClient();

  // Job 4 (scripts/handoff-unified-account-and-reviews.md): "Grow Your
  // Reviews" lets a member pick a past customer instead of retyping a
  // number, but only when they actually have some — most Growth members
  // have no linked KatisoBiz account yet, so this is a no-op for them.
  const { data: reviewableCustomers } = bizUpAccount
    ? await admin
        .from("bizup_customers")
        .select("id, name, whatsapp, phone")
        .eq("account_id", bizUpAccount.id)
        .order("name")
        .limit(50)
    : { data: null };
  // Consolidated Sprint Sec 3.4: last 7 days' raw timestamps, bucketed by
  // day client-side below rather than a date_trunc RPC — simple enough at
  // this data volume, and avoids a second round-trip to define a function.
  // react-hooks/purity flags Date.now() as an impure render call, a rule
  // aimed at client components that may re-render from cached props with
  // no new data — this is an async Server Component that re-executes
  // fully per request by definition, so there's no stale-render risk here.
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: growthClient },
    { data: testimonials },
    { data: assets },
    { data: secret },
    { data: capiEvents },
    { data: leads },
    { data: photos },
    { data: landingPage },
    { count: totalPageViews },
    { data: recentPageViews },
    { data: reviews },
    { data: bookableUnits },
    { data: bookingRules },
    { data: reservations },
    { data: shopProducts },
    { data: shopCoupons },
    { data: shopOrders },
    { data: spotlightRow },
  ] = await Promise.all([
    admin
      .from("growth_clients")
      .select(
        // The block from contact_email to packages is what /dashboard/edit
        // used to fetch on its own route. That route is now a redirect into
        // the Your page tab here (member dashboard navigation sprint), so
        // its columns come along in this same round trip rather than in a
        // second one on a second page.
        "business_name, slug, plan, status, template, asset_style, meta_pixel_id, meta_setup_requested_help, google_site_verification, facebook_domain_verification, business_description, business_address, tagline, whatsapp_phone, hero_photo_id, industry, website_url, marketplace_url, paystack_reference, is_agent_comped, is_admin_comped, booking_enabled, shop_enabled, shop_collection_address, shop_delivery_mode, shop_flat_delivery_cents, shop_free_delivery_over_cents, bobgo_connected_at, bobgo_sandbox, bobgo_last_error, contact_email, call_phone, province, city, products_services, additional_notes, facebook_url, instagram_url, brand_primary_color, brand_secondary_color, logo_path, packages"
      )
      .eq("id", client.id)
      .single(),
    admin
      .from("testimonials")
      .select("id, author_name, quote, rating, created_at")
      .eq("growth_client_id", client.id)
      .order("created_at", { ascending: false }),
    admin
      .from("generated_assets")
      .select("id, image_path, template, created_at")
      .eq("growth_client_id", client.id)
      .order("created_at", { ascending: false }),
    admin
      .from("growth_client_secrets")
      // Presence flags and display fragments only — no encrypted value is
      // ever selected here, so nothing secret can reach the page tree. A
      // connection is "present" when its last4 and connected_at exist,
      // which the connect actions always write together.
      .select(
        "growth_client_id, bobpay_key_last4, bobpay_account_code, bobpay_sandbox, bobpay_connected_at, paystack_key_last4, paystack_connected_at"
      )
      .eq("growth_client_id", client.id)
      .maybeSingle(),
    admin
      .from("capi_events")
      .select("id, event_name, response_status, sent_at")
      .eq("growth_client_id", client.id)
      .order("sent_at", { ascending: false })
      .limit(10),
    // Found via real UAT: leads were being captured with no way for a
    // client to ever see them — this is the first read of the leads table
    // anywhere in the codebase.
    admin
      .from("leads")
      .select("id, name, email, phone, message, created_at, handled_at")
      .eq("growth_client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("client_photos")
      .select("id, storage_path")
      .eq("growth_client_id", client.id)
      .order("position", { ascending: true }),
    // STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sprint 3: the Orders section
    // only makes sense for a client whose page can actually take orders —
    // checked here rather than assuming, so this automatically applies to
    // any future member with their own custom order-taking page too, not
    // just Standing 365 specifically.
    // The copy columns are the other half of what /dashboard/edit used to
    // load; same reasoning as the growth_clients select above.
    admin
      .from("landing_pages")
      .select("page_type, headline, subheadline, about_text, services_text, cta_label")
      .eq("growth_client_id", client.id)
      .maybeSingle(),
    admin
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .eq("growth_client_id", client.id),
    admin
      .from("page_views")
      .select("viewed_at")
      .eq("growth_client_id", client.id)
      .gte("viewed_at", sevenDaysAgo)
      .order("viewed_at", { ascending: true }),
    // Rate & Review Sprint 2, Sec 6: excludes admin-removed reviews — a
    // business can't act on one either way once an admin has removed it,
    // so there's nothing useful this list would show them by keeping it.
    admin
      .from("reviews")
      .select("id, rating, review_text, business_reply, flagged_by, flagged_reason, created_at, reviewer_accounts(display_name), board_identities(display_name)")
      .eq("business_id", client.id)
      .neq("status", "removed")
      .order("created_at", { ascending: false }),
    admin
      .from("bookable_units")
      .select("id, name, unit_type, description, base_price_cents, capacity, duration_minutes, is_active")
      .eq("growth_client_id", client.id)
      .order("position", { ascending: true }),
    admin
      .from("booking_operational_rules")
      .select("operating_hours, buffer_minutes, min_advance_hours, cancellation_policy_text, reminder_offsets_hours")
      .eq("growth_client_id", client.id)
      .maybeSingle(),
    // Upcoming only — a past reservation isn't actionable from here, and
    // cancelled/expired ones are just noise once they've already resolved.
    admin
      .from("reservations")
      .select("id, bookable_unit_id, status, starts_at, ends_at, quantity, customer_name, customer_phone, price_cents, payment_status")
      .eq("growth_client_id", client.id)
      .in("status", ["held", "confirmed"])
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
    // A product now carries pictures, a URL of its own, whether it is
    // featured on the landing page, whether its stock is counted, and its
    // named options. The single unnamed variant a plain product has is
    // still where its stock lives, and is still flattened onto the product
    // below rather than surfacing the join shape to the component.
    admin
      .from("shop_products")
      .select(
        "id, slug, title, sku, description, collection, base_price_cents, image_paths, is_featured, track_stock, weight_kg, length_cm, width_cm, height_cm, status, shop_product_variants(id, sku, descriptor, price_cents, stock_quantity, is_active)"
      )
      .eq("growth_client_id", client.id)
      .order("collection_position", { ascending: true })
      .order("position", { ascending: true }),
    admin
      .from("shop_coupons")
      .select("id, code, discount_type, discount_value, max_uses, uses_count")
      .eq("growth_client_id", client.id)
      .order("created_at", { ascending: false }),
    // One orders query, read by two places: the Orders section on Overview
    // and the summary list inside Shop. It carries the delivery and batch
    // columns the Orders module needs, since a second query for the same
    // rows is how two screens start disagreeing about the same order.
    admin
      .from("shop_orders")
      .select(
        "id, created_at, line_items, total_cents, customer_name, customer_email, customer_phone, delivery_address, delivery_method, member_note, payment_status, fulfilment_status, batch_number, gateway, bobpay_payment_id"
      )
      .eq("growth_client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(50),
    // Page poster (Facebook/HANDOFF-digitalflyer-page-poster.md), Sec 6: the
    // one not-yet-dismissed published spotlight or welcome post, for the
    // share banner above. member_notified_at not null means the publish
    // cron already got this far; member_dismissed_at is the member's own
    // "seen it" action (page-poster-actions.ts).
    admin
      .from("page_poster_queue")
      .select("id, post_type, meta_post_id")
      .eq("growth_client_id", client.id)
      .eq("status", "published")
      .not("member_notified_at", "is", null)
      .is("member_dismissed_at", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Sprint 2: what the Online payments card shows. Booleans and last-four
  // fragments only; the keys themselves never leave the server actions.
  const gatewayStatus = {
    bobpay: {
      connected: Boolean(secret?.bobpay_key_last4 && secret?.bobpay_connected_at),
      last4: secret?.bobpay_key_last4 ?? null,
      accountCode: secret?.bobpay_account_code ?? null,
      sandbox: secret?.bobpay_sandbox !== false,
      connectedAt: secret?.bobpay_connected_at ?? null,
    },
    paystack: {
      connected: Boolean(secret?.paystack_key_last4 && secret?.paystack_connected_at),
      last4: secret?.paystack_key_last4 ?? null,
      connectedAt: secret?.paystack_connected_at ?? null,
    },
  };

  const shopProductsFlat = (shopProducts ?? []).map((p) => {
    const variants = (p.shop_product_variants ?? []) as unknown as {
      id: string;
      sku: string;
      descriptor: Record<string, string> | null;
      price_cents: number | null;
      stock_quantity: number;
      is_active: boolean;
    }[];
    // The unnamed variant is the plain product's own stock. A product with
    // named options has none, and its stock is edited per option instead.
    const plain = variants.find((v) => Object.keys(v.descriptor ?? {}).length === 0);
    return {
      ...p,
      image_paths: (Array.isArray(p.image_paths) ? p.image_paths : []) as string[],
      variants,
      stock_quantity: plain?.stock_quantity ?? 0,
    };
  });

  // Separate from the admin-client Promise.all above — this one needs the
  // current session's own auth.getUser(), not just client.id, to look up
  // every account this login owns. Only ever renders anything when that's
  // more than one (AccountSwitcher's own guard), so this is a no-op extra
  // query for the common single-account case.
  const myAccounts = await listMyGrowthClients();
  // Partner-only (BidWeb's Samantha, for example) — a normal member's login
  // never has a partner_id on any of their memberships, so this is null and
  // the "Add another business" link simply never renders for them.
  const myPartnerId = await getMyPartnerId();

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/generated-assets`;
  const photosStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;
  // Found via real UAT: this used to also require meta_pixel_id to be set,
  // which meant a client who picked "I don't know / need help" during
  // onboarding never saw this section again — no confirmation their request
  // was captured, no way to self-serve if they later found the details.
  // Foundation clients still never see this; they never connect Meta at all.
  const showMetaSection = growthClient?.plan !== "foundation";
  const pageUrl = growthClient?.slug ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${growthClient.slug}` : null;

  // Unread board messages, for the badge on the Messages button. Counted
  // from the messages themselves rather than a counter column, so it cannot
  // drift out of step with what is actually in the thread.
  const { data: myThreads } = await admin.from("board_threads").select("id").eq("growth_client_id", client.id);
  const myThreadIds = (myThreads ?? []).map((t) => t.id);
  const { count: unreadMessageCount } = myThreadIds.length
    ? await admin
        .from("board_messages")
        .select("id", { count: "exact", head: true })
        .in("thread_id", myThreadIds)
        .eq("sender", "public")
        .is("read_at", null)
    : { count: 0 };

  // Everything the Your page tab needs, in the shape the wizard's own step
  // components already expect. /dashboard/edit used to assemble this on its
  // own route; that route is now a redirect in here.
  const yourPageData: YourPageInitialData = {
    businessName: growthClient?.business_name ?? "",
    contactEmail: growthClient?.contact_email ?? "",
    callPhone: growthClient?.call_phone ?? "",
    whatsappPhone: growthClient?.whatsapp_phone ?? "",
    province: growthClient?.province ?? "",
    industry: growthClient?.industry ?? "",
    businessAddress: growthClient?.business_address ?? "",
    city: growthClient?.city ?? "",
    businessDescription: growthClient?.business_description ?? "",
    tagline: growthClient?.tagline ?? "",
    productsServices: growthClient?.products_services ?? "",
    additionalNotes: growthClient?.additional_notes ?? "",
    facebookUrl: growthClient?.facebook_url ?? "",
    instagramUrl: growthClient?.instagram_url ?? "",
    websiteUrl: growthClient?.website_url ?? "",
    brandPrimaryColor: growthClient?.brand_primary_color ?? "#1081b8",
    brandSecondaryColor: growthClient?.brand_secondary_color ?? "#ffffff",
    logoUrl: growthClient?.logo_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${growthClient.logo_path}`
      : null,
    headline: landingPage?.headline ?? "",
    subheadline: landingPage?.subheadline ?? "",
    aboutText: landingPage?.about_text ?? "",
    servicesText: landingPage?.services_text ?? "",
    ctaLabel: landingPage?.cta_label ?? "",
    packages: (growthClient?.packages as YourPageInitialData["packages"] | null) ?? [],
  };

  // The tick or the "2 to add" on each Your page section, from the same
  // definition the Home checklist reads, so the two can never disagree.
  const sectionStatus = pageSectionStatus({
    template: growthClient?.template ?? null,
    heroPhotoId: growthClient?.hero_photo_id ?? null,
    photoCount: photos?.length ?? 0,
    whatsappPhone: growthClient?.whatsapp_phone ?? null,
    businessAddress: growthClient?.business_address ?? null,
    tagline: growthClient?.tagline ?? null,
    businessDescription: growthClient?.business_description ?? null,
    headline: landingPage?.headline ?? null,
    subheadline: landingPage?.subheadline ?? null,
    aboutText: landingPage?.about_text ?? null,
    packageCount: yourPageData.packages.length,
  });

  // Validated against the real list rather than passed through, so a
  // hand-typed or stale ?open= cannot open a section that does not exist.
  const openSection = PAGE_SECTION_ORDER.includes(openParam as PageSectionKey)
    ? (openParam as PageSectionKey)
    : null;

  // UI/UX pass, Dewald's ask: the dashboard had grown into one long
  // scrolling page with no way to jump between sections — grouped here into
  // named tabs (DashboardTabs.tsx renders the bar + swaps content), every
  // section component below is unchanged, just reorganized. Booking & Shop
  // only appears as its own tab for Growth-and-above (showMetaSection),
  // matching the same gate those two sections already used inline.
  //
  // Member dashboard navigation sprint, 8 August 2026: tab labels are the
  // words a member would use ("Home", "Selling"), and "Your Page" stopped
  // meaning two things. It is now the one place a page gets changed, with
  // the public page reached by the "View your page" button above instead.
  const dashboardTabs: DashboardTab[] = [
    {
      id: "overview",
      label: "Home",
      content: (
        <>
          <GrowYourReviews customers={reviewableCustomers ?? []} />

          {spotlightRow && (
            <SpotlightBanner
              queueId={spotlightRow.id}
              postLabel={spotlightRow.post_type === "new_member" ? "welcome post" : "spotlight"}
              postLink={spotlightRow.meta_post_id ? `https://www.facebook.com/${spotlightRow.meta_post_id}` : null}
            />
          )}

          <PageChecklist
            template={growthClient?.template ?? null}
            heroPhotoId={growthClient?.hero_photo_id ?? null}
            photoCount={photos?.length ?? 0}
            whatsappPhone={growthClient?.whatsapp_phone ?? null}
            businessAddress={growthClient?.business_address ?? null}
            tagline={growthClient?.tagline ?? null}
            businessDescription={growthClient?.business_description ?? null}
          />

          <PageViewsCard totalViews={totalPageViews ?? 0} recentViews={recentPageViews ?? []} />

          <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-tight text-ink">
              Leads ({leads?.length ?? 0})
              {(() => {
                const newCount = (leads ?? []).filter((l) => !l.handled_at).length;
                return newCount > 0 ? (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
                    {newCount} new
                  </span>
                ) : null;
              })()}
            </h2>
            <ul className="flex flex-col gap-2">
              {(leads ?? []).map((l) => {
                // Normalise a SA number for wa.me: strip non-digits, leading 0 -> 27.
                const waNumber = l.phone ? l.phone.replace(/\D/g, "").replace(/^0/, "27") : null;
                return (
                  <li
                    key={l.id}
                    className={`flex flex-col gap-2 rounded-xl border p-4 text-sm ${
                      l.handled_at ? "border-gray-100 bg-white opacity-70" : "border-accent/40 bg-accent/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-2 font-medium text-gray-900">
                          {l.name}
                          {!l.handled_at && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              New
                            </span>
                          )}
                        </p>
                        <p className="flex flex-wrap items-center gap-x-2 text-gray-500">
                          <a href={`mailto:${l.email}`} className="text-brand underline-offset-2 hover:underline">
                            {l.email}
                          </a>
                          {l.phone && (
                            <>
                              <span aria-hidden>·</span>
                              <a href={`tel:${l.phone.replace(/\s+/g, "")}`} className="text-brand underline-offset-2 hover:underline">
                                {l.phone}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                    {l.message && <p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-gray-600">{l.message}</p>}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={`mailto:${l.email}`}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
                      >
                        Email
                      </a>
                      {l.phone && (
                        <a
                          href={`tel:${l.phone.replace(/\s+/g, "")}`}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
                        >
                          Call
                        </a>
                      )}
                      {waNumber && (
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:border-green-300"
                        >
                          WhatsApp
                        </a>
                      )}
                      <form action={markLeadHandled.bind(null, l.id, !l.handled_at)} className="ml-auto">
                        <button
                          type="submit"
                          className="rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                        >
                          {l.handled_at ? "Mark as new" : "Mark as handled"}
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
              {(!leads || leads.length === 0) && (
                <p className="text-sm text-gray-400">
                  No leads yet. This fills in as soon as someone contacts you through your page.
                </p>
              )}
            </ul>
          </section>

          {/* STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sprint 3: only shown
              for a client whose page can actually take orders. A critical
              gap found live: orders were being paid for with no way to ever
              see them, including the personalisation details (recipient
              name, gift message) needed to print a cover.

              Shown for a shop as well as a custom order-taking page, since
              both now write the same shop_orders rows. A seller who has
              taken an order always has somewhere to go and read it. */}
          {(landingPage?.page_type === "custom" || growthClient?.shop_enabled) && (
            <OrdersSection orders={(shopOrders ?? []) as unknown as SellerOrder[]} />
          )}
        </>
      ),
    },
    {
      id: "your-page",
      label: "Your page",
      content: (
        <YourPage
          initialOpen={openSection}
          status={sectionStatus}
          initialData={yourPageData}
          photosSlot={
            <PhotoGallery
              photos={photos ?? []}
              storageBase={photosStorageBase}
              heroPhotoId={growthClient?.hero_photo_id ?? null}
              industryHint={growthClient?.industry ?? undefined}
            />
          }
          styleSlot={<ChangeTemplateSection currentTemplate={growthClient?.template ?? "conversion"} />}
        />
      ),
    },
    {
      id: "reviews",
      label: "Reviews",
      content: (
        <>
          <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-ink">Testimonials</h2>
            <AddTestimonialForm />
            <ul className="flex flex-col gap-2">
              {(testimonials ?? []).map((t) => (
                <li key={t.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
                  <p className="text-gray-700">&ldquo;{t.quote}&rdquo;</p>
                  <p className="mt-1.5 text-gray-500">
                    {t.author_name}
                    {t.rating ? <span className="text-brand"> · {"★".repeat(t.rating)}</span> : ""}
                  </p>
                </li>
              ))}
              {(!testimonials || testimonials.length === 0) && (
                <p className="text-sm text-gray-400">No testimonials yet.</p>
              )}
            </ul>
          </section>

          <ReviewsManagement reviews={(reviews ?? []) as unknown as DashboardReview[]} />
        </>
      ),
    },
    {
      id: "marketing",
      label: "Marketing",
      content: (
        <>
          {/* Dewald's ask, 2026-07-18: social asset generation lived under
              "Your Page" before this, alongside template/photo settings it
              has nothing to do with — it's marketing content, so it belongs
              here instead. Moved as a unit, unchanged otherwise. */}
          <AssetStyleSection currentStyle={growthClient?.asset_style ?? "clean"} />

          <SocialAssetGenerator photos={photos ?? []} storageBase={photosStorageBase} />

          <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-ink">Generated social assets</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {(assets ?? []).map((a) => (
                <a
                  key={a.id}
                  href={`${storageBase}/${a.image_path}`}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="group flex flex-col gap-2"
                >
                  <Image
                    src={`${storageBase}/${a.image_path}`}
                    alt="Generated testimonial asset"
                    width={300}
                    height={300}
                    className="aspect-square w-full rounded-xl border border-gray-100 object-cover transition-opacity group-hover:opacity-80"
                  />
                  <span className="text-xs font-medium text-brand underline-offset-2 group-hover:underline">
                    Download
                  </span>
                </a>
              ))}
              {(!assets || assets.length === 0) && (
                <p className="text-sm text-gray-400">
                  Assets appear here once you add a testimonial or generate one above.
                </p>
              )}
            </div>
          </section>

          {/* Public Beta Polish Sprint Sec 10: moved one section higher (was
              below Meta ad tracking) so it's more prominent post-onboarding —
              the two sections' cross-reference copy is flipped below to match
              (this one now comes first, so it points "below" at Meta ad
              tracking instead of "above"). */}
          <section id="search-ad-verification" className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">Search &amp; ad platform verification</h2>
              {/* Combined spec Sec 26: plain-language explanation + cross-
                  reference to Meta ad tracking, which is a related but
                  separate thing (that one's for tracking ad campaign
                  results; this one's for proving you own this page to
                  Google/Facebook's own tools). Only shown to Growth-tier
                  clients, who have both sections — Foundation never sees
                  Meta ad tracking at all. */}
              <p className="mt-1 text-sm text-gray-500">
                This helps your page show up correctly in Google Search Console and Facebook Business
                tools you may already have.
                {showMetaSection && (
                  <>
                    {" "}
                    Tracking Meta ad campaigns instead? See{" "}
                    <a href="#meta-ad-tracking" className="font-semibold text-brand hover:underline">
                      Meta ad tracking
                    </a>{" "}
                    below.
                  </>
                )}
              </p>
            </div>
            <DomainVerificationForm
              initialGoogle={growthClient?.google_site_verification ?? ""}
              initialFacebook={growthClient?.facebook_domain_verification ?? ""}
            />
          </section>

          {showMetaSection && (
            <section id="meta-ad-tracking" className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-ink">Meta ad tracking</h2>
                {/* Combined spec Sec 26: cross-references the search/domain
                    verification section above, since they're easy to confuse
                    — this one is specifically about Meta ad campaigns. */}
                <p className="mt-1 text-sm text-gray-500">
                  For tracking Meta (Facebook/Instagram) ad campaigns specifically. Setting up Google
                  Search Console or Facebook Business verification instead? See{" "}
                  <a href="#search-ad-verification" className="font-semibold text-brand hover:underline">
                    Search &amp; ad platform verification
                  </a>{" "}
                  above.
                </p>
              </div>

              {!growthClient?.meta_pixel_id && growthClient?.meta_setup_requested_help && (
                <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-gray-700">
                  You told us during signup you&apos;d like help connecting your Meta account, and our
                  team will be in touch. If you find your Pixel ID and Ad Account ID before then,
                  add them yourself below and this section will switch on right away.
                </p>
              )}

              {!growthClient?.meta_pixel_id ? (
                <MetaIdsForm />
              ) : (
                <>
                  <MetaTokenForm hasToken={!!secret} />

                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-gray-700">Recent delivery status</h3>
                    <ul className="flex flex-col gap-1.5">
                      {(capiEvents ?? []).map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs"
                        >
                          <span className="font-medium text-gray-700">{e.event_name}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              e.response_status === 200
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {e.response_status ?? "pending"}
                          </span>
                          <span className="text-gray-400">{new Date(e.sent_at).toLocaleString()}</span>
                        </li>
                      ))}
                      {(!capiEvents || capiEvents.length === 0) && (
                        <p className="text-xs text-gray-400">
                          No events sent yet. This fills in once your landing page starts getting leads.
                        </p>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      ),
    },
    {
      id: "account",
      label: "Account",
      content: (
        <>
          {/* Combined spec Sec 23: plan/billing is real but not what a
              client opens the dashboard to actually do day to day — this
              tab, not the first one they land on. */}
          {growthClient && client.id && (
            <AccountSection growthClientId={client.id} plan={growthClient.plan} status={growthClient.status} />
          )}
          <PlatformFeatures plan={growthClient?.plan ?? null} />
          {/* Agent Programme Phase 1 Sec 1.1: "Each role has its own page,
              its own slug, its own data. They do not share content." The
              agent referral section used to sit here, inside the business
              dashboard, which mixed the two roles on one screen. It now
              lives on /dashboard/agent, reached through the role switcher
              at the top of this page. */}

          {/* KatisoBiz. Until this existed there was no way for a Growth member
              to discover it at all: the only link between the two products
              anywhere in the app was a redirect for members who had KatisoBiz
              and nothing else. */}
          <BizUpFromGrowth
            tier={(growthClient?.plan as Tier | undefined) ?? null}
            hasBizUpAccount={!!bizUpAccount}
          />

          <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">Also available to you</h2>
              <p className="mt-1 text-sm text-gray-500">
                As a Growth client, you&apos;re also part of the wider DigitalFlyer SA ecosystem.
              </p>
            </div>
            <EcosystemAccess
              marketplaceUrl={growthClient?.marketplace_url ?? null}
              unlocked={!!growthClient?.paystack_reference || !!growthClient?.is_agent_comped || !!growthClient?.is_admin_comped}
            />
          </section>
        </>
      ),
    },
  ];

  // docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 1: Growth tier and above.
  // Dewald's ask, 2026-07-18: Foundation clients should still see this tab
  // exists (not hidden entirely) but land on a locked upsell rather than the
  // real BookingSection/ShopSection UI — same "see it, then upgrade" pattern
  // as PlatformFeatures.tsx. Inserted as its own tab (not folded into "Your
  // Page") since these are real, separate products a client switches on
  // independently.
  dashboardTabs.splice(
    2,
    0,
    showMetaSection
      ? {
          id: "booking-shop",
          label: "Selling",
          content: (
            <>
              {/* Stays and Tours lives on its own route rather than inside
                  this tab. It is six panels of its own and a guesthouse
                  owner opens it every morning, so it gets a destination
                  rather than a fold inside a tab that already holds two
                  other products. This card is how they find it. */}
              <section className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-ink">Stays and Tours</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    For a guest house, a farm cottage or a self catering place: rooms and rates, a real calendar,
                    deposits into your own account, and the trips you run.
                  </p>
                </div>
                <Link
                  href="/dashboard/stays"
                  className="w-fit rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                >
                  Open Stays and Tours
                </Link>
              </section>
              <BookingSection
                bookingEnabled={growthClient?.booking_enabled ?? false}
                units={bookableUnits ?? []}
                rules={bookingRules ?? null}
                reservations={reservations ?? []}
              />
              <ShopSection
                gateway={gatewayStatus}
                shopEnabled={growthClient?.shop_enabled ?? false}
                shopSlug={growthClient?.slug ?? null}
                products={shopProductsFlat}
                coupons={shopCoupons ?? []}
                orders={shopOrders ?? []}
                collectionAddress={(growthClient?.shop_collection_address as { line1: string; city: string; postalCode: string } | null) ?? null}
                deliveryMode={growthClient?.shop_delivery_mode ?? "flat"}
                flatDeliveryCents={growthClient?.shop_flat_delivery_cents ?? 0}
                freeDeliveryOverCents={growthClient?.shop_free_delivery_over_cents ?? null}
                bobgoConnectedAt={growthClient?.bobgo_connected_at ?? null}
                bobgoSandbox={growthClient?.bobgo_sandbox !== false}
                bobgoLastError={growthClient?.bobgo_last_error ?? null}
              />
            </>
          ),
        }
      : {
          id: "booking-shop",
          label: "Selling",
          content: <BookingShopUpsell growthClientId={growthClientId} />,
        }
  );

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-6">
          <BrandHeader />
          {/* Agent Programme Phase 1 Sec 1.1: the role switcher sits above
              the account switcher because it is the outer choice. Which
              role first, then which business within the business role. */}
          {agentRecord && <RoleSwitcher active="business" />}
          <AccountSwitcher accounts={myAccounts} currentId={client.id ?? ""} />
          {myPartnerId && (
            <Link
              href="/dashboard/add-business"
              className="w-fit rounded-full border border-dashed border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-brand hover:text-brand"
            >
              + Add another business
            </Link>
          )}

          {/* Member dashboard navigation sprint, 8 August 2026. This row
              used to hold five equally weighted buttons (view, edit, board,
              messages, log out), which at 390px wrapped into a wall of
              pills with nothing obviously the main thing, against the
              interface standard's one primary action per screen.

              "Edit your page" is gone entirely: it was the second door onto
              the same fields, and those now live in the Your page tab
              below. What is left is one primary action, full width on a
              phone where a thumb reaches it, and a quieter row of the three
              places a member goes less often. */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
              {growthClient?.business_name && (
                <p className="mt-1 text-sm text-gray-500">{growthClient.business_name}</p>
              )}
            </div>

            {pageUrl && (
              <a
                href={pageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark sm:w-fit sm:py-2.5"
              >
                View your page ↗
              </a>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
              {/* The Board, Phase 1. Kept out here rather than inside a tab,
                  because posting is the thing a member is meant to come
                  back and do, and a tab seven across is not a habit anyone
                  forms. */}
              <Link
                href="/dashboard/board"
                className="text-gray-600 underline-offset-4 transition hover:text-brand hover:underline"
              >
                Post to the board
              </Link>
              <Link
                href="/dashboard/messages"
                className="inline-flex items-center gap-1.5 text-gray-600 underline-offset-4 transition hover:text-brand hover:underline"
              >
                Messages
                {!!unreadMessageCount && (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadMessageCount}
                  </span>
                )}
              </Link>
              {/* Combined spec Sec 28: there was previously no way at all to
                  end a session on a shared/borrowed device. A plain form
                  posting to a Server Action, not a client-side button, so it
                  works with JS disabled and clears the auth cookie
                  server-side. */}
              <form action={logOut} className="ml-auto">
                <button
                  type="submit"
                  className="font-medium text-gray-400 underline-offset-4 transition hover:text-gray-600 hover:underline"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>

        <DashboardTabs tabs={dashboardTabs} initialTabId={tabParam} />
      </div>
      <SiteFooter />
    </main>
  );
}
