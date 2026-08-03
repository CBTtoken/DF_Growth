import type { Metadata } from "next";
import { svcCanonical } from "@/lib/svc/host";
import { SvcLegalPage } from "@/components/svc/SvcLegalPage";

export const metadata: Metadata = {
  title: "POPIA notice",
  description: "Smart Value Club's notice under the Protection of Personal Information Act.",
  alternates: { canonical: svcCanonical("/popia-notice") },
};

// The current site links to /popia-notice but the page 404s (crawl finding
// 2 in the Sprint 1 audit). This page exists from day one and renders the
// legal team's notice when supplied.
export default function PopiaNoticePage() {
  return <SvcLegalPage title="POPIA notice" documentName="POPIA notice" />;
}
