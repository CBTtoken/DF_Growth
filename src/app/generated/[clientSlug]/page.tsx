import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { GeneratedPage } from "@/components/generated/GeneratedPage";
import { ComposedPage } from "@/components/generated/ComposedPage";
import { pagePlanSchema, collectPhotoSlots, type PagePlan } from "@/lib/generated-page/schema";
import { composedPlanSchema, collectComposedSlots, type ComposedPlan } from "@/lib/generated-page/composed-schema";

// Proof-of-concept preview for the generated-page architecture, both tiers.
// Reads plans from disk rather than the database because they are still being
// tuned and being able to diff them matters more than where they live.
//
// noindex, and no live page is affected by anything here.
export const dynamic = "force-static";
export const metadata = { robots: { index: false, follow: false } };

type Sample = {
  slug: string;
  tier: "sections" | "composed";
  businessName: string;
  brandColor: string | null;
  photoUrls?: string[];
  /** Analysed photographs the member already has, keyed by photoId. */
  photoIndex?: Record<string, { url: string; description: string; focalPoint: string }>;
  generatedAt: string;
  plan: PagePlan | ComposedPlan;
};

const SAMPLES_DIR = path.join(process.cwd(), "src/lib/generated-page/samples");

function loadSample(slug: string): Sample | null {
  try {
    const raw = JSON.parse(readFileSync(path.join(SAMPLES_DIR, `${slug}.json`), "utf8"));
    const schema = raw.tier === "composed" ? composedPlanSchema : pagePlanSchema;
    const plan = schema.safeParse(raw.plan);
    if (!plan.success) return null;
    return { ...raw, plan: plan.data };
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  try {
    return readdirSync(SAMPLES_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ clientSlug: f.replace(/\.json$/, "") }));
  } catch {
    return [];
  }
}

export default async function GeneratedPreview({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const sample = loadSample(clientSlug);
  if (!sample) return notFound();

  const composed = sample.tier === "composed";
  const slots = composed
    ? collectComposedSlots(sample.plan as ComposedPlan)
    : collectPhotoSlots(sample.plan as PagePlan);

  // The member's existing photographs have no per-image descriptions yet, so
  // they map onto the requested slots in upload order. Proper matching, with
  // a description per photograph, is Handoff 03's job.
  const photos: Record<string, string> = {};
  (sample.photoUrls ?? []).forEach((url, i) => {
    const slot = slots[i];
    if (slot) photos[slot.slotId] = url;
  });

  const placed = Object.keys(sample.photoIndex ?? {}).length;
  const filled = Object.keys(photos).length + placed;

  return (
    <>
      {/* Review strip. Not part of the design, just what a reviewer needs. */}
      <div className="bg-ink px-5 py-4 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <strong className="text-base">{sample.businessName}</strong>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
              {composed ? "photo-led, composed layout" : "no photos, prepared sections"}
            </span>
            <span className="opacity-70">{sample.plan.palette}</span>
            <span className="opacity-70">{sample.plan.typePairing}</span>
            <span className="opacity-70">{sample.plan.sections.length} sections</span>
            <span className="opacity-70">
              {placed} photos placed, {slots.length} more requested
            </span>
            <a href={`/${sample.slug}`} className="underline underline-offset-2">
              compare with current page
            </a>
          </div>
          <p className="opacity-70">{sample.plan.rationale}</p>
        </div>
      </div>

      {composed ? (
        <ComposedPage
          plan={sample.plan as ComposedPlan}
          brandColor={sample.brandColor}
          photos={photos}
          photoIndex={sample.photoIndex}
        />
      ) : (
        <GeneratedPage plan={sample.plan as PagePlan} brandColor={sample.brandColor} photos={photos} />
      )}
    </>
  );
}
