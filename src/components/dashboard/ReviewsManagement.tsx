import { replyToReview, flagReviewAsBusiness } from "@/app/dashboard/reviews-actions";

export type DashboardReview = {
  id: string;
  rating: number;
  review_text: string;
  business_reply: string | null;
  flagged_by: "business" | "system" | null;
  flagged_reason: string | null;
  created_at: string;
  reviewer_accounts: { display_name: string } | null;
};

// Rate & Review Sprint 2, Sec 6: "list of all reviews on their page,
// including flagged ones with status visible... one public reply per
// review, editable after posting... flag for review action, requires a
// short reason." Plain <form action={...}> per review, no client component
// needed — matches the rest of this dashboard's pattern for simple writes
// (e.g. AddTestimonialForm, the "Mark read" toggle on the admin Support
// page) and works without JS.
export function ReviewsManagement({ reviews }: { reviews: DashboardReview[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Reviews ({reviews.length})</h2>
        <p className="mt-1 text-sm text-gray-500">
          You can reply publicly to any review, but you can&apos;t edit or remove one yourself — if a review looks
          fake or abusive, flag it and our team will take a look.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-gray-900">{r.reviewer_accounts?.display_name ?? "A customer"}</span>
              <span className="text-brand">{"★".repeat(r.rating)}</span>
            </div>
            <p className="mt-2 text-sm text-gray-700">{r.review_text}</p>
            <p className="mt-1 text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>

            {r.flagged_by && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Flagged{r.flagged_by === "business" ? " by you" : ""} — pending review by our team.
              </p>
            )}

            {r.business_reply ? (
              <div className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-600">
                <span className="font-semibold text-ink">Your reply: </span>
                {r.business_reply}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-brand">Edit reply</summary>
                  <form action={replyToReview.bind(null, r.id)} className="mt-2 flex flex-col gap-2">
                    <textarea
                      name="replyText"
                      defaultValue={r.business_reply}
                      rows={2}
                      className="rounded-lg border border-gray-200 p-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                    >
                      Update reply
                    </button>
                  </form>
                </details>
              </div>
            ) : (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-brand">Reply publicly</summary>
                <form action={replyToReview.bind(null, r.id)} className="mt-2 flex flex-col gap-2">
                  <textarea
                    name="replyText"
                    rows={2}
                    placeholder="Thank you for your feedback..."
                    className="rounded-lg border border-gray-200 p-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                  >
                    Post reply
                  </button>
                </form>
              </details>
            )}

            {!r.flagged_by && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-600">
                  Flag for review
                </summary>
                <form action={flagReviewAsBusiness.bind(null, r.id)} className="mt-2 flex flex-col gap-2">
                  <textarea
                    name="reason"
                    rows={2}
                    placeholder="Why do you think this review isn't genuine?"
                    className="rounded-lg border border-gray-200 p-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="self-start rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
                  >
                    Flag for admin review
                  </button>
                </form>
              </details>
            )}
          </li>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-gray-400">No reviews yet — they&apos;ll show up here as customers leave them.</p>
        )}
      </ul>
    </section>
  );
}
