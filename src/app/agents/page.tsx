import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { AgentApplicationForm } from "@/components/agents/AgentApplicationForm";
import { AGENT_FAQ } from "@/lib/agents/faq";
import { AGENT_TERMS_PUBLISHED } from "@/lib/agents/terms";
import { commissionBasis } from "@/lib/agents/vat";

// Agent Programme Phase 3, built from docs/agent-recruitment-page-copy.md.
//
// The design brief is the copy's own strategy: "name the suspicion in the
// first line and dismantle it. Everyone else in this space hides the catch,
// so full disclosure is the differentiator." So this page is built to look
// like a document you can check rather than a pitch you have to trust.
// Plain rules, real tables, numbered facts, no gradient gloss, and the
// "who this does not work for" section given exactly as much visual weight
// as "who this works for", because giving it less would be the first small
// dishonesty on a page whose whole argument is that we do not do that.
//
// It shares the agent page's typographic family (Barlow Condensed at
// display size over the app's sans) so the two read as one programme, but
// it is its own design: the agent page is quiet and person-first, this one
// is blunt and evidence-first.

export const metadata: Metadata = {
  title: "Agent Programme",
  description:
    "Introduce South African businesses to DigitalFlyer SA and earn commission every year they stay. No joining fee, nothing to buy, no recruiting other people.",
  alternates: { canonical: "/agents" },
  openGraph: {
    title: "DigitalFlyer SA Agent Programme",
    description:
      "You introduce the business, we build and run everything, and you get paid every year they stay with us.",
    url: "/agents",
  },
};

export const revalidate = 3600;

// The three facts the copy puts "below the fold marker, as a strip".
const PLAIN_FACTS = ["No joining fee", "Nothing to buy", "No recruiting other people"];

// Section 1. Bold lead, then the detail, exactly as the copy structures it.
const DISCLOSURES: { lead: string; body: string }[] = [
  {
    lead: "It costs nothing to join.",
    body: "No sign-up fee, no starter pack, no monthly fee. If you are ever asked to pay us to be an agent, it is not us.",
  },
  {
    lead: "There is no stock.",
    body: "You are not buying products and reselling them. There is nothing sitting in your garage.",
  },
  {
    lead: "You do not recruit other agents.",
    body: "There is no downline, no team under you, no earning off other people's work. You earn on businesses you personally bring in. That is the only way to earn here.",
  },
  {
    lead: "You are not employed by us.",
    body: "You are independent. You choose your own hours, you work how you want, and you handle your own tax. We do not pay you a salary and we do not promise you will earn anything.",
  },
  {
    lead: "We cannot guarantee you income.",
    body: "What you make depends entirely on how many businesses you bring in. Some agents will make very little. We would rather say that now than have you find out later.",
  },
];

const EARNINGS_ROWS: { plan: string; rate: string }[] = [
  { plan: "Growth Engine or Enterprise, paid yearly", rate: "25%, rising to 40% once you have signed more than ten" },
  { plan: "Foundation, paid yearly", rate: "10%" },
  { plan: "Any plan, paid monthly", rate: "Nothing for their first three months, then 10%" },
];

const DAY_ONE: { title: string; body: string }[] = [
  {
    title: "Your own page.",
    body: "Your name, your photo, your story, at your own web address. Not a link with a code on the end, an actual page you would be happy to send to anyone.",
  },
  {
    title: "A dashboard that tells you the truth.",
    body: "Who clicked, who signed up, who is still on their free trial, who has paid, and who has not converted yet, with their contact details so you can follow them up.",
  },
  {
    title: "Ready made social posts.",
    body: "Branded, with your name and your link, new ones every month. You do not have to think about what to post.",
  },
  {
    title: "Scripts for what to say.",
    body: "What to open with. What to send on WhatsApp. What to say when they tell you they already have a Facebook page, because they will say that, and there is a good answer.",
  },
  {
    title: "Your own services on your page too.",
    body: "If you already do something else, photography, design, printing, your page has a place for it. This does not have to be the only thing you do.",
  },
];

const WORKS_FOR = [
  "People who already talk to business owners all day. If you deliver, repair, supply, or sell to small businesses, you are having these conversations already.",
  "People with a real local network in a town where nobody is doing this yet.",
  "People who are comfortable walking into a shop and starting a conversation.",
  "People who want something they can build up slowly, alongside whatever else they do, that keeps paying after the work is done.",
];

