import Link from "next/link";
import { katisoPath } from "@/lib/bizup/product";
import { HeroDocument } from "./HeroDocument";

// KatisoBiz landing page. Copy is from the approved deck and is reproduced as
// written; it was signed off, so it is not paraphrased or "improved".
//
// Rules from the deck that shape the build, not just the words:
//   - Mobile first, genuinely. 360px is the design target, desktop adapts.
//   - One action everywhere. Every button starts a free account. No demo,
//     no sales call, no newsletter.
//   - No testimonials, no logos, no "trusted by N businesses". There are no
//     customers yet and inventing them is a misleading representation under
//     the CPA.
//   - Under 1MB total. There is not a single image on this page: the hero
//     document, the icons and the phone frame are all drawn in CSS.
//   - Show the document, not the dashboard.
//
// Interactivity is <details>/<summary> throughout, so the expanders and FAQ
// work with zero JavaScript. On a mid-range Android on prepaid data that is
// the difference between a page that works and one that does not.

// Resolved per request rather than hardcoded, so katisobiz.co.za emits
// /signup and the Growth hostname still emits /bizup/signup. Previously
// every call to action pointed at /bizup/signup and the proxy bounced it,
// which put a redirect on the most important click in the funnel.
function Cta({
  href,
  children,
  size = "lg",
}: {
  href: string;
  children: React.ReactNode;
  size?: "lg" | "sm";
}) {
  return (
    <Link href={href} className={size === "lg" ? "btn-accent-lg" : "btn-accent"}>
      {children}
    </Link>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-neutral-ink lg:text-3xl">
      {children}
    </h2>
  );
}

const PROBLEMS = [
  {
    title: "The voice note quote",
    body: "You send “R4500 for the geyser boet” on WhatsApp. The other guy sends a PDF with his logo, his registration number and a breakdown of the parts. He gets the job. You were cheaper.",
  },
  {
    title: "Admin at 9pm",
    body: "You finish the last job at six, get home, eat, and then sit at the kitchen table writing up quotes in a carbon book. Every hour on paperwork is an hour you are not being paid for.",
  },
  {
    title: "Who still owes me?",
    body: "Three jobs done last month, two paid, and you are not certain which. Chasing money you cannot prove you are owed is the worst conversation in the business.",
  },
  {
    title: "The SARS worry",
    body: "You are not sure whether you are supposed to be charging VAT, what needs to be on the document, or what happens if you got it wrong. So you avoid thinking about it.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Build the quote",
    body: "Tap your saved prices, or type them in. Labour, parts, callout, whatever the job needs. Add the customer and you are done.",
  },
  {
    n: "2",
    title: "Send it on WhatsApp",
    body: "One tap opens WhatsApp with the message ready and a link to your quote. It comes from your own number, so your customer sees a name they recognise.",
  },
  {
    n: "3",
    title: "Turn it into an invoice",
    body: "Customer says yes, job gets done, one tap turns the quote into a proper invoice. No retyping. Mark it paid when the money lands.",
  },
];

const FEATURES = [
  {
    title: "It goes out on WhatsApp, from your number",
    lead: "Because that is how South Africa actually does business.",
    body: "One tap and the message is ready to send from your own WhatsApp, with a link your customer can open on any phone. You can see when they opened it.",
  },
  {
    // Added 29 July 2026, once this was actually true. Worth saying on the
    // landing page because "app" is what this audience expects and the
    // usual next thought is a download they do not want to pay data for.
    title: "It sits on your phone like an app",
    lead: "Without downloading an app.",
    body: "Add KatisoBiz to your home screen and it gets its own icon next to WhatsApp, opening full screen with no browser bar. Nothing to download from the Play Store, no updates to install, and it uses almost no space. One button on Android, and on iPhone we walk you through the four taps.",
  },
  {
    title: "Your prices, saved once",
    lead: "Stop typing the same thing forty times a month.",
    body: "Save your callout fee, your hourly rate, your usual parts. Tap them in next time. Anything you type into a quote can be saved to your price list with one tap, so the list builds itself while you work.",
  },
  {
    title: "The VAT question, answered for you",
    lead: "If you are not registered for VAT, the app never mentions VAT.",
    body: "No boxes, no percentages, nothing to get wrong. If you are registered, add your VAT number once and every document becomes a proper Tax Invoice with the 15% worked out and the right wording on it. It also tells you when a job is big enough to need your customer's full details.",
  },
  {
    title: "Fixing a mistake without breaking the rules",
    lead: "Sent an invoice with the wrong amount on it?",
    body: "Tap “Fix this invoice” and answer one question: does the amount need to change? KatisoBiz does the rest correctly in the background, so your records stay clean and you never have to know what a credit note is.",
  },
  {
    title: "Know who owes you what",
    lead: "Every quote and invoice in one list.",
    body: "Sent, accepted, paid, still outstanding, over 30 days. No spreadsheet, no carbon book, no guessing.",
  },
  {
    title: "Your banking details, printed properly every time",
    lead: "No more “send me your details again”.",
    body: "Enter them once and they appear on every document, correctly, with an optional warning to your customer not to pay anyone claiming your details have changed. Invoice fraud is common in South Africa and this quietly protects you both.",
  },
  {
    title: "Send a statement to a repeat customer",
    lead: "One page showing everything they owe you.",
    body: "Every job, every payment, and the balance at the bottom. Far harder to argue with than a WhatsApp message saying “you still owe me for the geyser.”",
  },
  {
    title: "Hand your accountant everything, in one tap",
    lead: "No shoebox of paper in February.",
    body: "Tap “Export for my accountant” and KatisoBiz packs up every invoice, credit note and payment for the period into one file they can open in Excel, with all the PDFs alongside it. If you do not have an accountant yet, we can point you to one.",
  },
];

