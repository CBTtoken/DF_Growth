import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createBizUpAccount, logOutOfBizUp } from "@/app/bizup/actions";
import { getMyBizUpAccount } from "@/lib/bizup/account";
import { BusinessProfileForm } from "@/components/bizup/BusinessProfileForm";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// BizUp/docs/bizup-phase1-spec.md Sec 15.1, the first screen of account
// setup. Reached by a signed-in member who has no KatisoBiz account yet,
// including a Growth member adding KatisoBiz to an account they already have.
export default async function BizUpStartPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  // A member who already has an account goes home, not to a setup screen.
  //
  // This used to send them to /bizup/settings/business, from a time when
  // the setup checklist's first step pointed here and needed somewhere to
  // land. That checklist now links straight to the settings page, so the
  // redirect had outlived its reason and was doing harm: Dewald's browser
  // autocompletes to /start, and being bounced onto a setup form makes a
  // finished account look like an unfinished registration every time.
  const existing = await getMyBizUpAccount();
  if (existing) redirect("/bizup");

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
        <span className="text-2xl font-bold tracking-tight text-ink">KatisoBiz</span>

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

        {/* A way out. This page carries no navigation on purpose, because a
            member with no account yet has nowhere in KatisoBiz to navigate
            to, but that made it a screen with no exit at all. Logging out is
            the honest escape: the business name genuinely is required
            before anything else works, so offering "skip" would be a button
            that bounced straight back here. */}
        <p className="text-center text-sm text-gray-500">
          Not ready yet?{" "}
          <span className="inline-block">
            <form action={logOutOfBizUp} className="inline">
              <button
                type="submit"
                className="font-semibold text-brand underline-offset-2 hover:underline"
              >
                Log out and come back later
              </button>
            </form>
          </span>
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
