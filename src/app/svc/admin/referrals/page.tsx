import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { fraudSignals } from "@/lib/svc/fraud";
import { findMember } from "../actions";
import { svcInput } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Referrals and fraud",
  robots: { index: false, follow: false },
};

// Referral admin (handoff section 8): search lands on the member ledger,
// which shows who referred them and who they referred; the monthly run
// lives with the payouts. The fraud view below flags and never suspends.
export default async function AdminReferralsPage() {
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const signals = await fraudSignals();
  const adminHref = await svcPath("/admin");
  const payoutsHref = await svcPath("/admin/payouts");
  const memberBase = await svcPath("/admin/member");

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={adminHref} className="text-sm font-semibold text-svc-blue underline">
          Back to admin
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">Referrals and fraud</h1>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Look up a member&apos;s referral picture</h2>
          <p className="mt-2 text-sm text-svc-ink/70">
            The member&apos;s page shows who referred them and everyone they
            referred, level by level. The monthly referral run is on the{" "}
            <Link href={payoutsHref} className="font-semibold text-svc-blue underline">
              payouts screen
            </Link>
            .
          </p>
          <form action={findMember} className="mt-3 flex gap-2">
            <input name="query" type="text" placeholder="Cell number or email" className={`${svcInput} flex-1`} />
            <button
              type="submit"
              className="inline-flex min-h-12 shrink-0 items-center bg-svc-green px-5 text-sm font-semibold text-white hover:bg-svc-ink"
            >
              Open member
            </button>
          </form>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Fraud signals, flag only</h2>
          <p className="mt-2 text-sm leading-relaxed text-svc-ink/70">
            Nothing here suspends anyone by itself; every flag is a person to
            look at, not a verdict. Device fingerprints are not captured by
            the platform yet, so that signal from the handoff cannot be shown;
            payment instrument, cell number patterns and chain growth are
            live.
          </p>

          <div className="mt-4 space-y-5">
            <div>
              <h3 className="font-svc-heading text-base font-bold">
                Accounts sharing a payment instrument ({signals.sharedInstruments.length})
              </h3>
              {signals.sharedInstruments.length === 0 ? (
                <p className="mt-1 text-sm text-svc-ink/60">None found.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {signals.sharedInstruments.map((s) => (
                    <li key={s.customerCode} className="border-l-4 border-svc-amber pl-3">
                      Customer code {s.customerCode}:{" "}
                      {s.members.map((m, i) => (
                        <span key={m.id}>
                          {i > 0 && ", "}
                          <Link href={`${memberBase}/${m.id}`} className="font-semibold text-svc-blue underline">
                            {m.name}
                          </Link>{" "}
                          ({m.cell})
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-svc-heading text-base font-bold">
                Cell number prefix clusters, last 30 days ({signals.cellPrefixClusters.length})
              </h3>
              {signals.cellPrefixClusters.length === 0 ? (
                <p className="mt-1 text-sm text-svc-ink/60">None found.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {signals.cellPrefixClusters.map((c) => (
                    <li key={c.prefix} className="border-l-4 border-svc-amber pl-3">
                      {c.count} new members whose numbers start {c.prefix}:{" "}
                      {c.members.slice(0, 6).map((m, i) => (
                        <span key={m.id}>
                          {i > 0 && ", "}
                          <Link href={`${memberBase}/${m.id}`} className="font-semibold text-svc-blue underline">
                            {m.name}
                          </Link>
                        </span>
                      ))}
                      {c.members.length > 6 && ` and ${c.members.length - 6} more`}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-svc-heading text-base font-bold">
                Chains growing fast, {signals.chainThreshold}+ direct signups in 7 days ({signals.fastChains.length})
              </h3>
              {signals.fastChains.length === 0 ? (
                <p className="mt-1 text-sm text-svc-ink/60">None found.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {signals.fastChains.map((f) => (
                    <li key={f.memberId} className="border-l-4 border-svc-amber pl-3">
                      <Link href={`${memberBase}/${f.memberId}`} className="font-semibold text-svc-blue underline">
                        {f.name}
                      </Link>{" "}
                      ({f.cell}): {f.recentLevel1} direct signups this week
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
