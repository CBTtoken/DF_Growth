import type { Metadata } from "next";
import Link from "next/link";
import { BizUpHeader } from "@/components/bizup/landing/BizUpHeader";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";
import { Btn, BtnOutline, BtnWhatsApp, BtnPaid, MenuItem, FieldBox } from "@/components/bizup/help/UiBits";
import { FAQ_GROUPS, faqGroupId } from "@/lib/bizup/faq-content";
import { katisoPath } from "@/lib/bizup/product";

// Dewald: "needs to be super clear and easy, I am lazy, I don't want to
// manage lazy support."
//
// That is the actual requirement, so this is written as answers to the
// questions a tradesman will phone about, in their words, not as a feature
// tour. Every answer names the exact buttons on the exact screen, because
// "go to settings" is what generates the second phone call.
//
// Public and needs no login, so it can be sent to someone who is stuck
// before they have signed up, and it works on a phone with no JavaScript:
// expanders are <details>, the same choice the landing page makes.
//
// Rule for maintaining this: never describe something the product does not
// do. An out-of-date help page costs more support than no help page.

const HELP_DESCRIPTION =
  "How to send your first quote, turn it into an invoice, get paid, and hand everything to your accountant.";

export const metadata: Metadata = {
  // Overrides the root layout metadataBase, which is Growth's domain.
  // Without this the generated share image resolved to
  // growth.digitalflyersa.co.za, so a WhatsApp preview for a KatisoBiz
  // link fetched its picture from another product's domain.
  metadataBase: new URL("https://katisobiz.co.za"),
  title: { absolute: "How KatisoBiz works" },
  description: HELP_DESCRIPTION,
  alternates: { canonical: "https://katisobiz.co.za/help" },
  openGraph: {
    type: "article",
    siteName: "KatisoBiz",
    title: "How KatisoBiz works",
    description: HELP_DESCRIPTION,
    url: "https://katisobiz.co.za/help",
    locale: "en_ZA",
    // The same generated card the KatisoBiz homepage uses. Named because
    // overriding this block replaces the root layout's, images included,
    // and a file-based opengraph-image is not inherited from a parent
    // route segment.
    images: [{ url: "/bizup/opengraph-image", width: 1200, height: 630, alt: "KatisoBiz" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How KatisoBiz works",
    description: HELP_DESCRIPTION,
    images: ["/bizup/opengraph-image"],
  },
};

// The buttons are drawn inline rather than described, so a member reads
// "press [Issue this quote]" and already knows what they are looking for
// on the screen. See components/bizup/help/UiBits.tsx for why these are
// rendered controls rather than screenshots.
const STEPS = [
  {
    n: "1",
    title: "Put in your business details",
    body: (
      <>
        Go to <MenuItem>Settings</MenuItem> then <BtnOutline>Business details</BtnOutline>. Your
        business name, address and phone go on every document. If you are registered for VAT, put
        your number in the <FieldBox label="VAT number" /> box and every invoice becomes a proper
        Tax Invoice by itself. If you are not registered, leave it blank and KatisoBiz never
        mentions VAT again.
      </>
    ),
    time: "About 2 minutes",
  },
  {
    n: "2",
    title: "Add your banking details",
    body: (
      <>
        <MenuItem>Settings</MenuItem> then <BtnOutline>Banking details</BtnOutline>. This is how
        your customer pays you, so nothing gets paid until it is done. You enter it once and it
        prints on every invoice with your invoice number as the reference. Changing it later needs
        a code from your email, on purpose, so nobody who gets into your account can quietly swap
        in their own account number.
      </>
    ),
    time: "About 2 minutes",
  },
  {
    n: "3",
    title: "Save the prices you charge most",
    body: (
      <>
        <MenuItem>Price list</MenuItem> then <Btn>Add a price</Btn>. Your callout fee, your hourly
        rate, the parts you fit most often. You can skip this entirely and come back, but every
        price saved here is one you never type again. You can also save a price straight off a
        quote later with <BtnOutline>Save to price list</BtnOutline>, so the list builds itself
        while you work.
      </>
    ),
    time: "As long as you like, and you can come back",
  },
  {
    n: "4",
    title: "Build your first quote",
    body: (
      <>
        Press <Btn>New quote</Btn> on your home screen. Choose the customer, or press{" "}
        <BtnOutline>Add a new customer</BtnOutline> right there if they are new. Search your price
        list or type a one-off line. The total works itself out as you go.
      </>
    ),
    time: "Under a minute once your prices are in",
  },
  {
    n: "5",
    title: "Send it",
    body: (
      <>
        Press <Btn>Issue this quote</Btn>, which gives it a number and locks the amounts, then{" "}
        <BtnWhatsApp>Send on WhatsApp</BtnWhatsApp>. Your own WhatsApp opens with the message
        already written and a link to the quote, so it arrives from a number your customer
        recognises. You can see when they open it.
      </>
    ),
    time: "Seconds",
  },
  {
    n: "6",
    title: "Turn it into an invoice and get paid",
    body: (
      <>
        Customer says yes and the job is done, so open the quote and press{" "}
        <Btn>Turn into invoice</Btn>. Nothing is retyped. Send it the same way. When the money
        lands, press <BtnPaid>Mark paid</BtnPaid> and say how they paid, or record a part payment
        if they only paid some of it. No quote for this job? Press <Btn>New invoice</Btn> on your
        home screen or on Invoices and bill straight away.
      </>
    ),
    time: "Seconds",
  },
];

// Dewald asked for "every feature and how it works and how to operate the
// system", which is a different thing from a FAQ. A FAQ answers a question
// someone already knows to ask; this answers "what is this screen for",
// which is what a member wonders on day one and what generates the call.
//
// One entry per screen in the top menu, in menu order, so a member can read
// it with the app open next to them.
/**
 * The habits that separate a member who gets value out of this from one who
 * signs up and stops.
 *
 * Added 1 August 2026 after Dewald started getting the same questions more
 * than once. Every one of these is drawn from something real: a draft worth
 * R55,020 that was never issued, quotes attached to no customer, and members
 * typing the same price in every week rather than saving it once.
 *
 * Written as what to do and why it pays, not as rules.
 */
const BEST_PRACTICE = [
  {
    title: "Quote while you are still standing there",
    body: "The quote that wins is usually the first one to arrive. Build it on your phone before you leave, issue it, and send it on WhatsApp from the driveway. A quote sent that evening competes with two others. One sent three days later competes with a decision already made.",
  },
  {
    title: "Save a price the first time you type it",
    body: "Anything you type onto a quote can be saved to your price list with one tap. Do it as you go and within a month your list writes most quotes for you. Members who skip this are still typing their callout fee by hand in week six.",
  },
  {
    title: "Issue it, do not leave it in drafts",
    body: "A draft has no number and cannot be sent. It is the single most common thing we see: a finished quote sitting in drafts because the last step was missed. If it is ready, press Issue this quote, then send it.",
  },
  {
    title: "Attach a customer, even for a quick one",
    body: "A quote with no customer cannot be sent, and it also cannot be chased, counted or turned into a statement later. You can create a customer by typing a name straight into the quote, so it costs you nothing.",
  },
  {
    title: "Put a valid until date on every quote",
    body: "It protects your pricing when material costs move, and it gives you a natural reason to follow up. We email you before it runs out so you can call rather than wonder.",
  },
  {
    title: "Record the money the day it lands",
    body: "Payments recorded late make every number on your reports wrong, and the one you will care about is what you are owed. Two minutes on a Friday keeps the chasing list honest.",
  },
  {
    title: "Chase with a statement, not a phone call",
    body: "For a customer who owes you for several jobs, a statement lists all of it on one page and is far harder to argue with than a phone call. It is under Reports.",
  },
  {
    title: "Check the customer's email before you send by email",
    body: "One wrong character and the document goes nowhere with no bounce you will notice. If in doubt, send it on WhatsApp, where you can see it delivered.",
  },
  {
    title: "Put it on your home screen",
    body: "The whole point of quoting on site is that it happens while you are there, and that only works if KatisoBiz is one tap away rather than a browser, a bookmark and a login. It takes ten seconds to add and there is nothing to download.",
  },
] as const;

const SCREENS = [
  {
    name: "Home",
    what: "Where you stand today, and the four things you do most.",
    detail:
      "Three numbers across the top: what you have been paid this month, what you are owed, and what is sitting with a customer waiting for an answer. Below that, a counter showing how many documents you have used this month. Then buttons for a new quote, a new invoice, a new customer and your price list. If any invoice has gone past its due date, a chasing section appears above everything else with a Send a reminder button on each one. Anything still open shows in the list at the bottom, and drops off it once it is accepted, declined or paid.",
  },
  {
    name: "Quotes",
    what: "Everything you have quoted, and where you build a new one.",
    detail:
      "A quote is what you send before the job to win it. Building one takes three things: who it is for, what you are charging, and how long it stands. Add lines by searching your price list or typing them in. Press Issue to give it a number, which locks the amounts, then send it on WhatsApp or by email. Once the customer says yes, press Turn into invoice and nothing is retyped.",
  },
  {
    name: "Invoices",
    what: "Everything you have invoiced, and what is still owed.",
    detail:
      "An invoice is what you send after the job to get paid. It can come from a quote or be raised on its own. Your banking details print on it automatically, with your invoice number as the payment reference so you can match the money when it arrives. Record payments as they come in, in full or in part. Once issued the amounts cannot be edited, which is what SARS expects, so corrections go through Fix this invoice instead.",
  },
  {
    name: "Customers",
    what: "The people you invoice.",
    detail:
      "Only a name is required. Add a phone number to send on WhatsApp, an email to send by email, and an address if you are VAT registered and the job is over R5,000, because SARS asks for it at that point. You can add a customer in the middle of building a quote without losing the quote.",
  },
  {
    name: "Price list",
    what: "The things you charge for often, so you never type them twice.",
    detail:
      "Save your callout fee, your hourly rate, the parts you fit most. Each one has a name, how it is charged (per hour, per job, each) and a price. You can add a markup as a percentage or a flat rand amount for things you buy in and sell on, and it shows you what it will actually bill at. Anything you type onto a quote can be saved here with one tap, so the list builds itself while you work.",
  },
  {
    name: "Reports",
    what: "What the business is actually doing, for any period you choose.",
    detail:
      "Six reports on one screen: what you quoted and how much you won, what you invoiced, what has actually been paid, who is behind and by how long, what is still sitting out there unanswered, and how close you are to having to register for VAT. Every figure is clickable and opens the documents behind it. From here you also reach a customer statement and the export for your accountant.",
  },
  {
    name: "History",
    what: "Everything you have finished with.",
    detail:
      "Quotes and invoices that are done, split into two tabs and searchable by number or customer name. Anything still open stays on the Quotes and Invoices screens, so those stay about work in progress and this stays about looking something up.",
  },
  {
    name: "Settings",
    what: "Your business, your bank, your look, and your plan.",
    detail:
      "Business details are what print at the top of every document, including your VAT number if you have one. Banking details are where your customers pay you, and changing them later needs a code from your email on purpose. How your documents look is where you pick a template and upload your logo. Insurance work turns on a second price on every item. Your plan is where you upgrade or buy a topup.",
  },
] as const;


export default async function BizUpHelpPage() {
  const [faqHref, howHref, signupHref, homeHref] = await Promise.all([
    katisoPath("/faq"),
    katisoPath("/how-it-works"),
    katisoPath("/signup"),
    katisoPath("/"),
  ]);
  return (
    <main className="flex flex-1 flex-col bg-white">
      <BizUpHeader />

      <section className="border-b border-neutral-border bg-brand-blue-light px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink lg:text-4xl">
            How KatisoBiz works
          </h1>
          <p className="mt-3 text-lg text-neutral-mid">
            Everything in one place. Getting set up takes about ten minutes, and after that a quote
            takes under a minute.
          </p>
        </div>
      </section>

      {/* First thing under the hero, not the last thing on the page.
          Dewald's words: the important stuff was all hidden, and his members
          are on phones and do not like searching. Somebody who arrived with
          one question should be able to leave with the answer without
          scrolling past a tutorial they did not ask for. */}
      <section className="border-b border-neutral-border bg-neutral-surface px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-neutral-muted">
            Looking for one answer?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FAQ_GROUPS.map((group) => (
              <Link
                key={group.heading}
                href={`${faqHref}#${faqGroupId(group.heading)}`}
                className="rounded-full border border-neutral-border bg-white px-3.5 py-2 text-sm font-semibold text-neutral-mid transition hover:border-brand-blue hover:text-brand-blue"
              >
                {group.heading}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={howHref} className="btn-accent px-5 py-2.5 text-sm">
              Step-by-Step walkthrough
            </Link>
            <Link href={faqHref} className="btn-outline px-5 py-2.5 text-sm">
              All {FAQ_GROUPS.reduce((total, group) => total + group.items.length, 0)} questions
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-ink">
            Getting started, in six steps
          </h2>
          <p className="mt-2 text-neutral-mid">
            Do the first two and you can send a quote. The rest can wait until you need them.
          </p>

          <ol className="mt-8 flex flex-col gap-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-base font-bold text-white">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-neutral-ink">{s.title}</h3>
                  <p className="mt-1 leading-relaxed text-neutral-mid">{s.body}</p>
                  <p className="mt-1 text-sm text-neutral-muted">{s.time}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={signupHref} className="btn-accent-lg">
              Create your first quote free
            </Link>
            <Link href={homeHref} className="btn-outline px-6 py-3">
              Back to KatisoBiz
            </Link>
          </div>
        </div>
      </section>

      {/* Between the steps and the screen tour on purpose. Somebody who has
          just read how to send their first quote is exactly the person who
          benefits from knowing which habits make the second one quicker. */}
      <section className="border-t border-neutral-border px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-ink">
            Getting the most out of it
          </h2>
          <p className="mt-2 text-neutral-mid">
            Nine habits, from watching how members actually use it. None of them take longer than
            the thing they replace.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {BEST_PRACTICE.map((tip) => (
              <div key={tip.title} className="rounded-xl border border-neutral-border bg-white p-5">
                <h3 className="text-base font-bold text-neutral-ink">{tip.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-mid">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Every screen, in menu order, so a member can read this with the
          app open beside them. This is the half a FAQ cannot do: a FAQ
          answers a question you already knew to ask. */}
      <section className="border-t border-neutral-border bg-neutral-surface px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-ink">
            Every screen, and what it is for
          </h2>
          <p className="mt-2 text-neutral-mid">
            In the same order as the menu at the top of KatisoBiz.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            {SCREENS.map((s) => (
              <div
                key={s.name}
                className="rounded-xl border border-neutral-border bg-white p-5"
              >
                <h3 className="text-lg font-bold text-neutral-ink">{s.name}</h3>
                <p className="mt-1 font-semibold text-neutral-mid">{s.what}</p>
                <p className="mt-2 leading-relaxed text-neutral-mid">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-border bg-white p-6 text-center shadow-card">
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-ink">
            Still stuck? Ask a person.
          </h2>
          <p className="mt-2 text-neutral-mid">
            WhatsApp +27 72 311 0570 or email info@digitalflyer.co.za. If it is about a particular
            quote or invoice, send us the number on it and we will be much quicker.
          </p>
        </div>
      </section>

      <BizUpFooter />
    </main>
  );
}
