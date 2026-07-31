import { ImageResponse } from "next/og";
import { loadAssetFonts } from "@/lib/assets/fonts";

// Home screen icons, generated rather than drawn.
//
// The first version was a flat blue square with a "B" on it, which Dewald
// called dated, and it was: a single letter on a flat field is what an icon
// looked like in 2012, and it told nobody what the app does.
//
// This one takes the note about Uber literally. A deep, almost black field,
// a single confident white wordmark, and nothing else. No gradient, no
// bevel, no letter to decode. "Board" and "Chat" are short enough to read at
// the size a phone actually draws them, which a longer word would not be,
// and a wordmark is unmistakable in a way an initial never is.
//
// Cached hard: an icon changes when this file changes, never per request.
export const contentType = "image/png";

const APPS: Record<string, { word: string; background: string; accent: string }> = {
  // Near black rather than brand blue. The blue is the app's colour and it
  // is everywhere inside it, so an icon in the same blue disappears into a
  // phone full of blue icons. The accent bar underneath is where the brand
  // lives.
  board: { word: "Board", background: "#0f1b28", accent: "#e8821a" },
  messages: { word: "Chat", background: "#0f1b28", accent: "#1081b8" },
};

export async function GET(request: Request, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  const config = APPS[app];
  if (!config) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const size = Math.min(Math.max(parseInt(url.searchParams.get("size") ?? "192", 10) || 192, 48), 512);
  // Android crops a maskable icon to the phone's own shape, so everything
  // has to sit inside the safe area rather than filling the square.
  const maskable = url.searchParams.get("maskable") === "1";
  const scale = maskable ? 0.72 : 1;
  const fonts = await loadAssetFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: config.background,
          fontFamily: "Barlow Condensed",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: size * 0.3 * scale,
            fontWeight: 700,
            letterSpacing: -size * 0.008,
            color: "#ffffff",
            textTransform: "lowercase",
          }}
        >
          {config.word}
        </div>

        {/* One short bar under the word. It is the only piece of colour, and
            it is what makes the mark look deliberate rather than like text
            that happens to be centred. */}
        <div
          style={{
            display: "flex",
            width: size * 0.22 * scale,
            height: Math.max(size * 0.035 * scale, 3),
            borderRadius: size,
            backgroundColor: config.accent,
            marginTop: size * 0.05 * scale,
          }}
        />
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
