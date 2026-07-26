import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  PackageX,
  Users,
  Briefcase,
  AlertTriangle,
  Globe,
  Search,
  Share2,
  Star,
  TrendingUp,
  Calendar,
  Wallet,
  Clock,
  CalendarCheck,
  Banknote,
  RotateCcw,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Check,
  X,
} from "lucide-react";
import { ProgrammeNav } from "@/components/agents/ProgrammeNav";
import { ProgrammeFaq } from "@/components/agents/ProgrammeFaq";
import { AgentApplicationForm } from "@/components/agents/AgentApplicationForm";
import { AGENT_TERMS_PUBLISHED } from "@/lib/agents/terms";
import { commissionBasis } from "@/lib/agents/vat";

// The agent programme page, ported from the Bolt design Dewald supplied
// (project-bolt-sb1-wtyuwxq9.zip).
//
// The design ports as given: DigitalFlyer blue gradients, the orange call
// to action, icon tiles, the wave divider, the payout timeline, the
// green/red "who this is for" split, and its own sticky nav with anchors.
//
// The COPY does not port as given, in one place that matters. The Bolt file
// was built from the original recruitment brief and its commission table
// and FAQ still carry the previous rates: Foundation yearly at 10%, monthly
// earning nothing for three months, and the tier called "Growth Engine".
// agent-terms-and-faq-v2.md replaced all three, and lib/agents/commission.ts
// already pays the new ones. Shipping the design's own numbers would have
// put a public promise in front of agents that the ledger does not honour,
// which is the same failure this page exists to avoid.
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

const BLUE = "#1EA7D4";
const ORANGE = "#E07B40";

// v2 clauses 8 and 9. Any yearly plan, not just Growth and Enterprise, and
// monthly pays from the first cleared payment with no three month wait.
const EARNINGS_ROWS = [
  { plan: "Any plan, paid yearly", earn: "25%, rising to 40% once you have signed more than ten", highlight: true },
  { plan: "Any plan, paid monthly", earn: "10%, from the first payment that clears", highlight: false },
];

const GROWTH_ANNUAL_RANDS = 1199;
const TEN_AT_25 = commissionBasis(GROWTH_ANNUAL_RANDS) * 0.25 * 10;
const TEN_AT_40 = commissionBasis(GROWTH_ANNUAL_RANDS) * 0.4 * 10;

