import type { Metadata } from "next";
import { svcCanonical } from "@/lib/svc/host";
import { SvcLegalPage } from "@/components/svc/SvcLegalPage";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms and conditions of Smart Value Club membership.",
  alternates: { canonical: svcCanonical("/terms") },
};

// Legal team's document renders here when supplied (handoff 3.5). Their
// list already includes: the current terms mention neither the draw nor the
// referral programme, and the brand appears as both "Smart Value Club" and
// "SmartValue Club".
export default function TermsPage() {
  return <SvcLegalPage title="Terms and conditions" documentName="terms and conditions" />;
}
