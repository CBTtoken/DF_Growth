import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/board/queries";
import { boardPrice } from "@/lib/board/format";
import { kindLabel } from "@/lib/board/kinds";
import { loadAssetFonts } from "@/lib/assets/fonts";
import { truncateOnWord } from "@/lib/text";

// Acceptance criterion 3: "Sharing to WhatsApp produces a preview card with
// business name, item and price where relevant, not a bare link."
//
// This is the card. Node runtime, not edge, for the same reason as the agent
// route: it needs a Supabase query to resolve the slug, and createAdminClient
// is a node client.
//
// Satori rules that are not optional and have each cost a real render here:
// flexbox only, every element that contains text needs display flex, no
// `inset` shorthand (it is silently dropped, producing a byte-identical
// image with no error), and no CSS filters.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return new Response("Not found", { status: 404 });

  const price = boardPrice(post.priceCents);
  const fonts = await loadAssetFonts();
  const brand = post.member?.brandColor ?? "#1081b8";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#ffffff",
          fontFamily: "Geist",
        }}
      >
        {/* Left half: the photo when there is one, otherwise the member's own
            brand colour with the kind on it. Either way the card is
            deliberate rather than blank. */}
        <div
          style={{
            display: "flex",
            width: 470,
            height: 630,
            flexShrink: 0,
            backgroundColor: brand,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {post.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori renders this, next/image does not exist inside an ImageResponse
            <img
              src={post.photoUrl}
              style={{ width: 470, height: 630, objectFit: "cover" }}
              alt=""
            />
          ) : (
            <div
              style={{
                display: "flex",
                fontFamily: "Barlow Condensed",
                fontSize: 150,
                fontWeight: 700,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              {post.authorName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: 56,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                color: brand,
                textTransform: "uppercase",
              }}
            >
              {kindLabel(post.kind)}
            </div>

            <div
              style={{
                display: "flex",
                fontFamily: "Barlow Condensed",
                fontSize: 68,
                fontWeight: 700,
                lineHeight: 1.02,
                color: "#1c2b3a",
                marginTop: 18,
              }}
            >
              {truncateOnWord(post.title, 72)}
            </div>

            {price && (
              <div
                style={{
                  display: "flex",
                  fontSize: 52,
                  fontWeight: 700,
                  color: "#e8821a",
                  marginTop: 22,
                }}
              >
                {price}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#1c2b3a" }}>
              {truncateOnWord(post.authorName, 34)}
            </div>
            {post.city && (
              <div style={{ display: "flex", fontSize: 24, color: "#4a5568", marginTop: 6 }}>{post.city}</div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 3,
                color: "#718096",
                marginTop: 22,
                textTransform: "uppercase",
              }}
            >
              DigitalFlyer
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
