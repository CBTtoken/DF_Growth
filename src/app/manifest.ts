import type { MetadataRoute } from "next";
import { isKatisoBizHost } from "@/lib/bizup/product";

// Next serves this at /manifest.webmanifest, and it is what turns the site
// into something a phone will put on its home screen.
//
// Host-aware for the same reason robots.ts and sitemap.ts are: two products
// share this app and this file is served on both hostnames. Growth is not
// being made installable, so on that hostname this returns a manifest with
// no icons and no standalone display, which browsers ignore.
//
// Written as a route rather than a static public/manifest.json precisely so
// it can read the hostname. A static file cannot.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";

  if (!isKatisoBizHost(host)) {
    // Deliberately minimal. Growth has no install story yet, and an
    // installable manifest on the wrong domain would let someone add a
    // half-considered icon to their phone.
    return { name: "DigitalFlyer SA", start_url: "/" };
  }

  return {
    name: "KatisoBiz",
    short_name: "KatisoBiz",
    description:
      "Send a professional quote from your phone in under a minute, and turn it into an invoice when the job is done.",

    // Opens full screen with no browser bar, which is the whole point: it
    // is what makes it feel like an app rather than a bookmark.
    display: "standalone",

    // Straight to the member's home rather than the marketing page. Someone
    // who has installed it has already decided; showing them the sales
    // pitch every morning would be daft. A signed-out visitor still gets
    // sent to log in from there.
    start_url: "/",
    scope: "/",

    // The bar at the top of the phone picks up this colour, so the app
    // does not open with a white strip above the header.
    theme_color: "#1081b8",
    background_color: "#ffffff",
    orientation: "portrait",
    lang: "en-ZA",
    categories: ["business", "productivity", "finance"],

    // Generated, in the same family as the Board and Chat icons, so a
    // phone with all three on it reads as one product rather than three.
    // Q and I for quotes and invoices, which is what a member opens this to
    // do, and KB-DF above it for the same reason DF sits above the others.
    icons: [
      { src: "/api/icons/katisobiz?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/icons/katisobiz?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops these to the phone's own icon shape. Without them it
      // draws a white square around the mark, which looks broken next to
      // every other app.
      { src: "/api/icons/katisobiz?size=192&maskable=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/api/icons/katisobiz?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],

    // Long press the icon on Android and these appear, the same way
    // WhatsApp offers a recent chat. Both are the things a member opens the
    // app to do.
    shortcuts: [
      { name: "New quote", short_name: "Quote", url: "/quotes" },
      { name: "New invoice", short_name: "Invoice", url: "/invoices" },
    ],
  };
}
