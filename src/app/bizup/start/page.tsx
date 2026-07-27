import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createBizUpAccount } from "@/app/bizup/actions";
import { getMyBizUpAccount } from "@/lib/bizup/account";
import { BusinessProfileForm } from "@/components/bizup/BusinessProfileForm";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// BizUp/docs/bizup-phase1-spec.md Sec 15.1, the first screen of account
// setup. Reached by a signed-in member who has no BizUp account yet,
// including a Growth member adding BizUp to an account they already have.
export default async function BizUpStartPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/bizup/login");

  // Signup creates the account row the moment the emailed code is
  // confirmed, so by the time a new member taps "Set up my business" the
  // account always exists. This used to redirect them to the dashboard,
  // which meant the setup screen became unreachable the moment it was
  // needed, and the checklist button pointed at a page that bounced.
  // Sends them to the same form they came for instead.
  const existing = await getMyBizUpAccount();
  if (existing) redirect("/bizup/settings/business");

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
        <span className="text-2xl font-bold tracking-tight text-ink">BizUp</span>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Set up your business</h1>
          <p className="mt-1 text-sm text-gray-500">
            This is what prints at the top of every quote and invoice you send. You can change any
            of it later.
          </p>

          <div className="mt-6">
            <BusinessProfileForm
              action={createBizUpAccount}
              // Pre-filling the email from the signed-in account: it is the
              // one field we already know, and re-typing it on a phone is
              // exactly the kind of friction Sec 9's sixty-second target
              // cannot afford.
              defaults={{ email: user.email ?? "" }}
              submitLabel="Save and continue"
            />
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
