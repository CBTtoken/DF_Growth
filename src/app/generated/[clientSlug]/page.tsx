import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { GeneratedPage } from "@/components/generated/GeneratedPage";
import { pagePlanSchema, collectPhotoSlots, type PagePlan } from "@/lib/generated-page/schema";

// Proof-of-concept preview for the generated-page architecture.
//
// Renders a plan produced by scripts/generate-page-plans.mjs so it can be put
// side by side with the same member's current live page. Reads from disk
// rather than the database because the plans are still being tuned and being
// able to diff them matters more than where they live.
//
// noindex, and no live page is affected by anything here.
export const dynamic = "force-static";

type SamplePayload = {
  slug: string;
  businessName: string;
  brandColor: string | null;
  generatedAt: string;
  plan: PagePlan;
};

const SAMPLES_DIR = path.join(process.cwd(), "src/lib/generated-page/samples");

function loadSample(slug: string): SamplePayload | null {
  try {
    const raw = JSON.parse(readFileSync(path.join(SAMPLES_DIR, `${slug}.json`), "utf8"));
    const plan = pagePlanSchema.safeParse(raw.plan);
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

export const metadata = { robots: { index: false, follow: false } };

export default async function GeneratedPreview({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const sample = loadSample(clientSlug);
  if (!sample) return notFound();

  const photoSlots = collectPhotoSlots(sample.plan);

  return (
    <>
      {/* Review strip. Not part of the design, just what a reviewer needs:
          what the model chose, why, and what it is asking the member for. */}
      <div className="bg-ink px-5 py-4 text-white sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <strong className="text-base">{sample.businessName}</strong>
            <span className="opacity-70">palette: {sample.plan.palette}</span>
            <span className="opacity-70">font: {sample.plan.headingFont}</span>
            <span className="opacity-70">{sample.plan.sections.length} sections</span>
            <span className="opacity-70">{photoSlots.length} photos requested</span>
            <a href={`/${sample.slug}`} className="underline underline-offset-2">
              compare with current page
            </a>
          </div>
          <p className="opacity-70">{sample.plan.rationale}</p>
        </div>
      </div>

      <GeneratedPage
        plan={sample.plan}
        businessName={sample.businessName}
        brandColor={sample.brandColor}
      />
    </>
  );
}
