import { MoxiePage } from "@/components/emag/Page";
import type { Asset, RenderedPage } from "@/lib/emag/types";
import july from "@/lib/emag/fixtures/july-2026.json";

// One rebuilt page on its own, at whatever scale is asked for.
//
// The side-by-side screen is for judging the two against each other. This
// one is for looking closely at a single page: at zoom 1 it is A4 at true
// CSS size, which is the only way to see whether the type is the right
// size rather than merely the right shape.
//
//   /rebuild/0?zoom=1     the Think opener at full size
//   /rebuild/2?zoom=0.6   the personality opener, fitted to a laptop
//
// It exists for the same reason the comparison screen does, and it will
// stay useful after that one is retired: a publisher checking one page
// before approving it wants exactly this view.

export const metadata = { title: "Moxie page", robots: { index: false } };

// The imprint as July printed it. Fixed rather than read from settings,
// because this screen compares against a published page and must not move
// when the settings do.
const JULY_IMPRINT = { site: "moxiemag.co.za", credit: "A Smart Value Club Publication" };

const assets = july.assets as Asset[];
const pages = july.pages as unknown as RenderedPage[];

export default async function MoxieSinglePage({
  params,
  searchParams,
}: {
  params: Promise<{ index: string }>;
  searchParams: Promise<{ zoom?: string }>;
}) {
  const { index } = await params;
  const { zoom } = await searchParams;

  const page = pages[Number(index)];
  if (!page) {
    return <main style={{ padding: 32, fontFamily: "sans-serif" }}>No page {index}.</main>;
  }

  // Clamped rather than trusted. A zoom of 40 would try to lay out a
  // 24-metre page and hang the browser.
  const parsed = Number(zoom);
  const scale = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 3) : 1;

  return (
    <main
      className="mx"
      style={{ background: "#e9e6e1", minHeight: "100vh", padding: 0 }}
    >
      <div className="mx-sheet" style={{ ["--mx-zoom" as string]: scale, boxShadow: "none" }}>
        <MoxiePage page={page} assets={assets} imprint={JULY_IMPRINT} />
      </div>
    </main>
  );
}
