import type { Metadata } from "next";
import { Geist, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Geist_Mono was defined here but never applied to any rendered text —
// next/font preloads fonts eagerly by default, so it was competing for
// critical-path bandwidth with the sans font actually being used, adding to
// LCP's element render delay (confirmed via Lighthouse). Learned that
// lesson the hard way — Barlow Condensed below is only loaded at the one
// weight it's actually used at (the "GROWTH" wordmark badge), not the
// mistake of pulling in a whole family "just in case."
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: "700",
  subsets: ["latin"],
});

// metadataBase resolves every relative OG/twitter image URL below (root and
// per-page) into an absolute one — without it, Next.js falls back to
// whatever host is currently serving the request, which breaks social-card
// previews on preview/staging deployments. Falls back to the confirmed
// production URL since NEXT_PUBLIC_SITE_URL isn't set in every environment
// (e.g. local dev).
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://df-growth.vercel.app"),
  title: {
    default: "DigitalFlyer Growth",
    template: "%s | DigitalFlyer Growth",
  },
  description: "Growth-as-a-service platform for South African small businesses",
  openGraph: {
    title: "DigitalFlyer Growth",
    description: "Growth-as-a-service platform for South African small businesses",
    images: ["/brand/logo-blue.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigitalFlyer Growth",
    description: "Growth-as-a-service platform for South African small businesses",
    images: ["/brand/logo-blue.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-foreground">
        {children}
      </body>
    </html>
  );
}
