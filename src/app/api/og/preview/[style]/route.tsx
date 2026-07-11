import { ImageResponse } from "next/og";
import { renderCard, type AssetStyleId } from "@/lib/assets/styles";

export const runtime = "edge";

const SAMPLE = {
  quote: "Came out within the hour on a Sunday. Lifesavers.",
  authorName: "Sarah M.",
  businessName: "Thabo's Plumbing Co.",
  rating: 5,
  primaryColor: "#1081b8",
  secondaryColor: "#ffffff",
};

// Real, live-rendered previews for the asset-style picker (dashboard),
// same sample-data approach as the landing page templates' /preview
// route, so a client sees an actual generated image before choosing.
export async function GET(request: Request, { params }: { params: Promise<{ style: string }> }) {
  const { style } = await params;
  const validStyles: AssetStyleId[] = ["clean", "bold-quote", "star-card", "mono-badge"];
  const resolvedStyle = validStyles.includes(style as AssetStyleId) ? (style as AssetStyleId) : "clean";

  return new ImageResponse(renderCard(resolvedStyle, SAMPLE), { width: 1080, height: 1080 });
}
