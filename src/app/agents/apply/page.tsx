import type { Metadata } from "next";
import { Percent, TrendingUp, RefreshCw, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AgentApplicationForm } from "@/components/agents/AgentApplicationForm";

export const metadata: Metadata = {
  title: "Become an Agent",
  description: "Earn recurring commission promoting DigitalFlyer Growth to your network.",
};

// UI/UX pass, 2026-07-17: rewritten from a plain white page with a bulleted
// list into something that actually sells the opportunity — Dewald's exact
// note was that the old page "doesn't shout 'Yes I want to be an agent!'"
// Pulls in the ink/spark "pop" treatment the homepage now uses for its own
// strongest moments, since this is exactly that kind of moment: real,
// recurring income, no membership required to apply.
const HOW_IT_WORKS = [
  {
    icon: Percent,
    title: "Growth & Enterprise Only",
    description: "Referrals only count on Growth and Enterprise annual plans — never Foundation, never a monthly plan.",
  },
  {
    icon: TrendingUp,
    title: "Your Rate Climbs",
    description:
      "Your first 10 referrals earn 25% commission. From your 11th referral onward, every referral earns 40% — including your first 10, once they renew.",
  },
  {
    icon: RefreshCw,
    title: "Paid Every Renewal",
    description: "Commission repeats every year a referred member renews, not just on their first payment.",
  },
  {
    icon: ShieldCheck,
    title: "Fair, No Surprises",
    description:
      "Only payable once a member's annual payment has actually cleared. If someone cancels before paying, nothing is clawed back later.",
  },
];

// Sec 3: "a plain language explanation page covering exactly how
// commission works... This copy should read as a straightforward
// agreement, not fine print" — worth a legal pass before public launch,
// same flag already noted for the Growth Privacy Policy and Terms.
export default function AgentApplyPage() {
  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <MarketingHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-ink to-brand-dark px-4 py-16 text-center text-white sm:px-6 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-3">
          <span className="rounded-full bg-spark px-4 py-1.5 font-display text-xs uppercase tracking-widest text-ink">
            Agent Referral Programme
          </span>
          <h1 className="mt-2 font-display text-3xl uppercase leading-[1.1] tracking-tight sm:text-5xl">
            Turn Your Network Into Real Income
          </h1>
          <p className="max-w-xl text-sm text-white/80 sm:text-base">
            You don&apos;t need to be a DigitalFlyer Growth member yourself. Apply, get approved, and start earning
            recurring commission on every business you bring in.
          </p>
          <a
            href="#apply"
            className="mt-3 rounded-full bg-spark px-8 py-3 text-base font-semibold text-ink transition hover:bg-spark-dark hover:text-white"
          >
            Apply To Become An Agent
          </a>
        </div>
      </section>

      {/* Stat strip — the single most persuasive fact on this page (real
          money, climbing rate, paid every year) gets its own loud moment
          instead of being buried in a bulleted list further down. */}
      <section className="bg-spark px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-3xl gap-6 text-center sm:grid-cols-3">
          <div>
            <p className="font-display text-4xl text-ink sm:text-5xl">25%</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-ink/70">Your first 10 referrals</p>
          </div>
          <div>
            <p className="font-display text-4xl text-ink sm:text-5xl">40%</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-ink/70">From your 11th onward</p>
          </div>
          <div>
            <p className="font-display text-4xl text-ink sm:text-5xl">Every Year</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-ink/70">Paid again on renewal</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="text-center font-display text-2xl uppercase tracking-wide text-ink">How Commission Works</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.title} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <span className="grid size-11 flex-shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                <item.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold tracking-tight text-ink">Terms</h2>
          <p className="mt-2 text-sm text-gray-600">
            Agents are independent, not employees of DigitalFlyer SA, and are responsible for their own tax on any
            commission earned. Payment happens via direct bank transfer once a referral&apos;s annual payment has
            cleared. Applying does not guarantee approval, and DigitalFlyer SA reserves the right to review and, where
            necessary, remove an agent from the programme.
          </p>
        </div>
      </section>

      <section id="apply" className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-center font-display text-2xl uppercase tracking-wide text-ink">
          Ready To Start Earning?
        </h2>
        <AgentApplicationForm />
      </section>

      <SiteFooter />
    </main>
  );
}