const COMPLIANCE = [
  "Every document gets its own number, in order, with no gaps. That is what SARS expects.",
  "Not registered for VAT? Your documents say “Invoice” and never charge VAT by accident.",
  "Registered? They say “Tax Invoice”, show your VAT number, and work out the 15% for you.",
  "Over R5,000 and registered, SARS wants your customer's full details, so KatisoBiz asks for them at the right moment.",
  "Issued documents are never quietly changed. Corrections are handled properly and both versions are kept.",
  "Everything is kept for you, so if SARS ever asks, you can produce it.",
];

const TRADES = [
  "Plumbers", "Electricians", "Mechanics", "Tree fellers", "Handymen",
  "Painters", "Builders", "Cleaners",
];

const PLANS = [
  {
    name: "Free",
    price: "R0",
    per: "forever",
    highlight: false,
    badge: null,
    features: ["10 documents a month", "1 template", "WhatsApp sending", "VAT handling", "Credit notes"],
    cta: "Start free, no card needed",
    planId: null,
  },
  {
    name: "KatisoBiz",
    price: "R49",
    per: "/month",
    highlight: true,
    badge: "Included free with DigitalFlyer Growth",
    features: [
      "75 documents a month", "All 5 templates", "Your own logo", "Customer list",
      "Reports and statements", "Export for your accountant",
    ],
    // Deliberately does NOT say "Start free" on a paid column. Every button
    // on this page creates a free account, which is correct per the copy
    // deck's one-action rule, but a visitor reading the R49 column's feature
    // list and clicking "Start free" could reasonably believe they were
    // getting that list for nothing. That is a misleading representation
    // under the CPA, and the same trap the deck avoids elsewhere with fake
    // testimonials and "SARS compliant".
    cta: "Start today",
    planId: "paid",
  },
  {
    name: "Unlimited Documents",
    price: "R89",
    per: "/month",
    highlight: false,
    badge: null,
    // "Up to 5 users" and "Recurring invoices" were listed here and neither
    // exists: both are Sprint 2 by Dewald's own written decision, and the
    // code hard-clamps every account to one user. That was tolerable while
    // nobody could buy this tier. It stopped being tolerable the day the
    // Pay button started working, because someone can now pay R89 a month
    // for two features that are not there. They go back on this card when
    // they ship, not before.
    features: [
      "Unlimited documents",
      "Everything in KatisoBiz",
      "No monthly document limit to watch",
    ],
    cta: "Start today",
    planId: "unlimited",
  },
];

