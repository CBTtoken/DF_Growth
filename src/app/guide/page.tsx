import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";

const PAGE_TITLE = "Managing Your Page";
const PAGE_DESCRIPTION =
  "A plain-language guide to running your DigitalFlyer page: editing your words, adding products, taking orders and getting paid.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/guide" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/guide",
    locale: "en_ZA",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DigitalFlyer SA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const revalidate = 3600;

// The companion to /how-it-works, which stops at the moment somebody goes
// live. This is everything after that.
//
// Written for the first done-for-you member and then kept general, because
// every member needs the same thing and none of them should need a phone
// call to find the Edit button. Same brief as /how-it-works: our members are
// not computer people, so every task is named the way somebody would ask for
// it out loud, and the answer is where to click, in order.
//
// Deliberately no screenshots. The dashboard is the surface that changes
// most often in this product, and a guide full of stale pictures is worse
// than one with none: it teaches a member to distrust the whole page. Words
// describing a tab and a button survive a redesign that screenshots do not.
type Task = { title: string; steps: string[]; note?: string };
type Section = { id: string; title: string; blurb: string; tasks: Task[] };

const SECTIONS: Section[] = [
  {
    id: "basics",
    title: "The basics",
    blurb: "Everything on your page is yours to change, whenever you like. Nothing needs us.",
    tasks: [
      {
        title: "Find your dashboard",
        steps: [
          "Go to the site and click Log in, top right.",
          "Use the email address you signed up with.",
          "You land on your dashboard. Everything below happens here.",
        ],
      },
      {
        title: "Change the words on your page",
        steps: [
          "Click the Your Page tab.",
          "Edit your headline, the line under it, your About text and your list of what you do.",
          "Click Save. Your page updates within a minute.",
        ],
        note: "Write for somebody who has never heard of you and is deciding whether to phone. Plain words beat clever ones.",
      },
      {
        title: "See your page the way a customer sees it",
        steps: ["Click View your page at the top of the dashboard.", "That is the real thing, exactly as a visitor gets it."],
      },
      {
        title: "Change your colours or your logo",
        steps: ["Click the Your Page tab.", "Update your brand colours or upload a logo.", "Click Save."],
        note: "A wide logo is fine. It is shown at its own shape rather than squashed into a square.",
      },
    ],
  },
  {
    id: "photos",
    title: "Photos",
    blurb: "The single biggest difference between a page that works and one that does not.",
    tasks: [
      {
        title: "Add photos of your work",
        steps: [
          "Go to the Your Page tab and find the photo section.",
          "Upload up to ten. Two or more makes a gallery appear on your page.",
          "Pick one as your main picture if you want it in the header.",
        ],
        note: "Phone photos are fine. Good light and a plain background beat an expensive camera every time.",
      },
    ],
  },
  {
    id: "shop",
    title: "Your shop",
    blurb: "On Growth and above. Every product gets its own page, its own address and its own link preview.",
    tasks: [
      {
        title: "Switch your shop on",
        steps: ["Click the Booking and Shop tab.", "Turn the Shop toggle on."],
      },
      {
        title: "Add a product",
        steps: [
          "In the Booking and Shop tab, click Add a product.",
          "Give it a name and a price. That is all that is required.",
          "Write a description saying what it is, what it is made of and how big it is.",
          "Save it, then add pictures.",
        ],
        note: "The first picture is the one that shows in your shop and in a WhatsApp link, so make it the best one.",
      },
      {
        title: "List something before you know the price",
        steps: [
          "Add the product as normal and leave the price at zero.",
          "Tell us to mark it as awaiting a price, or set a real price later.",
        ],
        note: "It still gets its page and still appears in your shop, marked Price on request, and nobody can order it by mistake.",
      },
      {
        title: "Add sizes, colours or other choices",
        steps: [
          "Find the product in your list and click Options.",
          "Add one option per choice, for example Small, Medium, Large.",
          "Each can have its own price and its own stock.",
        ],
      },
      {
        title: "Choose what shows on your landing page",
        steps: ["Click the star next to up to three products.", "Star nothing and your three newest are shown instead."],
      },
      {
        title: "Count stock, or do not",
        steps: [
          "Tick I count stock on a product and enter how many you have.",
          "Leave it unticked if you make to order or restock as you go.",
        ],
        note: "Leaving it off is the normal choice. A number nobody updates only ever turns away a sale.",
      },
    ],
  },
  {
    id: "orders",
    title: "Orders and getting paid",
    blurb: "An order reaches you by email the moment it is placed, and it waits for you in your dashboard.",
    tasks: [
      {
        title: "See your orders",
        steps: ["Click the Overview tab.", "Every order is listed with what was bought and who bought it."],
      },
      {
        title: "Take payment when you have no card gateway",
        steps: [
          "You get an email with the buyer's number the moment they order.",
          "Phone or WhatsApp them and arrange payment however you normally do.",
          "Once the money is in, click Mark as paid on that order.",
        ],
        note: "Marking it paid is what keeps your own figures right. Nothing else depends on it, but your totals do.",
      },
      {
        title: "Take card payments online",
        steps: [
          "Open your own Paystack account. It is free and there is no monthly fee.",
          "Send us the key and we connect it.",
          "Buyers then pay by card at checkout and the money goes straight to your account.",
        ],
        note: "Your customers' money never passes through a DigitalFlyer account. Not ever.",
      },
      {
        title: "Mark an order as sent",
        steps: ["Find the order under Overview.", "Click Mark as sent once it is on its way."],
      },
      {
        title: "Write yourself a note on an order",
        steps: ["Type into the note box on that order and click Save note."],
        note: "Only you see it. Useful for things like paying Friday by EFT.",
      },
      {
        title: "Cancel an order",
        steps: ["Click Cancel order on it."],
        note: "It stays on your list marked cancelled rather than disappearing, so your figures still add up.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery",
    blurb: "Four ways to handle it. Pick the one that matches how you actually work.",
    tasks: [
      {
        title: "Choose how you deliver",
        steps: [
          "Go to the Booking and Shop tab and find Delivery.",
          "Collection only means buyers collect and no address is asked for.",
          "One delivery charge adds the same amount to every order.",
          "I quote delivery per order takes the order with an address and no charge, and you confirm the cost.",
        ],
      },
      {
        title: "Use a courier and show live prices",
        steps: [
          "Open your own Bob Go account.",
          "In the Booking and Shop tab, paste your Bob Go key into Courier account.",
          "Set your collection address, which is wherever the parcels physically are.",
        ],
        note: "Buyers then see a real price for their own address. Shipments are booked on your account, in your name.",
      },
    ],
  },
  {
    id: "events",
    title: "Events",
    blurb: "If you run evenings, workshops, markets or classes, they belong on your page.",
    tasks: [
      {
        title: "List your events",
        steps: [
          "Go to the Your Page tab and find the packages section.",
          "Choose Event as the type.",
          "Put the name of the evening in the name, and the date where the price would go.",
        ],
        note: "Keep them current. An old date on a live page reads worse than no dates at all.",
      },
    ],
  },
  {
    id: "customers",
    title: "Your customers",
    blurb: "What the people buying from you can do without needing an account.",
    tasks: [
      {
        title: "How a customer orders",
        steps: [
          "They give a name, a contact number, and an address if they want delivery.",
          "No sign-up and no password, ever.",
        ],
      },
      {
        title: "How they check where their order is",
        steps: [
          "Every order has its own page showing whether it is paid and whether it has been sent.",
          "The link is on their confirmation and in their email.",
          "If they lose it, there is a Track an order link at the bottom of your shop.",
        ],
      },
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <section className="bg-gradient-to-br from-brand-blue via-brand-blue-mid to-brand-blue-dark">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            Managing your page
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Everything after you go live, in the order you are likely to need it. No jargon, and
            nothing here needs us to do it for you.
          </p>
          <p className="mt-6 text-sm text-white/70">
            Brand new?{" "}
            <Link href="/how-it-works" className="font-semibold text-white underline underline-offset-4">
              How It Works
            </Link>{" "}
            walks through signing up. This picks up where that stops.
          </p>
        </div>
      </section>

      {/* Jump links. A member arrives here with one question, not to read a
          manual front to back, so the top of the page is a way out of it. */}
      <nav className="border-b border-neutral-border bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-2 px-4 py-4 sm:px-6">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-neutral-border px-3.5 py-1.5 text-sm font-semibold text-neutral-ink transition hover:border-brand-blue hover:text-brand-blue"
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="mb-14 scroll-mt-24 last:mb-0">
            <h2 className="text-2xl font-black tracking-tight text-neutral-ink sm:text-3xl">
              {section.title}
            </h2>
            <p className="mt-2 text-neutral-mid">{section.blurb}</p>

            <div className="mt-6 flex flex-col gap-4">
              {section.tasks.map((task) => (
                <div
                  key={task.title}
                  className="rounded-2xl border border-neutral-border bg-white p-5 shadow-card sm:p-6"
                >
                  <h3 className="text-base font-bold text-neutral-ink sm:text-lg">{task.title}</h3>
                  <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-neutral-mid">
                    {task.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {task.note && (
                    <p className="mt-3 rounded-xl bg-neutral-light px-4 py-3 text-sm text-neutral-mid">
                      {task.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-2xl border border-neutral-border bg-white p-6 text-center shadow-card">
          <p className="font-bold text-neutral-ink">Still stuck?</p>
          <p className="mt-1 text-sm text-neutral-mid">
            Have a look at the{" "}
            <Link href="/faq" className="font-semibold text-brand-blue underline underline-offset-2">
              questions other members ask
            </Link>
            , or send us a message from your dashboard and a person will answer.
          </p>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
