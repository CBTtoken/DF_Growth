import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardWizard } from "@/components/onboard/OnboardWizard";
import type { Tier } from "@/lib/paystack/plans";

export default async function OnboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-gray-500 max-w-sm">
          Use the magic link we sent after your payment to get here — this page needs you to be
          signed in.
        </p>
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
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">No account found</h1>
        <p className="text-gray-500 max-w-sm">
          We couldn&apos;t find a business linked to this login. If you just paid, wait a minute
          and refresh — otherwise, get in touch.
        </p>
      </main>
    );
  }

  const { data: growthClient } = await admin
    .from("growth_clients")
    .select(
      "business_name, contact_email, brand_primary_color, brand_secondary_color, meta_pixel_id, meta_ad_account_id, plan, slug, status"
    )
    .eq("id", membership.growth_client_id)
    .single();

  if (!growthClient) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">No account found</h1>
      </main>
    );
  }

  const { data: landingPage } = await admin
    .from("landing_pages")
    .select("headline, subheadline, cta_label")
    .eq("growth_client_id", membership.growth_client_id)
    .eq("slug", growthClient.slug)
    .maybeSingle();

  const tier = growthClient.plan as Tier;

  // Resume where they left off: business_name always exists already (set at
  // checkout), so contact_email — the field step 1 actually adds — is what
  // marks step 1 as done. status === "active" is the authoritative "wizard
  // finished" signal (not meta_pixel_id being set — a client who chose
  // "I need help" on step 4 legitimately finishes with it still null).
  let startStep = 1;
  if (growthClient.contact_email) startStep = 2;
  if (growthClient.brand_primary_color) startStep = 3;
  if (landingPage) startStep = 4;
  if (growthClient.status === "active") startStep = 5;

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-16">
      <OnboardWizard
        startStep={startStep}
        tier={tier}
        slug={growthClient.slug}
        initialData={{
          businessName: growthClient.business_name ?? "",
          contactEmail: growthClient.contact_email ?? "",
          brandPrimaryColor: growthClient.brand_primary_color ?? "#0f2d52",
          brandSecondaryColor: growthClient.brand_secondary_color ?? "#bfc7cf",
          headline: landingPage?.headline ?? "",
          subheadline: landingPage?.subheadline ?? "",
          ctaLabel: landingPage?.cta_label ?? "",
          metaPixelId: growthClient.meta_pixel_id ?? "",
          metaAdAccountId: growthClient.meta_ad_account_id ?? "",
        }}
      />
    </main>
  );
}
