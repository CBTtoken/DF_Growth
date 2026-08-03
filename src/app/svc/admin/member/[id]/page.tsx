import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { formatRand } from "@/lib/svc/data";
import { listMemberLedger, savingsTotalCents } from "@/lib/svc/ledger";
import { compMember, setMemberSuspension, issueBenefitToMember } from "../../manage-actions";
import { svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Member ledger",
  robots: { index: false, follow: false },
};

// The full ledger for one member, every state transition with its
// timestamp visible (Sprint 2 acceptance: a member's full ledger is
// visible in admin).
export default async function MemberLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  const { data: member } = await db
    .from("member")
    .select("id, first_name, surname, cell_number, cell_verified_at, email, status, joined_at, referral_code")
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();

  const [ledger, savings, { data: subscriptions }, { data: referrals }, { data: referredBy }, { data: packages }, { data: benefits }] = await Promise.all([
    listMemberLedger(member!.id),
    savingsTotalCents(member!.id),
    db
      .from("subscription")
      .select("status, billing_interval, provider, started_at, current_period_end, cancelled_at, cancel_reason, package:package_id (name)")
      .eq("member_id", member!.id)
      .order("created_at", { ascending: false }),
    db
      .from("referral")
      .select("level, status, created_at, referred:referred_member_id (first_name, surname)")
      .eq("referrer_member_id", member!.id)
      .order("created_at"),
    db
      .from("referral")
      .select("level, referrer:referrer_member_id (id, first_name, surname)")
      .eq("referred_member_id", member!.id)
      .order("level"),
    db.from("package").select("id, name").eq("active", true).eq("is_current", true).order("name"),
    db.from("benefit").select("id, name").eq("active", true).order("name"),
  ]);

  const adminHref = await svcPath("/admin");

  const stamp = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : null;

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={adminHref} className="text-sm font-semibold text-svc-blue underline">
          Back to admin
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">
          {member!.first_name} {member!.surname}
        </h1>
        <p className="mt-1 text-sm text-svc-ink/70">
          {member!.cell_number} {member!.cell_verified_at ? "(verified)" : "(unverified)"} | {member!.email} |{" "}
          status {member!.status} | joined{" "}
          {new Date(member!.joined_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          {member!.referral_code ? ` | ref code ${member!.referral_code}` : ""}
        </p>
        <p className="mt-2 text-base">
          Real savings to date: <span className="font-bold text-svc-green">{formatRand(savings.total)}</span>
        </p>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-5">
          <h2 className="font-svc-heading text-lg font-bold">Subscriptions</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(subscriptions ?? []).length === 0 && <li className="text-svc-ink/60">None.</li>}
            {(subscriptions ?? []).map((s, i) => (
              <li key={i} className="border-l-4 border-svc-blue pl-3">
                {(s.package as unknown as { name: string } | null)?.name ?? "Package"}, {s.billing_interval},{" "}
                {s.status}
                {s.current_period_end &&
                  `, paid to ${new Date(s.current_period_end).toLocaleDateString("en-ZA")}`}
                {s.provider === "mock" && (
                  <span className="ml-2 inline-block bg-svc-amber px-2 py-0.5 text-xs font-bold uppercase text-svc-ink">
                    TEST DATA, no real payment
                  </span>
                )}
                {s.provider === "comp" && (
                  <span className="ml-2 inline-block bg-svc-blue px-2 py-0.5 text-xs font-bold uppercase text-white">
                    Comped
                  </span>
                )}
                {s.cancel_reason && (
                  <span className="block text-svc-ink/60">Cancel reason: {s.cancel_reason}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-5">
          <h2 className="font-svc-heading text-lg font-bold">Benefit ledger</h2>
          {ledger.length === 0 ? (
            <p className="mt-2 text-sm text-svc-ink/60">Nothing issued yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-svc-ink/15 text-xs uppercase tracking-wide text-svc-ink/60">
                    <th className="py-2 pr-3">Period</th>
                    <th className="py-2 pr-3">Benefit</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Issued</th>
                    <th className="py-2 pr-3">Opened</th>
                    <th className="py-2 pr-3">Claimed</th>
                    <th className="py-2 pr-3">Redeemed</th>
                    <th className="py-2 pr-3">Face</th>
                    <th className="py-2 pr-3">Realised</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id} className="border-b border-svc-ink/10 align-top">
                      <td className="py-2 pr-3">{row.period.slice(0, 7)}</td>
                      <td className="py-2 pr-3">{row.benefit?.name}</td>
                      <td className="py-2 pr-3 font-semibold">{row.status}</td>
                      <td className="py-2 pr-3">{stamp(row.issued_at)}</td>
                      <td className="py-2 pr-3">{stamp(row.opened_at) ?? "-"}</td>
                      <td className="py-2 pr-3">{stamp(row.claimed_at) ?? "-"}</td>
                      <td className="py-2 pr-3">{stamp(row.redeemed_at) ?? "-"}</td>
                      <td className="py-2 pr-3">{formatRand(row.face_value_cents)}</td>
                      <td className="py-2 pr-3">
                        {row.realised_value_cents != null ? formatRand(row.realised_value_cents) : "-"}
                      </td>
                      <td className="py-2">{row.verification_source ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-5">
          <h2 className="font-svc-heading text-lg font-bold">Referred by</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(referredBy ?? []).length === 0 && <li className="text-svc-ink/60">Nobody; they arrived directly.</li>}
            {(referredBy ?? []).map((r, i) => {
              const ref = r.referrer as unknown as { id: string; first_name: string; surname: string } | null;
              return (
                <li key={i}>
                  Level {r.level}:{" "}
                  {ref ? (
                    <Link href={`${adminHref}/member/${ref.id}`} className="font-semibold text-svc-blue underline">
                      {ref.first_name} {ref.surname}
                    </Link>
                  ) : (
                    "Unknown"
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-5">
          <h2 className="font-svc-heading text-lg font-bold">Actions</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <form action={compMember} className="border-2 border-svc-ink/10 p-4">
              <input type="hidden" name="member" value={member!.id} />
              <h3 className="font-svc-heading text-sm font-bold">Comp a month</h3>
              <p className="mt-1 text-xs text-svc-ink/60">
                An active month with no payment behind it, marked as comped.
              </p>
              <label htmlFor="comp-package" className={`mt-2 ${svcLabel}`}>Package</label>
              <select id="comp-package" name="package" required className={`mt-1 ${svcInput}`}>
                <option value="">Choose</option>
                {(packages ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center bg-svc-green px-4 text-sm font-semibold text-white hover:bg-svc-ink"
              >
                Comp this member
              </button>
            </form>

            <form action={setMemberSuspension} className="border-2 border-svc-ink/10 p-4">
              <input type="hidden" name="member" value={member!.id} />
              <input type="hidden" name="suspend" value={member!.status === "suspended" ? "0" : "1"} />
              <h3 className="font-svc-heading text-sm font-bold">
                {member!.status === "suspended" ? "Lift suspension" : "Suspend"}
              </h3>
              <p className="mt-1 text-xs text-svc-ink/60">
                A suspended member is skipped by every issue run until lifted.
                Their record and history stay put.
              </p>
              <button
                type="submit"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center bg-svc-ink px-4 text-sm font-semibold text-white hover:bg-svc-blue"
              >
                {member!.status === "suspended" ? "Lift the suspension" : "Suspend this member"}
              </button>
            </form>
          </div>

          <form action={issueBenefitToMember} className="mt-4 border-2 border-svc-ink/10 p-4">
            <input type="hidden" name="member" value={member!.id} />
            <h3 className="font-svc-heading text-sm font-bold">Issue one benefit now</h3>
            <p className="mt-1 text-xs text-svc-ink/60">
              The single-member giveaway. Voucher batch stock still applies.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="issue-benefit" className={svcLabel}>Benefit</label>
                <select id="issue-benefit" name="benefit" required className={`mt-1 ${svcInput}`}>
                  <option value="">Choose</option>
                  {(benefits ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="issue-face" className={svcLabel}>Face value in Rand</label>
                <input id="issue-face" name="face" type="text" inputMode="decimal" placeholder="0" className={`mt-1 ${svcInput}`} />
              </div>
            </div>
            <button
              type="submit"
              className="mt-3 inline-flex min-h-11 items-center justify-center bg-svc-green px-4 text-sm font-semibold text-white hover:bg-svc-ink"
            >
              Issue it
            </button>
          </form>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-5">
          <h2 className="font-svc-heading text-lg font-bold">People they referred</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(referrals ?? []).length === 0 && <li className="text-svc-ink/60">Nobody yet.</li>}
            {(referrals ?? []).map((r, i) => (
              <li key={i}>
                Level {r.level}:{" "}
                {(r.referred as unknown as { first_name: string; surname: string } | null)?.first_name}{" "}
                {(r.referred as unknown as { first_name: string; surname: string } | null)?.surname} ({r.status},
                since {new Date(r.created_at).toLocaleDateString("en-ZA")})
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
