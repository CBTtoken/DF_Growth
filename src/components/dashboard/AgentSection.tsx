import type { AgentDashboardData } from "@/lib/agents/dashboard-data";
import { Card } from "@/components/ui/Card";

// Sec 9: "Agent" dashboard section, only rendered when the logged-in user
// has an approved agents row (dashboard/page.tsx's own guard). Shows
// their referral link, running totals, current tier, and — the real
// follow-up ask this section exists to answer — per-referral status
// (converted/paid or still just signed up) and an approximate renewal
// date, so an agent can see who to actually follow up with.
export function AgentSection({ data }: { data: AgentDashboardData }) {
  const nextTierGap = data.currentTier === 25 ? 11 - data.totalReferrals : null;

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-bold tracking-tight text-ink">Your agent referrals</h2>

      <div className="flex flex-col gap-1 rounded-xl bg-brand/5 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">Your referral link</span>
        <a href={data.referralLink} className="break-all text-sm font-medium text-brand hover:underline">
          {data.referralLink}
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Referrals</p>
          <p className="text-lg font-bold text-ink">{data.totalReferrals}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Current tier</p>
          <p className="text-lg font-bold text-ink">{data.currentTier}%</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total earned</p>
          <p className="text-lg font-bold text-ink">R{data.totalEarned.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Still owed</p>
          <p className="text-lg font-bold text-ink">R{data.totalOwed.toFixed(2)}</p>
        </div>
      </div>

      {nextTierGap !== null && nextTierGap > 0 && (
        <p className="text-xs font-medium text-brand">
          {nextTierGap} more converted {nextTierGap === 1 ? "referral" : "referrals"} and you move to 40% —
          including on your existing referrals&apos; renewals.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Your referrals ({data.referrals.length})</h3>
        {data.referrals.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nobody&apos;s signed up through your link yet — share it to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Business</th>
                  <th className="py-2 pr-4">Signed up</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Renews</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.clientId} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{r.businessName}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{new Date(r.signupDate).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.hasConverted ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {r.hasConverted ? "Paid" : "Signed up, not paid yet"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {r.approxRenewalDate ? new Date(r.approxRenewalDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