// en-US, not en-ZA, despite being a South African page: en-ZA formats as
// "R1 199,00" and every other price on this site is written "R1,199".
function rands(value: number, decimals = 2): string {
  return `R${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

const STRAIGHT_ANSWERS = [
  {
    Icon: BadgeCheck,
    title: "It costs nothing to join.",
    body: "No sign-up fee, no starter pack, no monthly fee. If you are ever asked to pay us to be an agent, it is not us.",
  },
  {
    Icon: PackageX,
    title: "There is no stock.",
    body: "You are not buying products and reselling them. There is nothing sitting in your garage.",
  },
  {
    Icon: Users,
    title: "You do not recruit other agents.",
    body: "No downline, no team under you, no earning off other people's work. You earn on businesses you personally bring in. That is the only way to earn here.",
  },
  {
    Icon: Briefcase,
    title: "You are not employed by us.",
    body: "You are independent. You choose your own hours, work how you want, and handle your own tax. We do not pay you a salary and do not promise you will earn anything.",
  },
];

const PRODUCT_FEATURES = [
  { Icon: Globe, title: "A professional page", body: "Built for them in days, not a Facebook page, an actual web presence." },
  { Icon: Search, title: "A place on our marketplace", body: "Where local customers search and find them." },
  { Icon: Share2, title: "Branded social posts", body: "Made for them every month, ready to go." },
  { Icon: Star, title: "Real customer reviews", body: "Building trust and bringing in more business." },
];

const PAYOUT_STEPS = [
  {
    Icon: Clock,
    title: "Payment clears first",
    body: "Commission goes into your account when the business's payment actually clears, not when they sign up.",
  },
  {
    Icon: CalendarCheck,
    title: "14 day holding period",
    body: "It sits for 14 days, which covers reversed payments, then it is available.",
  },
  {
    Icon: Banknote,
    title: "Weekly payouts over R750",
    body: "We pay out every week. Once your available balance reaches R750, the whole balance goes to your bank account. If it takes a while to get to R750 it just carries over.",
  },
  {
    Icon: RotateCcw,
    title: "Refunds come off future earnings",
    body: "If a business gets a refund after you have been paid, that amount comes off your next earnings. We will never send you an invoice or ask for money back.",
  },
];

const DAY_ONE = [
  {
    num: "01",
    Icon: Globe,
    title: "Your own page.",
    body: "Your name, your photo, your story, at your own web address. Not a link with a code on the end, an actual page you would be happy to send to anyone.",
  },
  {
    num: "02",
    Icon: LayoutDashboard,
    title: "A dashboard that tells you the truth.",
    body: "Who clicked, who signed up, who is still on their free trial, who has paid, and who has not converted yet, with their contact details so you can follow them up.",
  },
  {
    num: "03",
    Icon: Share2,
    title: "Ready made social posts.",
    body: "Branded, with your name and your link, new ones every month. You do not have to think about what to post.",
  },
  {
    num: "04",
    Icon: MessageSquare,
    title: "Scripts for what to say.",
    body: "What to open with. What to send on WhatsApp. What to say when they tell you they already have a Facebook page, because they will say that, and there is a good answer.",
  },
  {
    num: "05",
    Icon: PlusCircle,
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

const DOES_NOT_WORK_FOR = [
  {
    title: "If you need money this month, this is not it.",
    body: "Commission comes when a business pays, and businesses take time to decide. The first few weeks are usually quiet.",
  },
  {
    title: "If you were hoping to post a link and wait, this is not it.",
    body: "The people who do well here talk to businesses directly. Posting alone almost never converts.",
  },
  { title: "If you want a salary, this is not it.", body: "There is no basic, no guarantee, and no minimum." },
];

function Eyebrow({ children, tone = "orange" }: { children: React.ReactNode; tone?: "orange" | "gold" }) {
  return (
    <span
      className="text-base font-semibold uppercase tracking-wider"
      style={{ color: tone === "gold" ? "#F0A830" : ORANGE }}
    >
      {children}
    </span>
  );
}

export default function AgentProgrammePage() {
  return (
    <div className="min-h-screen bg-white">
      <ProgrammeNav />

      <main>
        {/* Hero */}
        <section
          id="top"
          className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-[#1EA7D4] via-[#1592B5] to-[#0E6A8A]"
        >
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#E07B40]/20 blur-3xl" />
            <div className="absolute -left-32 top-1/2 h-[400px] w-[400px] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-[#E07B40]/10 blur-3xl" />
          </div>

          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-20 text-center sm:px-8">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 shadow-xl shadow-black/10">
              <ShieldCheck size={18} style={{ color: BLUE }} aria-hidden />
              <span className="text-sm font-bold tracking-wide text-slate-900">
                No joining fee &middot; No stock &middot; No recruiting
              </span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              You have seen a hundred of these.
              <br />
              <span className="text-[#F0A830]">This one has a product.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/90 sm:text-xl">
              DigitalFlyer SA builds professional pages for small businesses across South Africa. You introduce the
              business, we build and run everything, and you get paid{" "}
              <span className="font-semibold text-white">every year</span> they stay with us.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="#apply"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#E07B40] px-8 py-4 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#C96930] hover:shadow-2xl hover:shadow-orange-500/40"
              >
                Apply to become an agent
                <ArrowRight size={20} aria-hidden className="transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#earnings"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15"
              >
                See exactly what you earn
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {["Straight answers", "Real product", "Recurring commission", "Independent work"].map((item) => (
                <span key={item} className="flex items-center gap-2 text-[15px] font-medium text-white/75">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#F0A830]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div aria-hidden className="absolute inset-x-0 bottom-0">
            <svg viewBox="0 0 1440 80" className="h-auto w-full" preserveAspectRatio="none">
              <path d="M0,80 L0,40 C240,0 480,0 720,20 C960,40 1200,60 1440,30 L1440,80 Z" fill="#ffffff" />
            </svg>
          </div>
        </section>

        {/* Straight answers */}
        <section className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="mb-10 text-center">
              <Eyebrow>Straight answers</Eyebrow>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Let us get the suspicious part out of the way
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-500">
                You are right to be careful. So here is everything, up front.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {STRAIGHT_ANSWERS.map((point) => (
                <div
                  key={point.title}
                  className="group rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all duration-300 hover:border-[#1EA7D4]/20 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#1EA7D4]/10 transition-colors group-hover:bg-[#1EA7D4]">
                    <point.Icon size={22} aria-hidden className="text-[#1EA7D4] transition-colors group-hover:text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">{point.title}</h3>
                  <p className="text-[15px] leading-relaxed text-slate-600">{point.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <AlertTriangle size={22} aria-hidden className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <h3 className="mb-1.5 text-lg font-bold text-slate-900">We cannot guarantee you income.</h3>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  What you make depends entirely on how many businesses you bring in. Some agents will make very
                  little. We would rather say that now than have you find out later.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The product */}
        <section id="how-it-works" className="bg-gradient-to-b from-slate-50 to-white py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-10 text-center">
              <Eyebrow>The product</Eyebrow>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                What you are actually selling
              </h2>
              <p className="mx-auto mt-3 max-w-3xl text-lg text-slate-500">
                Most small businesses in South Africa have a Facebook page and nothing else. No proper website, nothing
                that shows up when someone searches, no way for a customer to find them at eleven at night when they
                are looking for a plumber.
              </p>
            </div>

            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2.5">
                <span aria-hidden className="h-px w-12 bg-[#1EA7D4]/30" />
                <h3 className="text-2xl font-bold text-[#1EA7D4]">DigitalFlyer SA fixes that.</h3>
                <span aria-hidden className="h-px w-12 bg-[#1EA7D4]/30" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PRODUCT_FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-slate-100 bg-white p-6 text-center transition-all duration-300 hover:border-[#1EA7D4]/30 hover:shadow-xl hover:shadow-blue-900/5"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1EA7D4] to-[#1592B5] transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
                    <feature.Icon size={26} aria-hidden className="text-white" />
                  </div>
                  <h3 className="mb-1.5 font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-[15px] leading-relaxed text-slate-500">{feature.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6 text-center">
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-700">
                Your job is the <span className="font-bold text-[#E07B40]">introduction</span>. You do not build
                anything, you do not write anything, and you do not do the support. We do all of it.{" "}
                <span className="font-semibold text-slate-900">You find the business and make the connection.</span>
              </p>
            </div>
          </div>
        </section>

        {/* The money */}
        <section id="earnings" className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-10 text-center">
              <Eyebrow>The money</Eyebrow>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">What you earn</h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-500">
                You earn a share of what the business pays, and you earn it again every year they renew.
              </p>
            </div>

            <div className="mb-8 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
              <div className="grid grid-cols-12 bg-[#1EA7D4] px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-white sm:px-8">
                <div className="col-span-7">What they sign up for</div>
                <div className="col-span-5 text-right">You earn</div>
              </div>
              {EARNINGS_ROWS.map((row) => (
                <div
                  key={row.plan}
                  className={`grid grid-cols-12 items-center border-b border-slate-200 px-6 py-4 last:border-0 sm:px-8 ${
                    row.highlight ? "bg-orange-50" : ""
                  }`}
                >
                  <div className="col-span-7 flex items-center gap-3">
                    {row.highlight && <TrendingUp size={18} aria-hidden className="shrink-0 text-[#E07B40]" />}
                    <span className="text-[15px] font-medium text-slate-800">{row.plan}</span>
                  </div>
                  <div
                    className={`col-span-5 text-right text-[15px] font-bold ${
                      row.highlight ? "text-[#E07B40]" : "text-slate-700"
                    }`}
                  >
                    {row.earn}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-8 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-[#1EA7D4] to-[#1592B5] p-7 text-white">
                <TrendingUp size={26} aria-hidden className="mb-3 text-[#F0A830]" />
                <h3 className="mb-2.5 text-xl font-bold">The part worth understanding</h3>
                <p className="text-[15px] leading-relaxed text-white/90">
                  Once you pass ten yearly members, you move to <span className="font-bold text-[#F0A830]">40%</span>,
                  and your first ten move up with you when they renew. So the eleventh sale does not just pay more, it
                  lifts everything you have already built.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-[#E07B40] to-[#C96930] p-7 text-white">
                <Calendar size={26} aria-hidden className="mb-3 text-white" />
                <h3 className="mb-2.5 text-xl font-bold">Yearly beats monthly, by a long way</h3>
                <p className="text-[15px] leading-relaxed text-white/90">
                  A yearly member earns you real money the moment their payment clears, and only yearly members move
                  you up the ladder toward 40%. Learn to sell the yearly plan and everything changes.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 p-7 text-white sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <Wallet size={22} aria-hidden className="text-[#F0A830]" />
                <h3 className="text-xl font-bold">A worked example</h3>
              </div>
              <div className="mb-5 grid gap-5 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-sm text-white/60">Growth yearly</p>
                  <p className="text-2xl font-bold">
                    {rands(GROWTH_ANNUAL_RANDS, 0)}
                    <span className="text-base font-normal text-white/50">/yr</span>
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-white/60">10 sales at 25%</p>
                  <p className="text-2xl font-bold text-[#F0A830]">{rands(TEN_AT_25)}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-white/60">Same 10 at 40% on renewal</p>
                  <p className="text-2xl font-bold text-[#5BC0DE]">{rands(TEN_AT_40)}</p>
                </div>
              </div>
              <p className="border-t border-white/10 pt-4 text-[15px] leading-relaxed text-white/70">
                Real numbers at today&apos;s published price, not a projection. It is an example of the maths, not a
                promise that you will sign ten. Sign an eleventh, and when those first ten renew the following year
                they pay 40%, without signing anyone new.
              </p>
            </div>
          </div>
        </section>

        {/* Payouts */}
        <section className="bg-gradient-to-b from-white to-slate-50 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="mb-10 text-center">
              <Eyebrow>Payouts</Eyebrow>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                How and when you are paid
              </h2>
            </div>

            <div className="relative">
              <div
                aria-hidden
                className="absolute bottom-0 left-6 top-0 hidden w-0.5 bg-gradient-to-b from-[#1EA7D4] via-[#E07B40] to-[#1EA7D4] opacity-20 sm:block"
              />
              <div className="space-y-4">
                {PAYOUT_STEPS.map((step) => (
                  <div key={step.title} className="relative flex items-start gap-5 sm:pl-2">
                    <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#1EA7D4] bg-white shadow-md">
                      <step.Icon size={20} aria-hidden className="text-[#1EA7D4]" />
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="mb-1 text-lg font-bold text-slate-900">{step.title}</h3>
                      <p className="text-[15px] leading-relaxed text-slate-600">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-xl text-center text-[15px] text-slate-500">
              Anything sitting longer than six months gets paid out no matter the amount.
            </p>
          </div>
        </section>

        {/* Day one */}
        <section
          id="what-you-get"
          className="relative overflow-hidden bg-gradient-to-br from-[#1EA7D4] via-[#1592B5] to-[#0E6A8A] py-12 sm:py-16"
        >
          <div aria-hidden className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#E07B40]/15 blur-3xl" />
          <div aria-hidden className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
            <div className="mb-10 text-center">
              <Eyebrow tone="gold">Day one</Eyebrow>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">What you get</h2>
            </div>

            <div className="space-y-3">
              {DAY_ONE.map((item) => (
                <div
                  key={item.num}
                  className="group flex items-start gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E07B40] to-[#C96930] text-base font-bold text-white shadow-lg transition-transform group-hover:scale-110">
                    {item.num}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="mb-1.5 flex items-center gap-2.5">
                      <item.Icon size={19} aria-hidden className="text-[#F0A830]" />
                      <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    </div>
                    <p className="text-[15px] leading-relaxed text-white/75">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who this is for */}
        <section className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Check size={20} aria-hidden className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Who this works for</h2>
                </div>
                <div className="space-y-3">
                  {WORKS_FOR.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <Check size={14} aria-hidden className="text-green-600" />
                      </span>
                      <p className="text-[15px] leading-relaxed text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <X size={20} aria-hidden className="text-red-500" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Who this does not work for</h2>
                </div>
                <p className="mb-4 text-[15px] italic text-slate-500">
                  We would rather be straight with you than waste your time.
                </p>
                <div className="space-y-3">
                  {DOES_NOT_WORK_FOR.map((item) => (
                    <div key={item.title} className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                      <h3 className="mb-1 font-bold text-slate-900">{item.title}</h3>
                      <p className="text-[15px] leading-relaxed text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Staying on */}
        <section className="bg-slate-50 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
            <Eyebrow>Staying on</Eyebrow>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">One rule</h2>
            <p className="mt-4 text-xl leading-relaxed text-slate-700">
              Sign in to your dashboard at least once every <span className="font-bold text-[#1EA7D4]">60 days</span>.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              There is no sales target and no quota. If you go quiet we warn you three times before anything happens,
              and if your account does close, everything you have already earned is still paid out to you.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] text-slate-500">
              {AGENT_TERMS_PUBLISHED ? (
                <>
                  The FAQ below answers the rest, and the{" "}
                  <Link href="/agents/terms" className="font-semibold text-[#1EA7D4] hover:underline">
                    full agent terms
                  </Link>{" "}
                  are published in writing. Read both before you commit to anything.
                </>
              ) : (
                <>
                  The FAQ below answers the rest, and the full agent terms are sent to you with your acceptance email.
                  Read both before you commit to anything. We would rather you know exactly what this is.
                </>
              )}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="mb-8 text-center">
              <Eyebrow>Everything else</Eyebrow>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Questions</h2>
            </div>
            <ProgrammeFaq />
          </div>
        </section>

        {/* Apply */}
        <section id="apply" className="relative overflow-hidden bg-gradient-to-br from-[#0E6A8A] via-[#1592B5] to-[#1EA7D4] py-12 sm:py-16">
          <div aria-hidden className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#E07B40]/20 blur-3xl" />
          <div className="relative mx-auto max-w-2xl px-5 sm:px-8">
            <div className="mb-8 text-center">
              <Eyebrow tone="gold">Apply</Eyebrow>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">How to apply</h2>
              <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-white/85">
                Fill in the form. We read every application and come back to you either way. If you are accepted, you
                get your login, we set up your page together, and you can start the same week.
              </p>
            </div>
            <AgentApplicationForm />
          </div>
        </section>
      </main>

      {/* The design's own footer. It carries no payment badge and no
          "Become an Agent" link, which on this page would point at itself,
          so those two rules are structural here rather than props someone
          has to remember to pass. */}
      <footer className="bg-slate-900 py-10 text-white/70">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* The white logo, at its real 1200x400 ratio, rather than the
                brand name set as text. Same reasoning as the nav. */}
            <Link href="/" aria-label="DigitalFlyer Growth, home">
              <Image src="/brand/logo-white.png" alt="DigitalFlyer Growth" width={360} height={120} className="h-9 w-auto" />
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px]">
              <Link href="/marketplace" className="transition-colors hover:text-white">
                Marketplace
              </Link>
              <Link href="/shop" className="transition-colors hover:text-white">
                Shop
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-white">
                Terms &amp; Conditions
              </Link>
            </nav>
          </div>
          <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-white/40">
            <p>Built for South African businesses</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
