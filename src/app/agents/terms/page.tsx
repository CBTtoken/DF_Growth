import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { AGENT_TERMS, AGENT_TERMS_LAST_UPDATED, AGENT_TERMS_PUBLISHED, AGENT_TERMS_SUMMARY } from "@/lib/agents/terms";

// Agent terms, from Part 1 of docs/agent-terms-and-faq-v2.md, which
// replaces the previous version entirely.
//
// Held back on purpose. The build spec: "Do not publish until Dewald
// confirms a legal read of clauses 14 and 18", the two money clauses.
// Note v2 renumbered: anything sent for review under the old 7.3/8.4
// scheme is stale. Until AGENT_TERMS_PUBLISHED flips, this returns a 404 to the
// public and renders only for an admin, so the page can be read and sent
// for review without being live. Same draft-then-publish shape as an agent
// page, which is already the pattern in this codebase.
export const metadata: Metadata = AGENT_TERMS_PUBLISHED
  ? {
      title: "Agent Terms",
      description: "The terms that apply to everyone accepted into the DigitalFlyer SA Agent Programme.",
      alternates: { canonical: "/agents/terms" },
    }
  : // Never indexable while it is a draft, even if the URL leaks to
    // someone with an admin session and gets shared onward.
    { title: "Agent Terms", robots: { index: false, follow: false } };

export default async function AgentTermsPage() {
  if (!AGENT_TERMS_PUBLISHED) {
    const admin = await requireAdminEmail();
    // notFound, not forbidden: an unpublished page should be
    // indistinguishable from one that does not exist.
    if ("error" in admin) notFound();
  }

  return (
    <>
      <MarketingHeader />
      <main className="flex flex-1 flex-col bg-white">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-16 sm:py-24">
          <header className="flex flex-col gap-4">
            {!AGENT_TERMS_PUBLISHED && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="font-bold">Not published.</span> Only you can see this page. It goes live once the
                legal read of clauses 14 and 18 comes back, by flipping AGENT_TERMS_PUBLISHED in
                src/lib/agents/terms.ts.
              </p>
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
              DigitalFlyer SA Agent Programme
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl uppercase leading-none tracking-tight text-neutral-ink sm:text-6xl">
              Agent terms
            </h1>
            <p className="text-base text-neutral-mid">
              Last updated {AGENT_TERMS_LAST_UPDATED}. These terms apply to everyone accepted into the DigitalFlyer SA
              Agent Programme.
            </p>
          </header>

          {/* v2 leads with a plain-language summary before any clause,
              the same disclosure-first instinct the recruitment page uses. */}
          <div className="flex flex-col gap-3 rounded-2xl bg-neutral-light p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">The short version</p>
            {AGENT_TERMS_SUMMARY.map((line) => (
              <p key={line} className="text-base leading-relaxed text-neutral-ink">
                {line}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-10">
            {AGENT_TERMS.map((section) => (
              <section key={section.title} className="flex flex-col gap-4">
                <h2 className="border-b-2 border-neutral-ink pb-2 text-lg font-bold text-neutral-ink">
                  {section.title}
                </h2>
                <ol className="flex flex-col gap-3">
                  {section.clauses.map((clause) => (
                    <li key={clause.ref} className="flex gap-4 text-base leading-relaxed text-neutral-mid">
                      <span className="w-8 shrink-0 font-semibold text-neutral-ink">{clause.ref}</span>
                      <span>{clause.text}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          <p className="text-sm text-neutral-muted">
            Questions about any of this?{" "}
            <Link href="/agents" className="font-semibold text-brand underline-offset-4 hover:underline">
              The agent programme page
            </Link>{" "}
            answers the common ones in plain language, and says the same thing.
          </p>
        </div>
      </main>
      <SiteFooter showPaymentBadge={false} showAgentRecruitment={false} />
    </>
  );
}
