import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AgentSection } from "@/components/dashboard/AgentSection";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { AgentPhotoNudge } from "@/components/dashboard/AgentPhotoNudge";
import { MyAgentPageForm } from "@/components/dashboard/MyAgentPageForm";
import { getMyAgentDashboardData } from "@/lib/agents/dashboard-data";
import { getMyAgentRecord, hasBusinessMembership } from "@/lib/agents/dashboard-role";
import { getAgentPageById, getAgentCopyIntake } from "@/lib/agent-page/data";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Agent Programme Phase 1 Sec 1.1: the agent half of a dual-role account,
// and the whole dashboard for an agent with no business membership at all
// (Natasha and HelpLift today). Before this route existed, such a login hit
// requireGrowthClientId's "No account found for this login" and had nowhere
// to go, despite having an approved agent record.
//
// The four-area agent dashboard (performance, referrals, earnings,
// playbook) is Sec 2.4, phase 2. This is the phase 1 version: the referral
// data that already exists, plus the state of their new page.
export default async function AgentDashboardPage() {
  const agent = await getMyAgentRecord();

  // Not an approved agent: whatever this login is, the business dashboard
  // is the right place for it, including its own logged-out handling.
  if (!agent) redirect("/dashboard");

  const [agentData, hasBusiness, agentPage, intake] = await Promise.all([
    getMyAgentDashboardData(),
    hasBusinessMembership(),
    getAgentPageById(agent.id),
    getAgentCopyIntake(agent.id),
  ]);

  const pageUrl = agent.pageSlug ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${agent.pageSlug}` : null;
  const pageIsLive = agent.pageStatus === "live" && Boolean(agent.pageSlug);

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <BrandHeader />

        {hasBusiness && <RoleSwitcher active="agent" />}

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{agent.fullName}</h1>
          <p className="text-sm text-gray-500">Your agent dashboard.</p>
        </div>

        {/* Only rendered for an agent who actually has a page. Not every
            agent gets one: HelpLift is an NGO partner who earns on their
            referral link and is not getting an agent page at all, and an
            agent still waiting for theirs has nothing here to act on
            either. The referral link is the thing every agent shares
            regardless, and AgentSection below already leads with it, so a
            "your page is being set up" placeholder would be both a
            promise we have not made and a second, competing share link. */}
        {agent.pageSlug && (
          <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-ink">Your page</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  pageIsLive ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {pageIsLive ? "Live" : "Not live yet"}
              </span>
            </div>

            {pageIsLive && pageUrl ? (
              <>
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm font-medium text-brand hover:underline"
                >
                  {pageUrl}
                </a>
                <p className="text-sm text-gray-500">
                  Share this anywhere. Every button on it carries your referral code, so anyone who signs up through
                  it is counted as yours for 30 days.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Your page is built and waiting on a final check. You will get the link as soon as it goes live.
              </p>
            )}

            {/* Sec 1.5's nudge, and only when it is actually true: there
                is a page for the photo to appear on, and no photo on it. */}
            {!agent.photoPath && <AgentPhotoNudge />}

          </section>
        )}

        {/* The agent editing their own page. Rendered for every approved
            agent, including one whose page is not live yet, so the copy is
            already theirs to write by the time it goes up. An agent who is
            never getting a page (HelpLift, the NGO referral partner) has no
            page_slug and no editor. */}
        {agent.pageSlug && agentPage && <MyAgentPageForm agent={agentPage} intake={intake} />}

        {agentData ? (
          <AgentSection data={agentData} />
        ) : (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
            Your referral tracking will appear here once your referral link is set up.
          </section>
        )}

        <Link href="/" className="text-xs font-semibold text-gray-400 hover:text-gray-600">
          Back to DigitalFlyer SA
        </Link>
      </div>
      <SiteFooter showAgentRecruitment={false} />
    </main>
  );
}
