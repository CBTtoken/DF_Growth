import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewSubmissionForm } from "@/components/reviews/ReviewSubmissionForm";

// Handoff: scripts/handoff-unified-account-and-reviews.md, Job 4.
//
// Where the "leave a review" link points for a KatisoBiz member who has no
// Growth page yet — the review is stored against the KatisoBiz account
// directly (reviews.bizup_account_id) and already shows up on a Growth page
// the moment this account gets linked to one (see the reviews query in
// app/[clientSlug]/page.tsx). No account or password needed to leave one,
// same door as a Growth business page's own review form.
//
// noindex, matching /bizup/d/[token]: reached only via a link the member
// sends themselves, not a page meant for search discovery.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BizUpReviewCapturePage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const admin = createAdminClient();

  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, business_name")
    .eq("id", accountId)
    .maybeSingle();

  if (!account) notFound();

  return (
    <main className="flex flex-1 flex-col items-center bg-gray-50 p-6">
      <div className="flex w-full max-w-md flex-col gap-4 py-10">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-ink">Leave a review for {account.business_name}</h1>
          <p className="mt-1 text-sm text-gray-500">A name, a rating, and what happened. That&rsquo;s it.</p>
        </div>
        <ReviewSubmissionForm target={{ bizupAccountId: account.id }} accentColor="#0f766e" defaultOpen />
      </div>
    </main>
  );
}