const NOT_FOR: { lead: string; body: string }[] = [
  {
    lead: "If you need money this month, this is not it.",
    body: "Commission comes when a business pays, and businesses take time to decide. The first few weeks are usually quiet.",
  },
  {
    lead: "If you were hoping to post a link and wait, this is not it.",
    body: "The people who do well here talk to businesses directly. Posting alone almost never converts.",
  },
  {
    lead: "If you want a salary, this is not it.",
    body: "There is no basic, no guarantee, and no minimum.",
  },
];

// The copy document left the worked example as {GE_ANNUAL} with the note "I
// will not invent a number on a page about money."
//
// Nothing here is invented now. Growth annual is R1,199/year, live on
// /pricing and in lib/paystack/plans.ts, and the commission basis comes
// from lib/agents/vat.ts, the same constant the Paystack webhook uses to
// write real ledger rows. So this page can only ever advertise what an
// agent would actually be paid, including on the day VAT registration
// changes the basis under both of them at once.
const GROWTH_ANNUAL_RANDS = 1199;
const TEN_MEMBERS_AT_25 = commissionBasis(GROWTH_ANNUAL_RANDS) * 0.25 * 10;
const TEN_MEMBERS_AT_40 = commissionBasis(GROWTH_ANNUAL_RANDS) * 0.4 * 10;

