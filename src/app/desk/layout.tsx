import type { Metadata, Viewport } from "next";

// The Desk. Private, single user, phone first.
//
// No MarketingHeader, no SiteFooter, no brand chrome: this is not a
// DigitalFlyer page, it is one person's tool. The standing rule that every
// own page uses the shared header and footer is about pages the public can
// reach, and nothing here is one.
export const metadata: Metadata = {
  title: "The Desk",
  robots: { index: false, follow: false, nocache: true },
  // Absolute so it resolves the same on desk.katisobiz.co.za, where these
  // screens sit at the root, and under /desk on the Growth hostname.
  manifest: "/desk/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Desk", statusBarStyle: "black-translucent" },
  icons: { apple: "/api/icons/desk?size=180" },
};

export const viewport: Viewport = {
  themeColor: "#0f1b28",
  // Fills the screen properly once it is installed and opened from the home
  // screen, rather than leaving a white band under the notch.
  viewportFit: "cover",
};

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-neutral-100 text-neutral-900">{children}</div>
  );
}
