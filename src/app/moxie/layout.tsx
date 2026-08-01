import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, Barlow_Condensed } from "next/font/google";
import { MOXIE_ORIGIN } from "@/lib/moxie/host";

// The three faces named in the Moxie Editorial and Design Reference 2026
// section 5, which adds "No others, ever. Never Inter, Roboto, Arial, or
// Helvetica."
//
// Declared here rather than in the root layout on purpose. That file carries
// a hard-won note about next/font preloading eagerly and competing for
// critical-path bandwidth, and it dropped a font that was defined but never
// rendered. Moxie needs six faces that no Growth or KatisoBiz page uses, so
// putting them in the root layout would make every page on two other
// products pay for a magazine they do not render.
//
// Barlow Condensed is loaded again here at its own variable rather than
// reusing the root layout's. The root instance is weight 700 only, for the
// GROWTH wordmark badge, and Moxie needs 400 as well for captions and
// footers. Two instances of the same family at different weights is what
// next/font is for, and it costs one extra file, not a second family.
const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  weight: ["700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed-moxie",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

// The metadata the old WordPress site had wrong, and the reason this is
// worth a comment rather than being obvious.
//
// The live site's title and description describe a recipe and wellness
// publication: "Discover recipes, healthy cooking inspiration, wellness
// tips". That is what appears in Google results and in every WhatsApp link
// preview today, for a magazine that carries science, nature, history,
// travel, food, faith and puzzles. Someone searching for what Moxie
// actually is has never been shown it.
//
// metadataBase is Moxie's own domain and not the current hostname, so every
// canonical and every og:image resolves to moxiemag.co.za even while the
// site is being reviewed on a preview URL. Without it the preview would
// publish itself as the canonical home of content that already ranks
// somewhere else.
export const metadata: Metadata = {
  metadataBase: new URL(MOXIE_ORIGIN),
  title: {
    default: "Moxie Magazine | South Africa's family discovery magazine",
    template: "%s | Moxie Magazine",
  },
  description:
    "South Africa's family discovery magazine. Science, nature, history, travel, food and puzzles, written for curious minds aged 8 to 80. A new edition on the 1st of every month.",
  applicationName: "Moxie Magazine",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Moxie Magazine",
    locale: "en_ZA",
    url: MOXIE_ORIGIN,
    title: "Moxie Magazine | South Africa's family discovery magazine",
    description:
      "Science, nature, history, travel, food and puzzles, written for curious minds aged 8 to 80. A new edition on the 1st of every month.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moxie Magazine | South Africa's family discovery magazine",
    description:
      "Science, nature, history, travel, food and puzzles, written for curious minds aged 8 to 80.",
  },
};

export default function MoxieLayout({ children }: { children: React.ReactNode }) {
  return (
    // font-moxie-body is a Tailwind utility rather than an inline style on
    // purpose. The tokens are declared in an `@theme inline` block, and
    // `inline` means Tailwind substitutes the value into the utilities it
    // generates instead of emitting `--font-moxie-body` as a custom
    // property. So the utility resolves and `style={{ fontFamily:
    // "var(--font-moxie-body)" }}` silently resolves to nothing, which is
    // exactly how this file first shipped: every heading fell back to
    // Geist, the one family the design reference bans by name.
    <div
      className={`${playfair.variable} ${sourceSerif.variable} ${barlowCondensed.variable} flex min-h-full flex-1 flex-col bg-moxie-cream font-moxie-body text-moxie-charcoal`}
    >
      {children}
    </div>
  );
}