const FAQS = [
  {
    q: "Do I need to be registered for VAT?",
    a: "No, and most small businesses are not. From April 2026 you only have to register once your turnover passes R2.3 million in any twelve months, and you may choose to register voluntarily above R120,000. Until then KatisoBiz sends clean ordinary invoices with no VAT on them. Add a VAT number later and it switches over automatically.",
  },
  {
    q: "Do I need to be good with computers?",
    a: "No. If you can send a WhatsApp, you can use KatisoBiz. There is nothing to install, nothing to set up on a PC, and no accounting knowledge needed anywhere.",
  },
  {
    q: "Does my customer need the app?",
    a: "No. They get a normal link that opens on any phone or computer. They do not sign up for anything.",
  },
  {
    q: "Can I change an invoice after I have sent it?",
    a: "Yes, and KatisoBiz does it the right way. Anything still in draft can be changed freely. Once an invoice has been sent, tap “Fix this invoice” and answer one question. If only the details were wrong, it corrects them. If the amount was wrong, it cancels the old one properly and gives you a new one. Both are kept, which is what the law requires.",
  },
  {
    q: "What is the difference between a quote and an invoice?",
    a: "A quote is what you send before the job, to win it. An invoice is what you send after, to get paid. KatisoBiz turns one into the other with a single tap.",
  },
  {
    q: "What happens if I go over my 75 documents?",
    a: "You will see a counter all month so it is never a surprise, and warnings as you get close. If you run out, you can top up for R49 or move to Unlimited Documents, both instantly. You can always keep building quotes, you just cannot send them until you do.",
  },
  {
    q: "Is my customer information safe?",
    // Was: "Your customer list and your banking details are encrypted, and
    // our support team cannot see them." Only half of that was true.
    // Banking details genuinely are encrypted with the decryption path
    // isolated and logged. Customer lists are not, and an administrator
    // with database access can read them. This is a security promise about
    // other people's personal information, so it now says what is actually
    // the case. The legal brief flagged the same sentence.
    a: "Your banking details are encrypted, and reading them is restricted and logged. Your customer list is not encrypted, but it is separated from every other business on the platform and our staff do not access it in the course of normal support. Your data is yours, it is never shared with other businesses, and we handle it according to POPIA.",
  },
  {
    q: "Is it really free?",
    a: "Yes. Ten documents a month, forever, no card. If your business grows past that, R49 a month is there when you want it.",
  },
  {
    q: "How long do I need to keep my invoices?",
    a: "SARS generally wants five years. KatisoBiz keeps them for you and you can download the lot at any time.",
  },
  {
    q: "Does KatisoBiz do my books?",
    a: "No, on purpose. KatisoBiz gets a professional quote out the door in under a minute and keeps track of who has paid you. It does not do expenses, bank reconciliation or financial statements, because that is an accountant's job and doing it properly would make this app slow and complicated. What KatisoBiz does do is hand your accountant every invoice, credit note and payment in one clean file, so their job is quicker and cheaper.",
  },
];

