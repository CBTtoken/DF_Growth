import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyBizUpAccount } from "@/lib/bizup/account";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { logOutOfBizUp } from "@/app/bizup/actions";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Dewald: "what happened to the banking section to setup bank details?...
// seems that edits or settings are hidden or got lost somehow?"
//
// He was right and it was my doing. When the navigation was reworked,
// banking lost its only prominent link and survived only as small text at
// the bottom of the home screen and inside the phone menu. On a desktop it
// was effectively gone.
//
// This is the missing floor of the building: one page that lists
// everything a member can change, so nothing can be orphaned by a future
// navigation change again. The nav's Settings link points here.
export default async function BizUpSettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const account = await getMyBizUpAccount();
  if (!account) redirect("/bizup/start");

  const items = [
    {
      href: "/bizup/settings/business",
      title: "Business details",
      body: "Your name, address, VAT number and how your documents look.",
      // Prompts only where something is genuinely missing, rather than
      // decorating every row with a status nobody asked for.
      warn: account.hasBusinessDetails ? null : "No address yet. SARS needs one on invoices over R5,000.",
    },
    {
      href: "/bizup/settings/banking",
      title: "Banking details",
      body: "Where your customers pay you. Printed on every invoice, and encrypted.",
      warn: account.hasBankDetails ? null : "Not set up yet. Your customers cannot pay you without this.",
    },
    {
      href: "/bizup/settings/numbering",
      title: "Invoice numbering",
      body: "Coming from another system? Carry on from your last invoice number.",
      // Only worth prompting about while it can still be changed. Once a
      // member has issued something the setting is locked, and a warning
      // about a thing they can no longer do is just noise.
      warn: account.hasSentDocument
        ? null
        : "Set this before your first invoice. It locks once you send one.",
    },
    {
      href: "/bizup/price-list",
      title: "Price list",
      body: "The things you charge for often, so you never type them twice.",
      warn: null,
    },
    // A member who wanted to pay us had nowhere to do it. The landing page
    // says "you choose a paid plan later, from inside KatisoBiz", and this
    // is the inside.
    {
      href: "/bizup/help",
      title: "How it works",
      body: "Step by step setup, and answers to the things people actually ask.",
      warn: null,
    },
    {
      href: "/bizup/upgrade",
      title: "Your plan",
      body: "What you are on now, what the paid plans include, and topups.",
      warn: null,
    },
  ];

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">{account.businessName}</p>
        </div>

        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-brand"
              >
                <span className="font-semibold text-ink">{i.title}</span>
                <span className="text-sm text-gray-500">{i.body}</span>
                {i.warn && <span className="mt-1 text-sm font-medium text-amber-700">{i.warn}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {account.growthClientId && (
          <Link
            href="/dashboard"
            className="rounded-2xl border border-gray-100 bg-white p-5 text-sm font-semibold text-brand shadow-sm transition hover:border-brand"
          >
            Go to DigitalFlyer Growth
          </Link>
        )}

        <form action={logOutOfBizUp}>
          <button
            type="submit"
            className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-600 transition hover:border-red-300 hover:text-red-600"
          >
            Log out
          </button>
        </form>
      </div>
      <SiteFooter />
    </main>
  );
}
