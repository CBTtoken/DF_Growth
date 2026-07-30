import { NextResponse } from "next/server";

// The Board as an app on the phone.
//
// Dewald's ask: two icons, one that behaves like Facebook and one that
// behaves like WhatsApp, the same way KatisoBiz already installs.
//
// Two installable apps from one origin is allowed when each manifest
// declares its own id and its own scope, and Chrome picks by longest
// matching scope, so /board/messages resolves to the messages app and
// everything else under /board resolves to this one. That is the part
// browsers vary on. iPhone has no such problem, because Add to Home Screen
// is a bookmark with an icon and always produces exactly what was asked
// for.
//
// A route rather than Next's manifest.ts special file, because that file is
// one per app and this is the second of three (Growth's own, KatisoBiz's,
// and now these two).
export function GET() {
  return NextResponse.json(
    {
      id: "/board",
      name: "The Board",
      short_name: "Board",
      description:
        "What local South African businesses are offering right now, area by area. Message any of them directly.",
      display: "standalone",
      start_url: "/board",
      scope: "/board",
      theme_color: "#1081b8",
      background_color: "#ffffff",
      orientation: "portrait",
      lang: "en-ZA",
      categories: ["shopping", "business"],
      icons: [
        { src: "/api/icons/board?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/icons/board?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/api/icons/board?size=192&maskable=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/api/icons/board?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      // Long press the icon on Android and these appear.
      shortcuts: [
        { name: "Your messages", short_name: "Messages", url: "/board/messages" },
        { name: "Near you", short_name: "Areas", url: "/board" },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
