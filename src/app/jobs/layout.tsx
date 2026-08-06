import type { Metadata } from "next";
import { JOBS_ORIGIN } from "@/lib/jobs/host";

// KatisoBiz Jobs' own metadata. metadataBase is Jobs' own subdomain, not the
// current hostname, so every canonical and og:image resolves to
// jobs.katisobiz.co.za even while reviewed on a preview URL, same reasoning
// as Moxie's layout. No custom fonts: unlike Moxie, Jobs has no separate
// brand voice yet and inherits the root layout's plain default stack.
export const metadata: Metadata = {
  metadataBase: new URL(JOBS_ORIGIN),
  title: {
    default: "KatisoBiz Jobs | Build a free CV and get found by real employers",
    template: "%s | KatisoBiz Jobs",
  },
  description:
    "Build a real CV on your phone in a few minutes, free. Download it, or let employers looking for someone like you find you.",
  applicationName: "KatisoBiz Jobs",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "KatisoBiz Jobs",
    locale: "en_ZA",
    url: JOBS_ORIGIN,
    title: "KatisoBiz Jobs | Build a free CV and get found by real employers",
    description:
      "Build a real CV on your phone in a few minutes, free. Download it, or let employers looking for someone like you find you.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KatisoBiz Jobs | Build a free CV and get found by real employers",
    description: "Build a real CV on your phone in a few minutes, free.",
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-white text-neutral-900">{children}</div>;
}
