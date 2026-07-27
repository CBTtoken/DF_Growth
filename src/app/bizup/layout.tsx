import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BizUpNav } from "@/components/bizup/BizUpNav";

// Mounts the navigation once, for every signed-in member, on every page.
//
// Dewald: "when I click on either, the menu options goes away, can we have
// all pages have some decent navigation options?" That is what this fixes,
// and it is the more important half of the navigation rework. Placement was
// wrong; navigation vanishing the moment you use it was broken.
//
// It appears only for a member who actually has a BizUp account, so the
// landing page, login, signup and the customer's public document link are
// all untouched. A customer opening a quote is not a member and must not
// see a member's navigation.
export default async function BizUpLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let businessName: string | null = null;
  if (user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("bizup_accounts")
      .select("business_name")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    businessName = data?.business_name ?? null;
  }

  return (
    <>
      {businessName !== null && <BizUpNav businessName={businessName} />}
      {children}
    </>
  );
}