export async function BizUpLanding() {
  const signup = await katisoPath("/signup");

  return (
    <main className="flex flex-1 flex-col bg-white pb-24 lg:pb-0">
      {/* ============ 1. HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue-light via-white to-white pt-12 pb-12 lg:pt-20 lg:pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue-light px-3 py-1.5 text-xs font-bold text-brand-blue">
                KatisoBiz, from DigitalFlyer SA
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-neutral-ink sm:text-5xl lg:text-5xl xl:text-6xl">
                Send a quote that wins the job.
              </h1>

              <p className="mt-4 text-base leading-relaxed text-neutral-mid lg:text-lg">
                A professional quote with your logo and your banking details, from your phone, in
                under a minute. Turn it into an invoice when the job is done. Free to start, no card
                needed.
              </p>

              <div className="mt-7 flex flex-row flex-wrap items-center gap-3">
                <Cta href={signup}>Create your first quote free</Cta>
                <a href="#how-it-works" className="btn-outline px-5 py-3 text-sm">
                  See how it works
                </a>
              </div>

              <p className="mt-5 text-sm text-neutral-muted">
                Free forever plan · No credit card · Works on any phone · Built in South Africa
              </p>
            </div>

            {/* The document is the hero, not the software. */}
            <div className="order-first lg:order-last">
              <HeroDocument />
            </div>
          </div>
        </div>
      </section>

      {/* ============ 2. THE PROBLEM ============ */}
      <section className="border-y border-neutral-border bg-neutral-light py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Sound familiar?</SectionHeading>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-neutral-border bg-white p-5 shadow-card">
                <h3 className="font-bold text-neutral-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-mid">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 3. HOW IT WORKS ============ */}
      <section id="how-it-works" className="scroll-mt-16 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Three steps. That is the whole thing.</SectionHeading>
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-neutral-border bg-white p-5 shadow-card">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand-blue text-base font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-bold text-neutral-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-mid">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 4. FEATURES ============ */}
      <section className="border-t border-neutral-border bg-neutral-light py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>What you actually get</SectionHeading>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.slice(0, 4).map((f) => (
              <div key={f.title} className="rounded-2xl border border-neutral-border bg-white p-5 shadow-card">
                <h3 className="font-bold text-neutral-ink">{f.title}</h3>
                <p className="mt-2 text-sm font-semibold text-brand-blue">{f.lead}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-mid">{f.body}</p>
              </div>
            ))}
          </div>

          {/* The remaining four behind an expander, so the page stays light
              on mobile. <details> so it works with no JavaScript. */}
          <details className="group mt-4">
            <summary className="btn-outline cursor-pointer list-none px-5 py-3 text-sm">
              <span className="group-open:hidden">See everything KatisoBiz does</span>
              <span className="hidden group-open:inline">Show less</span>
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FEATURES.slice(4).map((f) => (
                <div key={f.title} className="rounded-2xl border border-neutral-border bg-white p-5 shadow-card">
                  <h3 className="font-bold text-neutral-ink">{f.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-brand-blue">{f.lead}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-mid">{f.body}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* ============ 5. COMPLIANCE STRIP ============
          Replaces testimonials. With no social proof, specificity is the
          proof: naming the actual rules handled is more convincing than a
          fabricated quote, and it is true. */}
      <section className="bg-neutral-ink py-12 text-white lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight lg:text-3xl">
            We handle the boring SARS parts so you do not have to learn them
          </h2>
          <ul className="mt-7 flex flex-col gap-3">
            {COMPLIANCE.map((c) => (
              <li key={c} className="flex gap-3 text-sm leading-relaxed text-white/85">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <p className="mt-7 border-t border-white/15 pt-5 text-xs leading-relaxed text-white/60">
            KatisoBiz helps you produce the right documents. It is not tax advice, and your tax affairs
            stay your own. If something is complicated, speak to a tax practitioner or SARS.
          </p>
        </div>
      </section>

      {/* ============ 6. WHO IT IS FOR ============ */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading>Built for the one-bakkie business</SectionHeading>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {TRADES.map((t) => (
              <span
                key={t}
                className="rounded-full border border-neutral-border bg-neutral-light px-3.5 py-1.5 text-sm font-medium text-neutral-mid"
              >
                {t}
              </span>
            ))}
            <span className="rounded-full border border-neutral-border bg-neutral-light px-3.5 py-1.5 text-sm font-medium text-neutral-mid">
              Anyone who quotes a job and then invoices for it
            </span>
          </div>
          {/* Naming what KatisoBiz is not is a conversion tool. It stops the
              wrong person signing up and makes the right person trust the
              rest of the page. */}
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-neutral-mid">
            If you need full accounting software, get full accounting software. If you need to send
            a professional quote from a job site in under a minute, this is that.
          </p>
        </div>
      </section>

      {/* ============ 7. PRICING ============ */}
      <section id="pricing" className="scroll-mt-16 border-y border-neutral-border bg-neutral-light py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Start free. Upgrade when the work picks up.</SectionHeading>

          <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-2xl border bg-white p-6 ${
                  p.highlight
                    ? "border-brand-blue shadow-card-hover lg:-mt-2 lg:mb-2"
                    : "border-neutral-border shadow-card"
                }`}
              >
                {p.badge && (
                  <span className="mb-3 self-start rounded-full bg-brand-blue-light px-3 py-1 text-[11px] font-bold text-brand-blue">
                    {p.badge}
                  </span>
                )}
                <h3 className="font-bold text-neutral-ink">{p.name}</h3>
                <p className="mt-1">
                  <span className="text-3xl font-extrabold text-neutral-ink">{p.price}</span>
                  <span className="text-sm text-neutral-muted"> {p.per}</span>
                </p>
                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-neutral-mid">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-blue" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {/* The chosen plan travels with the click. Without it, a
                    visitor who picked R49 landed on a screen headed "Start
                    free, no card needed" and was quietly put on the free
                    tier, which is the same misleading representation this
                    table was careful to avoid one screen earlier. */}
                <Link
                  href={p.planId ? `${signup}?plan=${p.planId}` : signup}
                  className={`mt-6 ${p.highlight ? "btn-accent" : "btn-outline"} w-full`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Removes the remaining ambiguity: the buttons all do the same
              thing, and this says plainly what that thing is. Without it, a
              visitor could still read "move up later" as "I am signing up
              for this plan now". */}
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm font-semibold text-neutral-ink">
            Everyone starts on the free plan. You choose a paid plan later, from inside KatisoBiz, once
            you know you need it.
          </p>

          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-neutral-mid">
            A quote and an invoice count as two documents. Most one-person businesses use about 40 a
            month, so 75 is room to grow into. Having a big month? Top up for another 75 documents
            for R49, and they never expire.
          </p>
        </div>
      </section>

      {/* ============ 8. FAQ ============ */}
      <section id="faq" className="scroll-mt-16 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Questions people actually ask</SectionHeading>
          <div className="mt-7 flex flex-col gap-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-neutral-border bg-white p-5 shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-neutral-ink">
                  {f.q}
                  <span aria-hidden className="shrink-0 text-brand-blue transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-neutral-mid">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 9. FINAL CTA ============ */}
      <section className="bg-gradient-to-br from-brand-blue to-brand-blue-dark py-14 text-center text-white lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight lg:text-4xl">
            Your next quote could be the one that wins the job.
          </h2>
          <p className="mt-3 text-base text-white/85">
            Free to start. No card. About two minutes to set up.
          </p>
          <div className="mt-7 flex justify-center">
            <Cta href={signup}>Create your first quote free</Cta>
          </div>
        </div>
      </section>

      {/* Sticky bottom CTA on mobile, from the moment the hero scrolls away. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-border bg-white/95 p-3 backdrop-blur lg:hidden">
        <Link href={signup} className="btn-accent w-full">
          Create your first quote free
        </Link>
      </div>
    </main>
  );
}
