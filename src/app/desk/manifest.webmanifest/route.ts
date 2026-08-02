import { headers } from "next/headers";
import { NextResponse } from "next/server";

// The Desk as an app on the phone.
//
// Host aware, like robots.ts, because the same screens answer at two
// addresses: at the root of desk.katisobiz.co.za, and under /desk on the
// Growth hostname. A manifest declares one scope, and the wrong one would
// either fail to install or claim a scope belonging to another app on the
// same origin. So the scope follows the host the manifest was fetched from.
//
// A route rather than Next's manifest.ts special file, because that file is
// one per app and this is the fourth in this codebase.
export async function GET() {
  const host = (await headers()).get("host") ?? "";
  const onDeskHost = host.split(":")[0].toLowerCase().split(".")[0] === "desk";
  const base = onDeskHost ? "/" : "/desk";

  return NextResponse.json(
    {
      id: base,
      name: "The Desk",
      short_name: "Desk",
      description: "One thing at a time.",
      display: "standalone",
      start_url: base,
      scope: base,
      // Near black rather than the brand blue: this is a private tool and it
      // should not look like another DigitalFlyer product on the home screen.
      theme_color: "#0f1b28",
      background_color: "#f5f5f5",
      orientation: "portrait",
      lang: "en-ZA",
      icons: [
        { src: "/api/icons/desk?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/icons/desk?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: "/api/icons/desk?size=192&maskable=1",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/api/icons/desk?size=512&maskable=1",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}
