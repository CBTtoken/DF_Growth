import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { periodFor } from "@/lib/svc/ledger";
import { triggerIssueRun, uploadCoupons, findMember } from "./actions";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "SVC admin",
  robots: { index: false, follow: false },
};

// The admin hub: quick nav across every Sprint 3 section, plus the
// original Sprint 2 tools (member lookup, coupon file, issue run) below.
async function AdminNavLink({ path, label }: { path: string; label: string }) {
  const { svcPath: toPath } = await import("@/lib/svc/host");
  const href = await toPath(path);
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center border-2 border-svc-green bg-white/60 px-3 text-sm font-semibold text-svc-green hover:bg-svc-green hover:text-white"
    >
      {label}
    </Link>
  );
}
export default async function SvcAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ issued?: string; emailed?: string; uploaded?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  const { data: benefits } = await db
    .from("benefit")
    .select("id, name, benefit_type")
    .eq("active", true)
    .order("name");

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-svc-heading text-3xl font-bold">SVC admin</h1>
        <p className="mt-1 text-sm text-svc-ink/60">Signed in as {admin.email}</p>

        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["/admin/members", "Members"],
            ["/admin/partners", "Partners"],
            ["/admin/packages", "Packages"],
            ["/admin/payouts", "Payouts"],
            ["/admin/referrals", "Referrals and fraud"],
            ["/admin/demand", "Demand"],
            ["/admin/draws", "Draws"],
          ].map(([path, label]) => (
            <AdminNavLink key={path} path={path} label={label} />
          ))}
        </nav>

        {(params.issued || params.uploaded || params.error) && (
          <p className="mt-4 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            {params.issued !== undefined &&
              `Issue run complete: ${params.issued} benefits issued, ${params.emailed ?? 0} members emailed.`}
            {params.uploaded !== undefined && ` Coupon file saved with ${params.uploaded} codes.`}
            {params.error === "notfound" && "No member matches that cell number or email."}
            {params.error === "query" && "Type a cell number or an email to search."}
            {params.error === "benefit" && "Pick which benefit the coupon file belongs to."}
            {params.error &&
              !["notfound", "query", "benefit"].includes(params.error) &&
              ` Something failed: ${params.error}.`}
          </p>
        )}

        <section className="mt-8 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Find a member</h2>
          <form action={findMember} className="mt-3 flex gap-2">
            <input
              name="query"
              type="text"
              placeholder="Cell number or email"
              className={`${svcInput} flex-1`}
            />
            <button
              type="submit"
              className="inline-flex min-h-12 shrink-0 items-center justify-center bg-svc-green px-5 text-sm font-semibold text-white hover:bg-svc-ink"
            >
              Open ledger
            </button>
          </form>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">This month&apos;s coupon file</h2>
          <p className="mt-2 text-sm leading-relaxed text-svc-ink/75">
            The manual import path: pick the benefit, paste the codes one per
            line (or none, for packs without unique codes), and the issue run
            hands them to members. Uploading again for the same benefit and
            month adds codes to the same file.
          </p>
          <form action={uploadCoupons} className="mt-4 space-y-4">
            <div>
              <label htmlFor="benefit" className={svcLabel}>Benefit</label>
              <select id="benefit" name="benefit" required className={`mt-2 ${svcInput}`}>
                <option value="">Choose the benefit</option>
                {(benefits ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.benefit_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="period" className={svcLabel}>Month (first day)</label>
              <input
                id="period"
                name="period"
                type="text"
                defaultValue={periodFor()}
                pattern="\d{4}-\d{2}-01"
                className={`mt-2 ${svcInput}`}
              />
            </div>
            <div>
              <label htmlFor="codes" className={svcLabel}>Codes, one per line (optional)</label>
              <textarea id="codes" name="codes" rows={6} className={`mt-2 ${svcInput} font-mono`} />
            </div>
            <div>
              <label htmlFor="note" className={svcLabel}>Note for the record</label>
              <input id="note" name="note" type="text" className={`mt-2 ${svcInput}`} />
            </div>
            <button type="submit" className={svcBtnGreen}>
              Save coupon file
            </button>
          </form>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">The issue run</h2>
          <p className="mt-2 text-sm leading-relaxed text-svc-ink/75">
            Runs by itself every morning (new month on the 1st, catch-up for
            new members daily). This button is the same run, on demand, and
            it is safe to press twice: nobody is ever issued the same benefit
            twice in a month.
          </p>
          <form action={triggerIssueRun} className="mt-4">
            <button type="submit" className={svcBtnGreen}>
              Run the issue now
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
