import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardWizard } from "@/components/onboard/OnboardWizard";
import { BrandHeader } from "@/components/brand/BrandHeader";
import type { Tier } from "@/lib/paystack/plans";

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
          <h1 className="text-xl font-bold tracking-tight text-ink">Check your email</h1>
          <p className="text-sm text-gray-500">
            Use the magic link we sent after your payment to get here — this page needs you to be
            signed in.
          </p>
        </div>
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
      </main>
    );
  }

  const { data: growthClient } = await admin
    .from("growth_clients")
    .select(
      "business_name, contact_email, contact_phone, province, industry, business_address, business_description, tagline, products_services, additional_notes, facebook_url, instagram_url, ai_landing_draft, brand_primary_color, brand_secondary_color, logo_path, packages, meta_pixel_id, meta_ad_account_id, plan, slug, status"
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
      </main>
    );
  }

  const { data: landingPage } = await admin
    .from("landing_pages")
    .select("headline, subheadline, about_text, services_text, cta_label")
    .eq("growth_client_id", membership.growth_client_id)
    .eq("slug", growthClient.slug)
    .maybeSingle();

  const tier = growthClient.plan as Tier;

  // Resume where they left off: business_name always exists already (set at
  // checkout), so contact_email — the field step 1 actually adds — is what
  // marks step 1 as done. business_description is step 2's own field, so it
  // marks step 2 done regardless of whether the AI draft succeeded.
  // `landingPage` existing is what marks step 4 done — the AI draft is
  // stored separately on growth_clients.ai_landing_draft precisely so it
  // doesn't look like a finished step 4 on refresh (see the migration
  // comment). packages !== null marks step 5 done — it's explicitly optional
  // and an all-blank submit still writes an empty array, distinct from the
  // pre-step5 null default. status === "active" is the authoritative
  // "wizard finished" signal (not meta_pixel_id being set — a client who
  // chose "I need help" on step 6 legitimately finishes with it still null).
  let startStep = 1;
  if (growthClient.contact_email) startStep = 2;
  if (growthClient.business_description) startStep = 3;
  if (growthClient.brand_primary_color) startStep = 4;
  if (landingPage) startStep = 5;
  if (growthClient.packages !== null) startStep = 6;
  if (growthClient.status === "active") startStep = 7;

  const aiDraft = growthClient.ai_landing_draft as {
    headline?: string;
    subheadline?: string;
    aboutText?: string;
    servicesText?: string;
  } | null;

  const packages = (growthClient.packages as { name: string; price: string; description: string }[] | null) ?? [];

  const logoUrl = growthClient.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${growthClient.logo_path}`
    : null;

  return (
    <main className="flex flex-1 flex-col items-center gap-10 bg-gray-50 px-4 py-16">
      <BrandHeader />
      <OnboardWizard
        startStep={startStep}
        tier={tier}
        slug={growthClient.slug}
        initialData={{
          businessName: growthClient.business_name ?? "",
          contactEmail: growthClient.contact_email ?? "",
          contactPhone: growthClient.contact_phone ?? "",
          province: growthClient.province ?? "",
          industry: growthClient.industry ?? "",
          businessAddress: growthClient.business_address ?? "",
          businessDescription: growthClient.business_description ?? "",
          tagline: growthClient.tagline ?? "",
          productsServices: growthClient.products_services ?? "",
          additionalNotes: growthClient.additional_notes ?? "",
          facebookUrl: growthClient.facebook_url ?? "",
          instagramUrl: growthClient.instagram_url ?? "",
          // Generic starting point for a new client's own color picker — not
          // tied to any particular client's brand. Was FortisLex's navy/steel
          // (a copy-paste leftover from an unrelated project), fixed to use
          // DigitalFlyer's own blue instead.
          brandPrimaryColor: growthClient.brand_primary_color ?? "#1081b8",
          brandSecondaryColor: growthClient.brand_secondary_color ?? "#ffffff",
          logoUrl,
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
    </main>
  );
}
