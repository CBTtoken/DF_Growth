import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { clearReviewFlag, removeReview } from "@/app/admin/reviews/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

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
          <StatusPill>{list.length} pending</StatusPill>
        </div>

        <div className="flex flex-col gap-3">
          {list.map((r) => (
            <Card key={r.id} variant="elevated" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{r.growth_clients?.business_name ?? "Unknown business"}</p>
                  <p className="text-sm text-gray-500">
                    Review by {r.reviewer_accounts?.display_name ?? "a customer"} · {"★".repeat(r.rating)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold uppercase text-brand">
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
                  <Button type="submit" variant="secondary" size="md" className="bg-white">
                    Keep / dismiss flag
                  </Button>
                </form>
                <form action={removeReview.bind(null, r.id)}>
                  <Button type="submit" variant="destructive" size="md">
                    Remove review
                  </Button>
                </form>
              </div>
            </Card>
          ))}
          {list.length === 0 && (
            <Card>
              <p className="text-sm text-gray-400">Nothing flagged right now.</p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
