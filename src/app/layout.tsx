import type { Metadata } from "next";
import { Geist, Barlow_Condensed } from "next/font/google";
import { AuthHashHandler } from "@/components/AuthHashHandler";
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

export const metadata: Metadata = {
  title: "DigitalFlyer Growth",
  description: "Growth-as-a-service platform for South African small businesses",
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
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
