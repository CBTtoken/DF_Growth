import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { approveAgent, rejectAgent } from "@/app/admin/agents/actions";
import { getAgentReferralLink } from "@/lib/agents/referral-cookie";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const PROMOTION_LABELS: Record<string, string> = {
  facebook_only: "Mainly Facebook posts",
  beyond_facebook: "Beyond Facebook",
  both: "Both",
};

// Sec 8: "List of all agents: name, status, referral count, current tier,
// total unpaid commission, total paid to date." Referral count and tier
// are both computed from commission_ledger (Sec 6: an agent's tier is
// their count of ever-converted *paying* referrals, not every attributed
// signup) — a distinct referred_client_id in the ledger is exactly that,
// since a ledger row only ever gets created after a successful payment.
export default async function AdminAgentsPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();

  const { data: agents } = await admin
    .from("agents")
    .select(
      "id, full_name, email, whatsapp_number, facebook_page_url, understands_facebook_rules, can_generate_content, promotion_method, status, referral_code, created_at"
    )
    .order("created_at", { ascending: false });

  const agentIds = (agents ?? []).map((a) => a.id);
  const { data: ledgerRows } = await admin
    .from("commission_ledger")
    .select("agent_id, referred_client_id, amount_due, status")
    .in("agent_id", agentIds.length ? agentIds : ["00000000-0000-0000-0000-000000000000"]);

  const statsByAgent = new Map<
    string,
    { referredClients: Set<string>; unpaid: number; paid: number }
  >();
  for (const row of ledgerRows ?? []) {
    const entry = statsByAgent.get(row.agent_id) ?? { referredClients: new Set(), unpaid: 0, paid: 0 };
    entry.referredClients.add(row.referred_client_id);
    if (row.status === "paid") entry.paid += Number(row.amount_due);
    else entry.unpaid += Number(row.amount_due);
    statsByAgent.set(row.agent_id, entry);
  }

  const pending = (agents ?? []).filter((a) => a.status === "pending");
  const reviewed = (agents ?? []).filter((a) => a.status !== "pending");


  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <BrandHeader />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Agents</h1>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Pending applications ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing waiting on review.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {pending.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">{a.full_name}</span>
                    <span className="text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-gray-500">{a.email} · {a.whatsapp_number}</div>
                  <a href={a.facebook_page_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    {a.facebook_page_url}
                  </a>
                  <div className="text-gray-600">
                    <span className="font-medium text-gray-800">Promotion: </span>
                    {PROMOTION_LABELS[a.promotion_method] ?? a.promotion_method}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium text-gray-800">Understands Facebook rules: </span>
                    {a.understands_facebook_rules}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium text-gray-800">Can generate content: </span>
                    {a.can_generate_content}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <form action={approveAgent.bind(null, a.id)}>
                      <button
                        type="submit"
                        className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectAgent.bind(null, a.id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">All agents ({reviewed.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Referrals</th>
                  <th className="py-2 pr-4">Tier</th>
                  <th className="py-2 pr-4">Unpaid</th>
                  <th className="py-2 pr-4">Paid to date</th>
                  <th className="py-2 pr-4">Referral link</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {reviewed.map((a) => {
                  const stats = statsByAgent.get(a.id);
                  const referralCount = stats?.referredClients.size ?? 0;
                  const tier = referralCount > 10 ? "40%" : "25%";
                  return (
                    <tr key={a.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{a.full_name}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            a.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">{referralCount}</td>
                      <td className="py-2.5 pr-4 text-gray-500">{a.status === "approved" ? tier : "—"}</td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {stats && stats.unpaid > 0 ? `R${stats.unpaid.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {stats && stats.paid > 0 ? `R${stats.paid.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {a.referral_code ? getAgentReferralLink(a.referral_code) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <Link href={`/admin/agents/${a.id}`} className="text-xs font-semibold text-brand hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
