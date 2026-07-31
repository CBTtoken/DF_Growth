import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewSubmissionForm } from "@/components/reviews/ReviewSubmissionForm";
import { ensureContrast } from "@/lib/color";

// Handoff 01 D: "Keep the review submission route reachable by direct link so
// members can still solicit their first review. Do not advertise emptiness on
// the page."
//
// Before this, the submission form existed only inside ReviewsSection on the
// member's own page, and that section now disappears entirely while a member
// has no reviews. That would have left a member with no reviews no way at all
// to ask for their first one, which is the exact opposite of the intent. This
// is that direct link: one page, one form, nothing else. A member sends it to
// a customer after a job.
//
// Deliberately not linked from the public page. It is a link the member
// shares, not a call to action a visitor stumbles into.
export const dynamic = "force-static";
export const revalidate = 300;

async function getBusiness(clientSlug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_clients")
    .select("id, business_name, brand_primary_color, slug")
    .eq("slug", clientSlug)
    .eq("status", "active")
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}): Promise<Metadata> {
  const { clientSlug } = await params;
  const business = await getBusiness(clientSlug);
  if (!business) return {};
  const title = `Leave a review for ${business.business_name}`;
  return {
    // Absolute for the same reason the member page itself is: this page
    // belongs to the business, not to DigitalFlyer.
    title: { absolute: title },
    description: `Tell others how it went with ${business.business_name}.`,
    // A review link is shared with one customer at a time. It has no business
    // in search results.
    robots: { index: false, follow: false },
  };
}

export default async function LeaveReviewPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const business = await getBusiness(clientSlug);
  if (!business) return notFound();

  const primaryColor = business.brand_primary_color ?? "#1081b8";
  const accentColor = ensureContrast(primaryColor, "#ffffff");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:py-20">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            How was it with {business.business_name}?
          </h1>
          <p className="mt-2 text-base text-gray-600">
            Good day. A short, honest review helps the next customer decide. It takes about a minute.
          </p>
        </div>

        <ReviewSubmissionForm businessId={business.id} accentColor={accentColor} startOpen />

        <p className="text-sm text-gray-500">
          <Link href={`/${business.slug}`} className="font-semibold underline-offset-2 hover:underline">
            Back to {business.business_name}
          </Link>
        </p>
      </div>
    </main>
  );
}
