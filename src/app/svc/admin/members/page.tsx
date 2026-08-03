import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { issueBenefitToGroup } from "../manage-actions";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Members",
  robots: { index: false, follow: false },
};

// Members: search, filter, open one (handoff Sprint 3), plus the bulk
// giveaway issue to a filtered group.
export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; issued?: string; skipped?: string; blocked?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  let query = db
    .from("member")
    .select("id, first_name, surname, cell_number, email, status, joined_at")
    .order("joined_at", { ascending: false })
    .limit(200);
  if (params.status) query = query.eq("status", params.status);
  if (params.q) {
    const q = params.q.trim();
    query = query.or(`email.ilike.%${q}%,first_name.ilike.%${q}%,surname.ilike.%${q}%,cell_number.ilike.%${q}%`);
  }
  const [{ data: members }, { data: benefits }] = await Promise.all([
    query,
    db.from("benefit").select("id, name").eq("active", true).order("name"),
  ]);

  const adminHref = await svcPath("/admin");
  const membersHref = await svcPath("/admin/members");
  const memberBase = await svcPath("/admin/member");

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={adminHref} className="text-sm font-semibold text-svc-blue underline">
          Back to admin
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">Members</h1>

        {(params.issued || params.error) && (
          <p className="mt-4 border-2 border-svc-blue bg-white/60 p-4 text-sm">
            {params.issued !== undefined &&
              `Group issue done: ${params.issued} issued, ${params.skipped ?? 0} already had it, ${params.blocked ?? 0} blocked by voucher stock.`}
            {params.error === "nomembers" && "No members match that status."}
            {params.error === "benefit" && "Pick a benefit to issue."}
          </p>
        )}

        <form method="get" className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            type="text"
            defaultValue={params.q ?? ""}
            placeholder="Name, cell or email"
            className={`${svcInput} flex-1`}
          />
          <select name="status" defaultValue={params.status ?? ""} className={`${svcInput} sm:w-44`}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center bg-svc-green px-5 text-sm font-semibold text-white hover:bg-svc-ink"
          >
            Filter
          </button>
        </form>

        <div className="mt-6 overflow-x-auto border-2 border-svc-ink/15 bg-white/60">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-svc-ink/15 text-xs uppercase tracking-wide text-svc-ink/60">
                <th className="p-3">Member</th>
                <th className="p-3">Cell</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-svc-ink/60">
                    No members match.
                  </td>
                </tr>
              )}
              {(members ?? []).map((m) => (
                <tr key={m.id} className="border-b border-svc-ink/10">
                  <td className="p-3">
                    <Link href={`${memberBase}/${m.id}`} className="font-semibold text-svc-blue underline">
                      {m.first_name} {m.surname}
                    </Link>
                    <span className="block text-xs text-svc-ink/60">{m.email}</span>
                  </td>
                  <td className="p-3">{m.cell_number}</td>
                  <td className="p-3 font-semibold">{m.status}</td>
                  <td className="p-3">{new Date(m.joined_at).toLocaleDateString("en-ZA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-8 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Issue a benefit to a group</h2>
          <p className="mt-2 text-sm leading-relaxed text-svc-ink/75">
            The giveaway path: every member with the chosen status receives the
            benefit for this month. Nobody gets it twice, and a voucher batch
            blocks at its supplied quantity.
          </p>
          <form action={issueBenefitToGroup} className="mt-4 space-y-4">
            <div>
              <label htmlFor="g-benefit" className={svcLabel}>Benefit</label>
              <select id="g-benefit" name="benefit" required className={`mt-2 ${svcInput}`}>
                <option value="">Choose the benefit</option>
                {(benefits ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="g-status" className={svcLabel}>Members with status</label>
                <select id="g-status" name="status" defaultValue="active" className={`mt-2 ${svcInput}`}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label htmlFor="g-face" className={svcLabel}>Face value in Rand</label>
                <input id="g-face" name="face" type="text" inputMode="decimal" placeholder="0" className={`mt-2 ${svcInput}`} />
              </div>
            </div>
            <button type="submit" className={svcBtnGreen}>
              Issue to the group
            </button>
          </form>
        </section>

        <p className="mt-6 text-sm text-svc-ink/60">
          Open a member to comp, suspend, or issue to them individually:{" "}
          <Link href={membersHref} className="underline">refresh this list</Link>{" "}
          or use the search on the admin home.
        </p>
      </div>
    </div>
  );
}
