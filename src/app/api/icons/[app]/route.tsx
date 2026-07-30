import { ImageResponse } from "next/og";
import { loadAssetFonts } from "@/lib/assets/fonts";

// Home screen icons, generated rather than drawn.
//
// Two apps end up on a phone: the board, and messages. Neither had an icon
// and neither needed a designer for one, so these are rendered from the same
// brand colours and the same font the rest of the platform uses. Generating
// them also means the maskable versions cannot drift out of step with the
// normal ones, which is the usual way an Android icon ends up in a white
// square next to every other app.
//
// Cached hard: an icon changes when we change this file, never per request.
export const contentType = "image/png";

const APPS: Record<string, { glyph: string; background: string; foreground: string }> = {
  board: { glyph: "B", background: "#1081b8", foreground: "#ffffff" },
  messages: { glyph: "M", background: "#0c6a97", foreground: "#ffffff" },
};

export async function GET(request: Request, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  const config = APPS[app];
  if (!config) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const size = Math.min(Math.max(parseInt(url.searchParams.get("size") ?? "192", 10) || 192, 48), 512);
  // Android crops a maskable icon to the phone's own shape, so the glyph
  // has to sit inside the safe area rather than filling the square.
  const maskable = url.searchParams.get("maskable") === "1";
  const fonts = await loadAssetFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: config.background,
          fontFamily: "Barlow Condensed",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: maskable ? size * 0.44 : size * 0.62,
            fontWeight: 700,
            color: config.foreground,
          }}
        >
          {config.glyph}
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
