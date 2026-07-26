import { ImageResponse } from "next/og";
import { getLiveAgentPage } from "@/lib/agent-page/data";
import { buildAgentAccent } from "@/lib/agent-page/themes";
import { withAlpha } from "@/lib/color";
import { agentInitials, stackedName } from "@/lib/agent-page/identity";
import { loadAssetFonts } from "@/lib/assets/fonts";

// Agent Programme Phase 1 Sec 1.2: the og:image for an agent page is the
// agent's own photo or generated badge, never the DigitalFlyer logo.
//
// Not edge runtime, unlike /api/og/asset: this needs a Supabase query to
// resolve the slug, and createAdminClient is a node-runtime client.
//
// Satori has no filter or mix-blend-mode support, so the page's duotone
// treatment cannot be reproduced here. Rather than ship a card that looks
// like a different design, the photo is framed the same way (same 4:5
// crop, same rounded frame, same accent field around it) and left in its
// own colour. The framing is what carries the recognition; the duotone is
// what the page itself adds on arrival.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getLiveAgentPage(slug);

  if (!agent) return new Response("Not found", { status: 404 });

  const accent = buildAgentAccent(agent.accentColor);
  const { first, rest } = stackedName(agent.fullName);
  const fonts = await loadAssetFonts();
  // Not the bio. The bio is a paragraph, so at card width it always cut
  // mid-sentence ("I could get people interested in a..."), which reads as
  // a broken preview rather than a short one. The page headline is the
  // promise the page actually makes, it is the same for every agent, and
  // it is always complete.
  const promise = "You are good at what you do. Let me handle the online part.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: accent[950],
          padding: 64,
          gap: 56,
          alignItems: "center",
          fontFamily: "Geist",
        }}
      >
        {/* Same 4:5 frame the page uses, so the card and the page read as
            one thing when a visitor taps through from WhatsApp. */}
        <div
          style={{
            display: "flex",
            width: 344,
            height: 430,
            flexShrink: 0,
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: accent[800],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {agent.photoUrl ? (
            <div style={{ display: "flex", position: "relative", width: 344, height: 430 }}>
              {/* Explicit top/left rather than the `inset` shorthand:
                  Satori parses individual offset properties but silently
                  drops `inset`, which renders an overlay at zero size and
                  produces a byte-identical image with no error at all. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders this, next/image does not exist inside an ImageResponse */}
              <img
                src={agent.photoUrl}
                style={{ position: "absolute", top: 0, left: 0, width: 344, height: 430, objectFit: "cover" }}
                alt=""
              />
              {/* Not the page's duotone, which Satori cannot do, but the
                  same job at lower strength: a scrim in the accent colour
                  so the photo belongs to the card instead of sitting on it
                  as an unrelated snapshot. Kept light enough that the face
                  stays clearly readable at WhatsApp preview size. */}
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 344,
                  height: 430,
                  backgroundColor: withAlpha(accent[950], 0.32),
                }}
              />
            </div>
          ) : (
            // Sec 1.5: the same monogram the page falls back to, in the
            // same framing, so an agent with no photo still gets a
            // deliberate card rather than a blank one.
            <div
              style={{
                display: "flex",
                fontFamily: "Barlow Condensed",
                fontSize: 190,
                color: "#ffffff",
                letterSpacing: -4,
              }}
            >
              {agentInitials(agent.fullName)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 6,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            DIGITALFLYER SA AGENT
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Barlow Condensed",
              fontSize: 96,
              lineHeight: 0.88,
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            <span>{first}</span>
            {rest && <span style={{ color: "rgba(255,255,255,0.85)" }}>{rest}</span>}
          </div>

          {agent.town && (
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 5, color: "rgba(255,255,255,0.65)" }}>
              {agent.town.toUpperCase()}
            </div>
          )}

          {promise && (
            <div style={{ display: "flex", fontSize: 28, lineHeight: 1.4, color: "rgba(255,255,255,0.9)" }}>
              {promise}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
