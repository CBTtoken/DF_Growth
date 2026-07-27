import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BizUpNav } from "@/components/bizup/BizUpNav";

// Mounts the bottom navigation once, for every signed-in member, rather
// than each page remembering to include it. That is the whole point of
// consistent navigation: it cannot be missing from a screen because
// somebody forgot.
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

  let showNav = false;
  if (user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("bizup_accounts")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    showNav = !!data;
  }

  return (
    <>
      {/* Padding so the fixed bar never covers the last thing on a page.
          Applied here rather than remembered per page, for the same reason
          the bar itself lives here. */}
      <div className={showNav ? "pb-20" : undefined}>{children}</div>
      {showNav && <BizUpNav />}
    </>
  );
}
