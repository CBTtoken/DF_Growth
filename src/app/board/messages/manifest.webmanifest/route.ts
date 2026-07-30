import { NextResponse } from "next/server";

// Messages as its own icon on the phone, next to the board's.
//
// Scoped deeper than the board on purpose: Chrome resolves an installed app
// by the longest matching scope, so tapping this icon opens the inbox and
// tapping the board's opens the board, even though one path sits inside the
// other.
export function GET() {
  return NextResponse.json(
    {
      id: "/board/messages",
      name: "DigitalFlyer Messages",
      short_name: "Messages",
      description: "Your conversations with local businesses you found on The Board.",
      display: "standalone",
      start_url: "/board/messages",
      scope: "/board/messages",
      theme_color: "#0c6a97",
      background_color: "#ffffff",
      orientation: "portrait",
      lang: "en-ZA",
      categories: ["social", "business"],
      icons: [
        { src: "/api/icons/messages?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/icons/messages?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/api/icons/messages?size=192&maskable=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/api/icons/messages?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
