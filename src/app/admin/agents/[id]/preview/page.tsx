import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { getAgentPageById, getAgentSocialProof } from "@/lib/agent-page/data";
import { AgentPageView } from "@/components/agent-page/AgentPageView";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Agent Programme Phase 1 Sec 1.2 says a draft agent page 404s to the
// public, which leaves no way to see one before publishing it. This is
// that way: the identical component with the identical data, admin-gated,
// in "preview" mode so it sets no attribution cookie and fires no pixel
// events. Same reasoning as the existing /dashboard/preview route for
// client pages.
export default async function AdminAgentPagePreview({ params }: { params: Promise<{ id: string }> }) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const { id } = await params;
  const agent = await getAgentPageById(id);
  if (!agent) notFound();

  const socialProof = await getAgentSocialProof(agent.id);

  return <AgentPageView agent={agent} socialProof={socialProof} mode="preview" />;
}
