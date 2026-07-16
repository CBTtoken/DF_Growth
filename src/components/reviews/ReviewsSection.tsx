import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewSubmissionForm } from "@/components/reviews/ReviewSubmissionForm";

type Review = {
  id: string;
  rating: number;
  review_text: string;
  business_reply: string | null;
  created_at: string;
  reviewer_accounts: { display_name: string } | null;
};

// Rate & Review Sprint 1, Sec 5: "Star rating and total review count
// visible immediately... no rating shown at all for a business with no
// reviews yet, avoid implying a bad score where there's simply no data."
// Server Component with its own query rather than threading through the
// parent page's existing Promise.all — reviews start empty for every
// business today, so this doesn't add meaningful cold-start risk the way
// a populated query would; simpler to wire in cleanly as its own unit.
// Deliberately not participating in the per-template dynamic eyebrow-
// numbering system yet (Sec 8 build order lists this as Sprint 1 scope on
// its own) — always renders in the same place, right before the lead
// form, across every template. Folding it into the numbered-section
// system is a reasonable fast-follow, not done here to keep this change
// isolated and easy to verify.
export async function ReviewsSection({ businessId, accentColor }: { businessId: string; accentColor: string }) {
  const admin = createAdminClient();
  const { data: reviews } = await admin
    .from("reviews")
    .select("id, rating, review_text, business_reply, created_at, reviewer_accounts(display_name)")
    .eq("business_id", businessId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const list = (reviews ?? []) as unknown as Review[];
  const count = list.length;
  const average = count > 0 ? list.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
        <p
          className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base"
          style={{ color: accentColor }}
        >
          Reviews
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          {count > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-ink">{average.toFixed(1)}</span>
              <div className="flex flex-col">
                <span style={{ color: accentColor }}>{"★".repeat(Math.round(average))}</span>
                <span className="text-sm text-gray-500">
                  {count} review{count === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No reviews yet — be the first.</p>
          )}
          <ReviewSubmissionForm businessId={businessId} accentColor={accentColor} />
        </div>

        {count > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: accentColor }}>
              Read reviews
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              {list.map((r) => (
                <div key={r.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{r.reviewer_accounts?.display_name ?? "A customer"}</span>
                    <span style={{ color: accentColor }}>{"★".repeat(r.rating)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{r.review_text}</p>
                  <p className="mt-2 text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
                  {r.business_reply && (
                    <div className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-600">
                      <span className="font-semibold text-ink">Business reply: </span>
                      {r.business_reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
