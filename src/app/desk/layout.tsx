import type { Metadata } from "next";

// The Desk. Private, single user, phone first.
//
// No MarketingHeader, no SiteFooter, no brand chrome: this is not a
// DigitalFlyer page, it is one person's tool. The standing rule that every
// own page uses the shared header and footer is about pages the public can
// reach, and nothing here is one.
export const metadata: Metadata = {
  title: "The Desk",
  robots: { index: false, follow: false, nocache: true },
};

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-1 flex-col bg-neutral-100 text-neutral-900">{children}</div>;
}
