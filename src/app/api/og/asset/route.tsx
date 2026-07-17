import { ImageResponse } from "next/og";
import { renderCard, renderBeforeAfter, type AssetStyleId } from "@/lib/assets/styles";
import type { AssetContentType } from "@/lib/assets/content-types";
import { loadAssetFonts } from "@/lib/assets/fonts";

// Combined spec Sec 25: the generic counterpart to
// /api/og/testimonial/[id] — that route is keyed by a stored testimonial
// row; this one renders directly from whatever content was just typed
// into the new generator form, for the four new content types (special
// offer, announcement, before/after, new arrival), nothing looked up or
// persisted here. POST, not GET, since a before/after submission carries
// two full image URLs plus text — comfortably past a sane query-string
// length. Only ever called server-side, from generateSocialAsset
// (src/app/dashboard/actions.ts), which is what actually enforces the
// caller owns a real account — matches /api/og/testimonial/[id]'s own
// pattern of no auth check on the route itself.
export const runtime = "edge";

type AssetRequestBody = {
  contentType: AssetContentType;
  style: AssetStyleId;
  headline: string;
  subtext: string;
  businessName: string;
  primaryColor: string;
  secondaryColor: string;
  imageUrl?: string | null;
  beforeImageUrl?: string;
  afterImageUrl?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AssetRequestBody;
  const { contentType, style, headline, subtext, businessName, primaryColor, secondaryColor, imageUrl } = body;
  const fonts = await loadAssetFonts();

  if (contentType === "before-after") {
    if (!body.beforeImageUrl || !body.afterImageUrl) {
      return new Response("Missing before/after images", { status: 400 });
    }
    return new ImageResponse(
      renderBeforeAfter({
        beforeImageUrl: body.beforeImageUrl,
        afterImageUrl: body.afterImageUrl,
        businessName,
        headline,
        primaryColor,
        secondaryColor,
      }),
      { width: 1080, height: 1080, fonts }
    );
  }

  return new ImageResponse(
    renderCard(style, { headline, subtext, businessName, rating: null, primaryColor, secondaryColor, imageUrl }),
    { width: 1080, height: 1080, fonts }
  );
}
