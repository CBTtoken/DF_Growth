import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bizupLoginPath } from "@/lib/bizup/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { listSlips, signedSlipUrl } from "@/lib/bizup/slips";
import { SlipCapture } from "@/components/bizup/SlipCapture";
import { SlipCard, type SlipCardData } from "@/components/bizup/SlipCard";
import { uploadSlip, saveSlipDetails, setSlipAllocation, deleteSlip } from "./actions";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The Slips surface (BizUp/docs/HANDOFF-slip-management.md).
//
// Photograph a slip, KatisoBiz reads it, you confirm the numbers and tap
// business or personal, and the business ones travel with the accountant
// export. The disclaimer sits right beside the capture button because the
// handoff wants it shown at first capture and kept reachable, and the
// cheapest way to guarantee both is for it to always be there.

function rands(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

export default async function SlipsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, plan")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

  // An R49 feature, shown as a locked screen rather than hidden, same as
  // reports, so the upgrade has something concrete attached to it.
  if (!capabilitiesFor(account.plan as BizUpPlan).expenseSlips) {
    return (
      <main className="flex flex-1 flex-col bg-gray-50">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
          <Link
            href="/bizup"
            className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
          >
            Back to KatisoBiz
          </Link>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold tracking-tight text-ink">Expense slips</h1>
            <p className="mt-2 text-sm text-gray-600">
              Slips come with the R49 plan. Photograph an expense slip, KatisoBiz reads the
              date, supplier and amount for you, you mark it business or personal, and the
              business ones go into your accountant export with the photos included.
            </p>
            <Link
              href="/bizup/upgrade"
              className="mt-5 inline-block rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              See the plans
            </Link>
          </div>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const slips = await listSlips(account.id);

  // Signed URLs minted here, per render, because the bucket is private and
  // that is the only way a slip image is ever reachable.
  const cards: SlipCardData[] = await Promise.all(
    slips.map(async (s) => ({
      id: s.id,
      imageUrl: s.storage_path ? await signedSlipUrl(s.storage_path) : null,
      slipDate: s.slip_date,
      supplier: s.supplier,
      description: s.description,
      amountRands: rands(s.amount_cents),
      vatRands: rands(s.vat_amount_cents),
      allocation: s.allocation,
      status: s.status,
    })),
  );

  const needsChecking = cards.filter((c) => c.status === "captured");
  const unallocated = cards.filter(
    (c) => c.allocation === null && (c.status === "captured" || c.status === "reviewed"),
  );
  const open = cards.filter((c) => c.status === "captured" || c.status === "reviewed");
  const done = cards.filter((c) => c.status === "exported" || c.status === "purged");

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Expense slips</h1>
          <p className="mt-1 text-sm text-gray-500">
            Photograph it, check the numbers, tap business or personal. Business slips go with
            your accountant export.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <SlipCapture action={uploadSlip} />

          {/* The disclaimer the handoff requires at capture. Always here,
              not a one-time popup, so it is also always reachable. */}
          <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
            KatisoBiz reads your slip to save you typing, but the photo here is a working copy,
            not your tax record. SARS requires you to keep the original slip, on paper or your
            own scan, for five years, and DigitalFlyer does not take responsibility for storing
            the image. Once a slip has been exported for your accountant, the photo is deleted
            from KatisoBiz to save space. The numbers stay.
          </p>
        </section>

        {needsChecking.length > 0 && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {needsChecking.length === 1
              ? "1 slip is waiting for you to check its numbers."
              : `${needsChecking.length} slips are waiting for you to check their numbers.`}{" "}
            KatisoBiz read them for you, but what it read is a suggestion until you confirm it.
          </p>
        )}

        {unallocated.length > 0 && needsChecking.length === 0 && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {unallocated.length === 1
              ? "1 slip still needs a Business or Personal tap."
              : `${unallocated.length} slips still need a Business or Personal tap.`}{" "}
            Only business slips travel to your accountant.
          </p>
        )}

        {open.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink">Your slips</h2>
            <ul className="flex flex-col gap-2">
              {open.map((c) => (
                <SlipCard
                  key={c.id}
                  slip={c}
                  saveAction={saveSlipDetails}
                  allocateAction={setSlipAllocation}
                  deleteAction={deleteSlip}
                />
              ))}
            </ul>
          </section>
        )}

        {open.length === 0 && (
          <p className="rounded-2xl border border-gray-100 bg-white p-5 text-center text-sm text-gray-500">
            No slips waiting. Photograph one and it lands here with the numbers read for you.
          </p>
        )}

        {done.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink">Already with your accountant</h2>
            <p className="text-xs text-gray-500">
              These went out in an accountant export. The numbers stay here for your records;
              the photos were deleted to save space, so keep the original slips as SARS
              requires.
            </p>
            <ul className="flex flex-col gap-2">
              {done.map((c) => (
                <SlipCard
                  key={c.id}
                  slip={c}
                  saveAction={saveSlipDetails}
                  allocateAction={setSlipAllocation}
                  deleteAction={deleteSlip}
                />
              ))}
            </ul>
          </section>
        )}

        <p className="text-sm text-gray-600">
          Ready to send everything on?{" "}
          <Link
            href="/bizup/reports/accountant"
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            Export for your accountant
          </Link>
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
