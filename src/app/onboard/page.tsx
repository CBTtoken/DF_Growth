import type { Metadata } from "next";
import Link from "next/link";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardWizard } from "@/components/onboard/OnboardWizard";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { SiteFooter } from "@/components/SiteFooter";
import type { Tier } from "@/lib/paystack/plans";

// Private, signed-in-only flow — nothing here should ever show up in search
// results, so this overrides the root layout's indexable default.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OnboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  const admin = createAdminClient();
  // A user can belong to more than one growth_client (growth_members is a
  // proper join table for exactly that reason) — take the most recent one
  // rather than assuming there's only ever a single row.
  const { data: memberships } = await admin
    .from("growth_members")
    .select("growth_client_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const membership = memberships?.[0];

  if (!membership) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">No account found</h1>
          <p className="text-sm text-gray-500">
            We couldn&apos;t find a business linked to this login. If you just paid, wait a minute
            and refresh — otherwise, get in touch.
          </p>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const { data: growthClient } = await admin
    .from("growth_clients")
    .select(
      "business_name, contact_email, call_phone, whatsapp_phone, province, industry, business_address, business_description, tagline, products_services, additional_notes, facebook_url, instagram_url, website_url, ai_landing_draft, brand_primary_color, brand_secondary_color, logo_path, template, packages, meta_pixel_id, meta_ad_account_id, meta_setup_requested_help, plan, slug, status, billing_cycle"
    )
    .eq("id", membership.growth_client_id)
    .single();

  if (!growthClient) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">No account found</h1>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const { data: landingPage } = await admin
    .from("landing_pages")
    .select("headline, subheadline, about_text, services_text, cta_label")
    .eq("growth_client_id", membership.growth_client_id)
    .eq("slug", growthClient.slug)
    .maybeSingle();

  // Sprint 1, Build Item 11: photos, ordered by position (first uploaded is
  // the "primary", shown first) — same table/ordering the dashboard's
  // gallery already uses.
  const { data: photos } = await admin
    .from("client_photos")
    .select("id, storage_path")
    .eq("growth_client_id", membership.growth_client_id)
    .order("position", { ascending: true });

  const tier = growthClient.plan as Tier;

  // Resume where they left off: business_name always exists already (set at
  // checkout), so contact_email — the field step 1 actually adds — is what
  // marks step 1 as done. business_description is step 2's own field, so it
  // marks step 2 done regardless of whether the AI draft succeeded. Step 4
  // (photo upload) has no field of its own to check — it's skippable and
  // writes nothing when skipped, so there's no direct "done" marker; a
  // client sitting exactly at step 4 is caught correctly anyway, since
  // brand_primary_color (step 3) is set but template (step 5) isn't yet.
  // growthClient.template !== null marks step 5 (the template picker) done —
  // the Server Action always writes a real value, even "conversion" for the
  // classic layout, specifically so this check can't be confused with a
  // pre-templates client who never saw the picker (see templateSchema's
  // comment in lib/schemas/intake.ts). `landingPage` existing is what marks
  // step 6 done — the AI draft is stored separately on
  // growth_clients.ai_landing_draft precisely so it doesn't look like a
  // finished step 6 on refresh (see the migration comment). packages !==
  // null marks step 7 done — it's explicitly optional and an all-blank
  // submit still writes an empty array, distinct from the pre-step7 null
  // default.
  //
  // Combined spec Sec 10: status === "active" used to be the single
  // authoritative "wizard finished" signal, because Meta Connect (step 8)
  // used to set it directly — payment had already happened before the
  // wizard even started. Now payment is its own final step (9) that
  // happens after Meta Connect, so status stays "pending_intake" through
  // step 8 too, and a separate signal is needed to tell "Meta Connect
  // answered, not paid yet" apart from "still on Meta Connect": either
  // field it can write is enough (a client who chose "I need help" leaves
  // meta_pixel_id null but meta_setup_requested_help becomes true, never
  // both still at their pre-step-8 defaults). Never true for Foundation,
  // which doesn't have this step at all.
  let startStep = 1;
  if (growthClient.contact_email) startStep = 2;
  if (growthClient.business_description) startStep = 3;
  if (growthClient.brand_primary_color) startStep = 4;
  if (growthClient.template !== null) startStep = 5;
  if (landingPage) startStep = 6;
  if (growthClient.packages !== null) startStep = 7;
  if (growthClient.meta_pixel_id !== null || growthClient.meta_setup_requested_help) startStep = 9;
  // Past totalSteps (now 9 for non-foundation, 7 for foundation) either
  // way, so the wizard shows its "you're all set" screen once payment (or,
  // for foundation, packages) is done.
  if (growthClient.status === "active") startStep = 10;

  const aiDraft = growthClient.ai_landing_draft as {
    headline?: string;
    subheadline?: string;
    aboutText?: string;
    servicesText?: string;
  } | null;

  const packages =
    (growthClient.packages as { name: string; price: string; description: string; type?: "package" | "special" | "discount" }[] | null) ?? [];

  const logoUrl = growthClient.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${growthClient.logo_path}`
    : null;

  const photosStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;

  return (
    <main className="flex flex-1 flex-col items-center gap-10 bg-gray-50 px-4 py-16">
      <BrandHeader />
      <OnboardWizard
        startStep={startStep}
        tier={tier}
        billingCycle={growthClient.billing_cycle === "annual" ? "annual" : "monthly"}
        slug={growthClient.slug}
        photos={photos ?? []}
        photosStorageBase={photosStorageBase}
        initialData={{
          businessName: growthClient.business_name ?? "",
          contactEmail: growthClient.contact_email ?? "",
          callPhone: growthClient.call_phone ?? "",
          whatsappPhone: growthClient.whatsapp_phone ?? "",
          province: growthClient.province ?? "",
          industry: growthClient.industry ?? "",
          businessAddress: growthClient.business_address ?? "",
          businessDescription: growthClient.business_description ?? "",
          tagline: growthClient.tagline ?? "",
          productsServices: growthClient.products_services ?? "",
          additionalNotes: growthClient.additional_notes ?? "",
          facebookUrl: growthClient.facebook_url ?? "",
          instagramUrl: growthClient.instagram_url ?? "",
          websiteUrl: growthClient.website_url ?? "",
          // Generic starting point for a new client's own color picker — not
          // tied to any particular client's brand. Was FortisLex's navy/steel
          // (a copy-paste leftover from an unrelated project), fixed to use
          // DigitalFlyer's own blue instead.
          brandPrimaryColor: growthClient.brand_primary_color ?? "#1081b8",
          brandSecondaryColor: growthClient.brand_secondary_color ?? "#ffffff",
          logoUrl,
          template: growthClient.template ?? "",
          headline: landingPage?.headline ?? aiDraft?.headline ?? "",
          subheadline: landingPage?.subheadline ?? aiDraft?.subheadline ?? "",
          aboutText: landingPage?.about_text ?? aiDraft?.aboutText ?? "",
          servicesText: landingPage?.services_text ?? aiDraft?.servicesText ?? "",
          ctaLabel: landingPage?.cta_label ?? "",
          packages,
          metaPixelId: growthClient.meta_pixel_id ?? "",
          metaAdAccountId: growthClient.meta_ad_account_id ?? "",
        }}
      />
      <SiteFooter />
    </main>
  );
}