// en-US, not en-ZA, despite this being a South African page. en-ZA formats
// as "R1 199,00", space-separated with a comma decimal, and every other
// price on this site (lib/paystack/plans.ts, /pricing) is written
// "R1,199/year". A money page that formats the same product's price
// differently to the page selling it looks like a different number at a
// glance, which is the last thing this page can afford.
function rands(value: number, decimals = 2): string {
  return `R${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function SectionHeading({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">{eyebrow}</p>
      )}
      <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase leading-[0.95] tracking-tight text-neutral-ink sm:text-5xl">
        {children}
      </h2>
    </div>
  );
}

export default function AgentProgrammePage() {
  return (
    <>
      <MarketingHeader />
      <main className="flex flex-1 flex-col bg-white">
        {/* Hero. Ink ground, headline at display size, and the three plain
            facts immediately underneath rather than further down the page,
            because they are the answer to the question the reader is
            already asking. */}
        <section className="bg-ink text-white">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-16 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/55">
              DigitalFlyer SA Agent Programme
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,9vw,5rem)] uppercase leading-[0.9] tracking-tight">
              You have seen a hundred of these. This one has a product.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-white/85">
              DigitalFlyer SA builds professional pages for small businesses across South Africa. You introduce the
              business, we build and run everything, and you get paid every year they stay with us.
            </p>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 border-y border-white/15 py-4">
              {PLAIN_FACTS.map((fact) => (
                <li key={fact} className="text-sm font-bold uppercase tracking-[0.12em] text-white">
                  {fact}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#apply"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-ink transition hover:-translate-y-0.5"
              >
                Apply to become an agent
              </a>
              <a href="#earn" className="text-sm font-semibold text-white/80 underline-offset-4 hover:underline">
                See exactly what you earn
              </a>
            </div>
          </div>
        </section>

        {/* Section 1: the suspicious part. */}
        <section className="mx-auto w-full max-w-4xl px-5 py-16 sm:py-24">
          <div className="flex flex-col gap-8">
            <SectionHeading eyebrow="Straight answers">
              Let us get the suspicious part out of the way
            </SectionHeading>
            <p className="max-w-2xl text-lg text-neutral-mid">You are right to be careful. So here is everything, up front.</p>
            <div className="flex flex-col divide-y divide-neutral-border border-y border-neutral-border">
              {DISCLOSURES.map((item) => (
                <div key={item.lead} className="flex flex-col gap-1.5 py-5 sm:flex-row sm:gap-8">
                  <p className="text-base font-bold text-neutral-ink sm:w-64 sm:shrink-0">{item.lead}</p>
                  <p className="text-base leading-relaxed text-neutral-mid">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: what you are actually selling. */}
        <section className="bg-neutral-light">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-16 sm:py-24">
            <SectionHeading eyebrow="The product">What you are actually selling</SectionHeading>
            <div className="flex max-w-2xl flex-col gap-4 text-lg leading-relaxed text-neutral-mid">
              <p>
                Most small businesses in South Africa have a Facebook page and nothing else. No proper website, nothing
                that shows up when someone searches, no way for a customer to find them at eleven at night when they
                are looking for a plumber.
              </p>
              <p>
                DigitalFlyer SA fixes that. A professional page, built for them in days. A place on our marketplace
                where local customers search. Branded social media posts made for them every month. Real customer
                reviews.
              </p>
              <p className="font-semibold text-neutral-ink">
                Your job is the introduction. You do not build anything, you do not write anything, and you do not do
                the support. We do all of it. You find the business and make the connection.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: what you earn. */}
        <section id="earn" className="scroll-mt-20">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-16 sm:py-24">
            <SectionHeading eyebrow="The money">What you earn</SectionHeading>
            <p className="max-w-2xl text-lg text-neutral-mid">
              You earn a share of what the business pays, and you earn it again every year they renew.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-neutral-ink">
                    <th className="py-3 pr-6 text-xs font-bold uppercase tracking-[0.18em] text-neutral-ink">
                      What they sign up for
                    </th>
                    <th className="py-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-ink">You earn</th>
                  </tr>
                </thead>
                <tbody>
                  {EARNINGS_ROWS.map((row) => (
                    <tr key={row.plan} className="border-b border-neutral-border">
                      <td className="py-4 pr-6 text-base font-semibold text-neutral-ink">{row.plan}</td>
                      <td className="py-4 text-base text-neutral-mid">{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border-l-4 border-brand bg-brand-blue-light/50 p-6">
              <p className="text-base leading-relaxed text-neutral-ink">
                <span className="font-bold">The part worth understanding:</span> once you pass ten yearly Growth Engine
                or Enterprise members, you move to 40%, and your first ten move up with you when they renew. So the
                eleventh sale does not just pay more, it lifts everything you have already built.
              </p>
              <p className="text-base leading-relaxed text-neutral-ink">
                <span className="font-bold">Yearly beats monthly, by a long way.</span> A business paying monthly earns
                you nothing for three months and then a small share. A business paying yearly earns you real money the
                moment their payment clears. Learn to sell the yearly plan and everything changes.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-ink p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">A worked example</p>
              <p className="text-base leading-relaxed text-white/90">
                Growth Engine on the yearly plan is {rands(GROWTH_ANNUAL_RANDS, 0)} a year. Ten of those at 25% earns
                you{" "}
                {rands(TEN_MEMBERS_AT_25)}. Sign an eleventh, and when those first ten renew the following year they
                pay 40%, which is {rands(TEN_MEMBERS_AT_40)}, without signing anyone new.
              </p>
              <p className="text-sm text-white/60">
                Real numbers at today&apos;s published price, not a projection. It is an example of the maths, not a
                promise that you will sign ten.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: how and when you are paid. */}
        <section className="bg-neutral-light">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-16 sm:py-24">
            <SectionHeading eyebrow="Payouts">How and when you are paid</SectionHeading>
            <div className="flex max-w-2xl flex-col gap-4 text-lg leading-relaxed text-neutral-mid">
              <p>Commission goes into your account when the business&apos;s payment actually clears, not when they sign up.</p>
              <p>It sits for 14 days, which covers reversed payments, then it is available.</p>
              <p>
                We pay out every week. Once your available balance reaches R750, the whole balance goes to your bank
                account. If it takes a while to get to R750 it just carries over, and anything sitting longer than six
                months gets paid out no matter the amount.
              </p>
              <p>
                If a business gets a refund after you have been paid, that amount comes off your next earnings. We will
                never send you an invoice or ask for money back.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: what you get on day one. */}
        <section className="mx-auto w-full max-w-4xl px-5 py-16 sm:py-24">
          <div className="flex flex-col gap-8">
            <SectionHeading eyebrow="Day one">What you get</SectionHeading>
            <div className="grid gap-5 sm:grid-cols-2">
              {DAY_ONE.map((item, index) => (
                <div key={item.title} className="flex flex-col gap-2 border-t-2 border-neutral-ink pt-4">
                  <span className="font-[family-name:var(--font-display)] text-2xl text-brand">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-base font-bold text-neutral-ink">{item.title}</p>
                  <p className="text-base leading-relaxed text-neutral-mid">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sections 6 and 7, deliberately side by side and equally weighted.
            The copy document flags that the "does not work for" half "costs
            you some applications and wins you better ones", which only holds
            if it is as readable as the half above it. */}
        <section className="bg-neutral-light">
          <div className="mx-auto grid w-full max-w-4xl gap-10 px-5 py-16 sm:py-24 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase leading-none tracking-tight text-neutral-ink">
                Who this works for
              </h2>
              <ul className="flex flex-col gap-4">
                {WORKS_FOR.map((item) => (
                  <li key={item} className="border-l-2 border-brand pl-4 text-base leading-relaxed text-neutral-mid">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-6">
              <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase leading-none tracking-tight text-neutral-ink">
                Who this does not work for
              </h2>
              <p className="text-sm text-neutral-muted">
                We would rather be straight with you than waste your time.
              </p>
              <ul className="flex flex-col gap-4">
                {NOT_FOR.map((item) => (
                  <li key={item.lead} className="border-l-2 border-accent pl-4">
                    <p className="text-base font-bold text-neutral-ink">{item.lead}</p>
                    <p className="mt-1 text-base leading-relaxed text-neutral-mid">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Section 8: staying on the programme. */}
        <section className="mx-auto w-full max-w-4xl px-5 py-16 sm:py-24">
          <div className="flex flex-col gap-6">
            <SectionHeading eyebrow="Staying on">One rule</SectionHeading>
            <div className="flex max-w-2xl flex-col gap-4 text-lg leading-relaxed text-neutral-mid">
              <p className="text-xl font-bold text-neutral-ink">
                Sign in to your dashboard at least once every 60 days.
              </p>
              <p>
                There is no sales target and no quota. If you go quiet we warn you three times before anything happens,
                and if your account does close, everything you have already earned is still paid out to you.
              </p>
              <p>
                {AGENT_TERMS_PUBLISHED ? (
                  <>
                    Full detail is in the{" "}
                    <Link href="/agents/terms" className="font-semibold text-brand underline-offset-4 hover:underline">
                      agent terms
                    </Link>
                    , and the FAQ below answers the rest. Read both before you apply. We would rather you know exactly
                    what this is.
                  </>
                ) : (
                  <>
                    The FAQ below answers the rest, and the full agent terms are sent to you with your acceptance
                    email. Read both before you commit to anything. We would rather you know exactly what this is.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Section 10: the FAQ, in full. The copy document is explicit that
            it is not shortened, because "the disclosure is the sales
            pitch". Same AGENT_FAQ the main help centre renders. */}
        <section className="bg-neutral-light">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-16 sm:py-24">
            <SectionHeading eyebrow="Everything else">Questions</SectionHeading>
            <FaqAccordion items={AGENT_FAQ} />
            <p className="text-base text-neutral-mid">
              {AGENT_TERMS_PUBLISHED ? (
                <>
                  Still not sure?{" "}
                  <Link href="/agents/terms" className="font-semibold text-brand underline-offset-4 hover:underline">
                    Read the agent terms in full
                  </Link>
                  . Everything above is in there, in writing.
                </>
              ) : (
                <>Still not sure? Ask us before you apply. Everything above is in the agent terms, in writing.</>
              )}
            </p>
          </div>
        </section>

        {/* Section 9: the form. */}
        <section id="apply" className="scroll-mt-20">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-16 sm:py-24">
            <SectionHeading eyebrow="Apply">How to apply</SectionHeading>
            <p className="text-lg leading-relaxed text-neutral-mid">
              Fill in the form. We read every application and come back to you either way. If you are accepted, you get
              your login, we set up your page together, and you can start the same week.
            </p>
            <AgentApplicationForm />
          </div>
        </section>
      </main>
      {/* Phase 0.1: no payment badge on a page recruiting people who need
          income, it reads as a joining fee. And no "Become an Agent" link,
          which on this page would point at itself. */}
      <SiteFooter showPaymentBadge={false} showAgentRecruitment={false} />
    </>
  );
}
