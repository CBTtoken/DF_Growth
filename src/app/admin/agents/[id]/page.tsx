import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { markCommissionApprovedToPay, markCommissionPaid } from "@/app/admin/agents/actions";
import { getAgentReferralLink } from "@/lib/agents/referral-cookie";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Sec 8: "Per-agent detail page: their referral list..., their full
// commission ledger..., and the payout action from section 7." The payout
// action itself is manual/ledger-driven only (Sec 7) — no Transfers API
// call happens from this page, that's explicitly out of scope until
// Sprint 2, and even then stays operator-triggered, never automatic.
export default async function AdminAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const { id } = await params;
  const admin = createAdminClient();

  const { data: agent } = await admin
    .from("agents")
    .select("id, full_name, email, whatsapp_number, status, referral_code, created_at, approved_at, comped_client_id")
    .eq("id", id)
    .maybeSingle();

  if (!agent) notFound();

  let compedPageSlug: string | null = null;
  if (agent.comped_client_id) {
    const { data: compedClient } = await admin
      .from("growth_clients")
      .select("slug")
      .eq("id", agent.comped_client_id)
      .maybeSingle();
    compedPageSlug = compedClient?.slug ?? null;
  }

  const { data: referredClients } = await admin
    .from("growth_clients")
    .select("id, business_name, plan, billing_cycle, status, created_at")
    .eq("referred_by_agent_id", id)
    .order("created_at", { ascending: false });

  const { data: ledger } = await admin
    .from("commission_ledger")
    .select("id, referred_client_id, period_year, rate_applied, amount_due, status, paystack_transfer_reference, paid_at, created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: false });

  const clientNameById = new Map((referredClients ?? []).map((c) => [c.id, c.business_name]));

  const totalUnpaid = (ledger ?? [])
    .filter((l) => l.status !== "paid")
    .reduce((sum, l) => sum + Number(l.amount_due), 0);
  const totalPaid = (ledger ?? []).filter((l) => l.status === "paid").reduce((sum, l) => sum + Number(l.amount_due), 0);

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <BrandHeader />

        <div className="flex flex-col gap-1">
          <Link href="/admin/agents" className="text-xs font-semibold text-brand hover:underline">
            ← All agents
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{agent.full_name}</h1>
          <p className="text-sm text-gray-500">
            {agent.email} · {agent.whatsapp_number}
          </p>
          {agent.referral_code && (
            <p className="text-sm text-gray-500">
              Referral link: <span className="font-medium text-gray-700">{getAgentReferralLink(agent.referral_code)}</span>
            </p>
          )}
          <p className="text-sm text-gray-500">
            Comped page:{" "}
            {compedPageSlug ? (
              <a
                href={`${process.env.NEXT_PUBLIC_SITE_URL}/${compedPageSlug}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand hover:underline"
              >
                View page ↗
              </a>
            ) : (
              <span className="text-gray-400">Not set up yet</span>
            )}
          </p>
        </div>

        <section className="flex flex-wrap gap-4">
          <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Total unpaid</p>
            <p className="text-xl font-bold text-ink">R{totalUnpaid.toFixed(2)}</p>
          </div>
          <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Total paid to date</p>
            <p className="text-xl font-bold text-ink">R{totalPaid.toFixed(2)}</p>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Referrals ({referredClients?.length ?? 0})</h2>
          {!referredClients || referredClients.length === 0 ? (
            <p className="text-sm text-gray-500">No referrals attributed yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {referredClients.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="font-medium text-gray-900">{c.business_name}</span>
                  <span className="text-gray-500">
                    {c.plan} · {c.billing_cycle}
                  </span>
                  <span className="text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Commission ledger ({ledger?.length ?? 0})</h2>
          {!ledger || ledger.length === 0 ? (
            <p className="text-sm text-gray-500">No commission earned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4">Referral</th>
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Rate</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">
                        {clientNameById.get(l.referred_client_id) ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">{l.period_year}</td>
                      <td className="py-2.5 pr-4 text-gray-500">{l.rate_applied}%</td>
                      <td className="py-2.5 pr-4 text-gray-500">R{Number(l.amount_due).toFixed(2)}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            l.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : l.status === "approved_to_pay"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {l.status === "pending" && (
                          <form action={markCommissionApprovedToPay.bind(null, l.id, agent.id)}>
                            <button type="submit" className="text-xs font-semibold text-brand hover:underline">
                              Approve to pay
                            </button>
                          </form>
                        )}
                        {l.status === "approved_to_pay" && (
                          <form
                            action={async (formData: FormData) => {
                              "use server";
                              await markCommissionPaid(l.id, agent.id, String(formData.get("reference") ?? ""));
                            }}
                            className="flex items-center justify-end gap-2"
                          >
                            <input
                              type="text"
                              name="reference"
                              placeholder="Transfer reference"
                              className="w-32 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                            />
                            <button type="submit" className="text-xs font-semibold text-brand hover:underline">
                              Mark paid
                            </button>
                          </form>
                        )}
                        {l.status === "paid" && l.paystack_transfer_reference && (
                          <span className="text-xs text-gray-400">{l.paystack_transfer_reference}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
