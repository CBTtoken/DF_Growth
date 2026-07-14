import type { Metadata } from "next";

// Found during pre-launch SEO audit: this route (and its three siblings —
// forgot-password, reset-password, set-password) had no noindex at all,
// unlike every other account-only page (dashboard, onboard, admin) which
// already excludes itself. A stray "/login" ranking in search results isn't
// dangerous, just pointless — nobody should ever land here from Google.
// Client component pages can't export `metadata` directly, hence the
// separate layout.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
