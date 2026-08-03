import type { Metadata } from "next";
import { svcCanonical } from "@/lib/svc/host";
import { SvcLegalPage } from "@/components/svc/SvcLegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Smart Value Club handles members' personal information.",
  alternates: { canonical: svcCanonical("/privacy") },
};

export default function PrivacyPage() {
  return <SvcLegalPage title="Privacy policy" documentName="privacy policy" />;
}
