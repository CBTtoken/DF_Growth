import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { getPackageBySlug, formatRand } from "@/lib/svc/data";
import { svcPaymentsConfigured } from "@/lib/svc/payments";
import { startCheckout } from "./actions";
import { svcBtnPrimary } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; error?: string }>;
}) {
  const params = await searchParams;
  const member = await getCurrentMember();
  if (!member) redirect(await svcPath("/join"));
  if (!member!.cell_verified_at) {
    redirect(`${await svcPath("/join/verify")}?package=${params.package ?? "svc-membership"}`);
  }

  const slug = params.package ?? "svc-membership";
  const pkg = await getPackageBySlug(slug);
  const configured = svcPaymentsConfigured();

  return (
    <div className="bg-svc-cream px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-svc-heading text-3xl font-bold">Almost there</h1>
        <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
          Good day {member!.first_name}, your number is verified. One payment
          step and your membership is live.
        </p>

        {params.error && (
          <p className="mt-6 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            The payment could not be started. Please try again.
          </p>
        )}

        {!pkg ? (
          <div className="mt-8 border-2 border-svc-blue bg-white/60 p-6">
            <p className="text-base leading-relaxed">
              The packages are being finalised, so payment cannot be taken just
              yet. Your account and verified number are safe; we will email you
              the moment you can complete your membership.
            </p>
          </div>
        ) : (
          <div className="mt-8 border-2 border-svc-ink/15 bg-white/60 p-6">
            <h2 className="font-svc-heading text-xl font-bold">{pkg.name}</h2>
            <p className="mt-1 text-2xl font-bold text-svc-green">
              {formatRand(pkg.monthly_price_cents)}
              <span className="text-base font-medium text-svc-ink/60"> per month</span>
            </p>
            <ul className="mt-4 space-y-1 text-sm text-svc-ink/75">
              {pkg.benefits.map((b) => (
                <li key={b.id}>{b.name}</li>
              ))}
              <li>{pkg.free_draw_entries} monthly draw entries</li>
            </ul>

            {configured ? (
              <form action={startCheckout} className="mt-6">
                <input type="hidden" name="package" value={pkg.slug} />
                <button type="submit" className={svcBtnPrimary}>
                  Pay {formatRand(pkg.monthly_price_cents)} securely
                </button>
              </form>
            ) : (
              <div className="mt-6 border-2 border-svc-blue p-4">
                <p className="text-sm leading-relaxed">
                  Payments are not switched on in this environment yet. Your
                  account and verified number are saved; we will email you the
                  moment you can complete your membership.
                </p>
              </div>
            )}
            <p className="mt-3 text-xs text-svc-ink/60">
              Secure payment via Paystack. Test mode while the club is in its
              private build.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
