import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { loadBizUpAdminMetrics } from "@/lib/bizup/admin-metrics";
import { formatZar } from "@/lib/bizup/money";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { Table, TableHeadRow, Th, Tr, Td } from "@/components/ui/Table";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// KatisoBiz's numbers, for Dewald, without anyone having to query the
// database on his behalf.
//
// Same allowlist gate and the same real 403 as the rest of /admin: a
// scripted request must not get a 200 that tells it the route exists.

function Tile({
  label,
  value,
  sub,
  tone = "normal",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "normal" | "good" | "warn";
}) {
  const border =
    tone === "good" ? "border-green-200 bg-green-50" : tone === "warn" ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${border}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default async function BizUpAdminPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const m = await loadBizUpAdminMetrics();

  // Sec 16's stated trigger for abandoning the volume cap model: more than
  // half of cap-hitters going dormant rather than upgrading. Surfaced as a
  // judgement rather than two raw numbers, because the whole point of the
  // metric is the comparison between them.
  const capHitters = m.capPressure.capHittersGoneDormant + m.capPressure.capHittersUpgraded;
  const dormantSharePct =
    capHitters === 0 ? null : Math.round((m.capPressure.capHittersGoneDormant / capHitters) * 100);

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <BrandHeader />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">KatisoBiz</h1>
            <p className="mt-1 text-sm text-gray-500">
              Everything as at right now. Nothing here is cached.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand"
          >
            Growth admin
          </Link>
        </div>

        {/* 1. Is anybody using it? Deliberately first, and deliberately not
            signups: a signup that never sends a document is worth nothing,
            and leading with signups encourages the wrong optimisation. */}
        <section>
          <h2 className="text-sm font-semibold text-ink">Are people actually using it</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label="Activated"
              value={m.activation.activationRatePct === null ? "No members yet" : `${m.activation.activationRatePct}%`}
              sub={`${m.activation.activated} of ${m.members.total} have sent something`}
              tone={m.activation.activationRatePct !== null && m.activation.activationRatePct < 40 ? "warn" : "good"}
            />
            <Tile
              label="Never sent anything"
              value={String(m.activation.neverSent)}
              sub="Signed up, produced nothing"
              tone={m.activation.neverSent > m.activation.activated ? "warn" : "normal"}
            />
            <Tile
              label="Active last 30 days"
              value={String(m.activation.activeLast30)}
              sub="Issued at least one document"
            />
            <Tile
              label="Documents this month"
              value={String(m.documents.issuedThisMonth)}
              sub={`${m.documents.issuedTotal} all time`}
            />
          </div>
        </section>

        {/* 2. Is anybody paying */}
        <section>
          <h2 className="text-sm font-semibold text-ink">Money</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label="Monthly recurring"
              value={formatZar(m.revenue.mrrCents)}
              sub="From members paying KatisoBiz directly"
            />
            <Tile
              label="Collected this month"
              value={formatZar(m.revenue.collectedThisMonthCents)}
              sub={`Including ${m.revenue.topupsThisMonth} topups`}
            />
            <Tile
              label="Paying members"
              value={String(m.members.byPlan.paid + m.members.byPlan.unlimited)}
              sub={`${m.members.byPlan.paid} on R49, ${m.members.byPlan.unlimited} on R89`}
            />
            <Tile
              label="Included with Growth"
              value={String(m.members.bundled)}
              sub="Not counted in the recurring figure"
            />
          </div>
        </section>

        {/* 3. Spec Sec 16's committed metric */}
        <section>
          <h2 className="text-sm font-semibold text-ink">Is the free cap working</h2>
          <p className="mt-1 text-xs text-gray-500">
            The build spec commits to watching this from launch. If more than half of the members
            who hit the cap go quiet rather than upgrade, the volume cap is the wrong model and the
            decision was to change it.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Tile
              label="Free members at their cap"
              value={String(m.capPressure.freeMembersAtCap)}
              sub="Used all 10 this month"
            />
            <Tile
              label="Hit the cap, then went quiet"
              value={String(m.capPressure.capHittersGoneDormant)}
              sub="Nothing sent in 30 days"
              tone={dormantSharePct !== null && dormantSharePct > 50 ? "warn" : "normal"}
            />
            <Tile
              label="Hit the cap, then paid"
              value={String(m.capPressure.capHittersUpgraded)}
              sub={
                dormantSharePct === null
                  ? "Nobody has hit the cap yet"
                  : `${dormantSharePct}% went quiet instead of upgrading`
              }
              tone={dormantSharePct !== null && dormantSharePct <= 50 ? "good" : "normal"}
            />
          </div>
        </section>

        {/* 4. Who they are, so any number above can be checked by hand */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">
              Members ({m.members.total}, {m.members.newThisMonth} new this month)
            </h2>
            {/* A plain anchor on purpose. This points at a route handler
                that returns a file, not a page. next/link would try to
                client-navigate to it and the download would never start. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/admin/bizup/csv"
              className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
            >
              Download as CSV
            </a>
          </div>

          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeadRow>
                <Th>Business</Th>
                <Th>Plan</Th>
                <Th>Joined</Th>
                <Th>Docs, month</Th>
                <Th>Docs, total</Th>
                <Th>Last sent</Th>
              </TableHeadRow>
              <tbody>
                {m.members_list.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <span className="block font-medium text-ink">{row.businessName}</span>
                      <span className="block text-xs text-gray-500">
                        {row.email}
                        {row.isVatVendor && " · VAT vendor"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-medium text-ink">
                        {row.plan === "free" ? "Free" : row.plan === "paid" ? "R49" : "R89"}
                      </span>
                      {row.planSource !== "self_paid" && (
                        <span className="block text-xs text-gray-500">via Growth</span>
                      )}
                    </Td>
                    <Td>{row.createdAt}</Td>
                    <Td>{row.documentsThisMonth}</Td>
                    <Td>{row.documentsTotal}</Td>
                    <Td>
                      {row.lastDocumentAt ?? (
                        <span className="text-amber-700">Never</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          {m.members_list.length === 0 && (
            <p className="mt-3 rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
              No KatisoBiz members yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
