import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { clearReviewFlag, removeReview } from "@/app/admin/reviews/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type FlaggedReview = {
  id: string;
  rating: number;
  review_text: string;
  flagged_by: "business" | "system" | null;
  flagged_reason: string | null;
  flagged_at: string | null;
  created_at: string;
  growth_clients: { business_name: string } | null;
  reviewer_accounts: { display_name: string } | null;
};

// Rate & Review Sprint 2, Sec 3: "every flagged review... lands here for a
// human decision: keep, remove, or dismiss the flag." Reuses the admin
// Support page's exact layout pattern (allowlist gate, BrandHeader, card
// list) — same shape of problem, a small queue of things a human needs to
// look at and act on.
export default async function AdminReviewsPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();
  const { data: reviews } = await admin
    .from("reviews")
    .select(
      "id, rating, review_text, flagged_by, flagged_reason, flagged_at, created_at, growth_clients(business_name), reviewer_accounts(display_name)"
    )
    .not("flagged_by", "is", null)
    .order("flagged_at", { ascending: true });

  const list = (reviews ?? []) as unknown as FlaggedReview[];

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Flagged reviews</h1>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {list.length} pending
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {list.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{r.growth_clients?.business_name ?? "Unknown business"}</p>
                  <p className="text-sm text-gray-500">
                    Review by {r.reviewer_accounts?.display_name ?? "a customer"} · {"★".repeat(r.rating)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold uppercase text-amber-700">
                  Flagged by {r.flagged_by}
                </span>
              </div>

              <p className="rounded-xl bg-white p-4 text-sm text-gray-700">{r.review_text}</p>

              {r.flagged_reason && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-ink">Reason: </span>
                  {r.flagged_reason}
                </p>
              )}

              <p className="text-xs text-gray-400">
                Left {new Date(r.created_at).toLocaleString()}
                {r.flagged_at && ` · Flagged ${new Date(r.flagged_at).toLocaleString()}`}
              </p>

              <div className="flex flex-wrap gap-3">
                <form action={clearReviewFlag.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-gray-400"
                  >
                    Keep / dismiss flag
                  </button>
                </form>
                <form action={removeReview.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Remove review
                  </button>
                </form>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-400 shadow-sm">
              Nothing flagged right now.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
