import type { Metadata } from "next";

// See src/app/login/layout.tsx for why this exists.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
