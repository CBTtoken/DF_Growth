import type { Metadata } from "next";
import {
  Archivo_Narrow,
  Barlow_Condensed,
  Bodoni_Moda,
  EB_Garamond,
  Libre_Baskerville,
  Lora,
  Oswald,
  Playfair_Display,
  Source_Serif_4,
  Spectral,
} from "next/font/google";
import { PublicationTheme } from "@/components/emag/PublicationTheme";
import { getPublication } from "@/lib/emag/access";
import type { DesignSettings } from "@/lib/emag/design";
import "./moxie.css";

// The typeface library, self-hosted.
//
// Ten families, matching lib/emag/fonts.ts. Every one is generated and
// served from this application at build time rather than fetched from
// someone else's server, which is what makes "the same article renders
// identically every time" true rather than hopeful, and what lets the PDF
// export embed the face it is drawing with.
//
// That is also why the set is fixed rather than "any font you like": a face
// the build has never seen cannot be embedded in a PDF, and a face fetched
// at read time may not arrive.
//
// Declared with preload off. Nine of the ten are unused on any given page,
// and a browser only downloads a face that rendered text actually asks for,
// so declaring them costs nothing at read time. Preloading them all would
// cost ten downloads to use three.
//
// Which three are in use is decided by the publication's settings, in
// PublicationTheme, by pointing --mx-display, --mx-body and --mx-label at
// the right variables below. Moxie's three are the defaults: Playfair
// Display, Source Serif 4 and Barlow Condensed, from section 5 of its
// Editorial and Design Reference.
//
// An earlier version of this file guessed at Oswald, Spectral and Inter by
// cropping the published pages at 300dpi and reading the letterforms. Two
// of the three were wrong. Worth recording: the pages were read correctly
// and the conclusion was still wrong, because a rendered letterform cannot
// tell you which of several very similar faces produced it. The
// specification could. Both of those faces are in the library now, which is
// its own small vindication of them being reasonable choices.

// Written out one by one rather than sharing an options object. next/font
// reads its arguments at build time and needs them as literals, so a spread
// of shared defaults does not compile. Each family also has its own set of
// available weights and whether it has a true italic at all, which is why
// they are not uniform: Oswald has no italic, and asking for one silently
// gives a slanted fake.
const playfair = Playfair_Display({
  variable: "--font-mx-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const bodoni = Bodoni_Moda({
  variable: "--font-mx-bodoni",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const baskerville = Libre_Baskerville({
  variable: "--font-mx-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const lora = Lora({
  variable: "--font-mx-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const sourceSerif = Source_Serif_4({
  variable: "--font-mx-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const spectral = Spectral({
  variable: "--font-mx-spectral",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const garamond = EB_Garamond({
  variable: "--font-mx-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const barlow = Barlow_Condensed({
  variable: "--font-mx-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const oswald = Oswald({
  variable: "--font-mx-oswald",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "block",
  preload: false,
});

const archivo = Archivo_Narrow({
  variable: "--font-mx-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "block",
  preload: false,
});

const FONT_VARIABLES = [
  playfair,
  bodoni,
  baskerville,
  lora,
  sourceSerif,
  spectral,
  garamond,
  barlow,
  oswald,
  archivo,
]
  .map((f) => f.variable)
  .join(" ");

// Kwaai Press is the product, named on 1 August 2026. Moxie is a
// publication inside it, and the first one. The route still says moxie and
// will become /kwaaipress/[publication] with the rest of the generalisation;
// the name in front of a person is what matters today.
//
// This template reaches the screens below it but not the page.tsx beside
// it, which is a Next rule rather than a bug here. That page sets its own
// absolute title and says why.
export const metadata: Metadata = {
  title: { default: "Kwaai Press", template: "%s | Kwaai Press" },
  // Nothing here is public yet and the workbench never should be. The
  // published edition gets its own metadata when that route exists.
  robots: { index: false, follow: false },
};

// Async so the publication's own design values and typefaces are applied
// once, here, rather than every screen having to remember to pass them down.
export default async function MoxieLayout({ children }: { children: React.ReactNode }) {
  const publication = await getPublication();

  return (
    <div className={FONT_VARIABLES}>
      <PublicationTheme design={(publication?.design ?? null) as DesignSettings | null} />
      {children}
    </div>
  );
}
