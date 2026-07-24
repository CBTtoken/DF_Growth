import type { ReactNode } from "react";
import { ReviewSubmissionForm } from "@/components/reviews/ReviewSubmissionForm";
import type { TemplateAnchor } from "@/lib/templates/anchors";
import {
  HEADING_FONT_CLASS,
  EYEBROW_STYLE_CLASS,
  SPACING_CLASS,
  CARD_RECIPE_CLASS,
  SURFACE_SECTION_CLASS,
  SURFACE_BORDER_CLASS,
  SURFACE_HEADING_CLASS,
} from "@/lib/templates/anchors";

export type PublicReview = {
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
// Sprint 2 fast-follow: now participates in the per-template dynamic
// eyebrow-numbering system like every other section (src/lib/templates/
// registry.ts) — always present in every template's `sections` list,
// matching the fixed "right before the lead form" position it already had
// before this, just with a real number now instead of none.
//
// Performance pass, 2026-07-18: used to run its own query here, on top of
// an identical (aggregate-only) query ClientLandingPageView.tsx already ran
// for the same business's SEO structured data — two sequential Supabase
// round trips for overlapping data on every single client-page render, a
// real and measurable chunk of the ~1.8s cache-MISS TTFB Dewald flagged.
// Now takes the already-fetched list as a prop instead — one fetch, folded
// into the page's single combined query, serves both this display and that
// aggregate.
export function ReviewsSection({
  businessId,
  reviews,
  accentColor,
  eyebrowNumber,
  anchor,
}: {
  businessId: string;
  reviews: PublicReview[];
  accentColor: string;
  eyebrowNumber: string;
  anchor?: TemplateAnchor;
}) {
  const list = reviews;
  const count = list.length;
  const average = count > 0 ? list.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  if (!anchor) {
    return (
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
          <p
            className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base"
            style={{ color: accentColor }}
          >
            {eyebrowNumber} — Reviews
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

  const isDark = anchor.sectionSurface === "dark";
  const headingClass = `${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`;
  const layout = anchor.reviewsLayout ?? "list-detail";

  const reviewCard = (r: PublicReview): ReactNode => (
    <div key={r.id} className={`p-5 ${CARD_RECIPE_CLASS[anchor.cardRecipe]}`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${isDark ? "text-white" : "text-ink"}`}>
          {r.reviewer_accounts?.display_name ?? "A customer"}
        </span>
        <span style={{ color: accentColor }}>{"★".repeat(r.rating)}</span>
      </div>
      <p className={`mt-2 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{r.review_text}</p>
      <p className={`mt-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        {new Date(r.created_at).toLocaleDateString()}
      </p>
      {r.business_reply && (
        <div className={`mt-3 rounded-xl p-3 text-sm ${isDark ? "bg-black/30 text-gray-300" : "bg-white text-gray-600"}`}>
          <span className={`font-semibold ${isDark ? "text-white" : "text-ink"}`}>Business reply: </span>
          {r.business_reply}
        </div>
      )}
    </div>
  );

  let body: ReactNode;

  if (layout === "hero-stat") {
    // social-proof anchor: the rating is the visual centerpiece (a large
    // centered stat), with the top reviews shown directly rather than
    // tucked behind a details toggle — reviews are this anchor's whole
    // point, not a supporting section.
    const featured = list.slice(0, 4);
    const rest = list.slice(4);
    body = (
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        {count > 0 ? (
          <>
            <span className={`text-6xl font-bold ${headingClass}`}>{average.toFixed(1)}</span>
            <span className="text-2xl" style={{ color: accentColor }}>
              {"★".repeat(Math.round(average))}
            </span>
            <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Based on {count} review{count === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No reviews yet — be the first.</p>
        )}
        <div className="mt-2">
          <ReviewSubmissionForm businessId={businessId} accentColor={accentColor} />
        </div>

        {featured.length > 0 && (
          <div className="mt-8 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
            {featured.map((r) => reviewCard(r))}
          </div>
        )}

        {rest.length > 0 && (
          <details className="mt-4 w-full text-left">
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: accentColor }}>
              Read all {count} reviews
            </summary>
            <div className="mt-4 flex flex-col gap-4">{rest.map((r) => reviewCard(r))}</div>
          </details>
        )}
      </div>
    );
  } else {
    body = (
      <>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          {count > 0 ? (
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${headingClass}`}>{average.toFixed(1)}</span>
              <div className="flex flex-col">
                <span style={{ color: accentColor }}>{"★".repeat(Math.round(average))}</span>
                <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {count} review{count === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No reviews yet — be the first.</p>
          )}
          <ReviewSubmissionForm businessId={businessId} accentColor={accentColor} />
        </div>

        {count > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: accentColor }}>
              Read reviews
            </summary>
            <div className="mt-4 flex flex-col gap-4">{list.map((r) => reviewCard(r))}</div>
          </details>
        )}
      </>
    );
  }

  return (
    <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}>
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
          {eyebrowNumber} — Reviews
        </p>

        {body}
      </div>
    </section>
  );
}
