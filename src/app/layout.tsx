import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import "./globals.css";

// Geist_Mono was defined here but never applied to any rendered text —
// next/font preloads fonts eagerly by default, so it was competing for
// critical-path bandwidth with the sans font actually being used, adding to
// LCP's element render delay (confirmed via Lighthouse).
const geistSans = Geist({
  variable: "--font-geist-sans",
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
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-foreground">
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
