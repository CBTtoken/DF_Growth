import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { AGENT_FAQ } from "@/lib/agents/faq";

// UI/UX pass, 2026-07-17: expanded from 10 flat questions into a full,
// categorised help centre covering every real feature in the platform.
// Dewald's exact ask. Every answer here describes something genuinely
// built and live, not aspirational. Where a feature is still "coming
// soon" (Enterprise, KatisoBiz), the answer says so plainly rather than
// implying it already works. Grouped into categories (each its own
// FaqAccordion instance, so open/closed state doesn't leak between
// sections) with a jump-list at the top, since a single 40+ item flat
// list would defeat the "super clear, easy to follow" goal this whole
// pass has been about.
const FAQ_CATEGORIES: { id: string; title: string; items: { question: string; answer: string }[] }[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    items: [
      {
        question: "What is DigitalFlyer?",
        answer:
          "DigitalFlyer is a business platform that helps South African businesses build their online presence, get discovered by customers and grow through one connected ecosystem.",
      },
      {
        question: "Do I need a website already?",
        answer: "No. DigitalFlyer creates your professional online presence for you, from scratch, in a few minutes.",
      },
      {
        question: "Do I need to be good with computers?",
        answer:
          "No. Every step is a short, guided form with plain-language instructions, no tech skills required. If you can use WhatsApp, you can do this.",
      },
      {
        question: "How long does setup take?",
        answer:
          "About 10 minutes for most businesses. Our online signup walks you through everything, step by step. See exactly what each screen looks like on our How It Works page.",
      },
      {
        question: "Can I stop partway through and come back later?",
        answer: "Yes. Nothing is lost, you'll pick up exactly where you left off next time you log in.",
      },
    ],
  },
  // Sprint "Onboarding two doors" item 6. Its own category rather than a
  // question buried inside Plans & Billing: for a time-poor operator this
  // is the strongest offer on the site, and somebody searching for
  // "someone to build my business page" should find a page that answers it
  // rather than a pricing table they have to interpret.
  {
    id: "we-build-it",
    title: "We Build It For You",
    items: [
      {
        question: "Can you just build my page for me?",
        answer:
          "Yes. That is the second door at signup. Fill in one short form, pay once, and we build the whole page for you. It is R450 once-off on top of whichever plan you choose, and your page is live within 3 working days.",
      },
      {
        question: "What does the R450 actually include?",
        answer:
          "A page style chosen for your trade rather than a blank template, your photos straightened, resized and picked properly, your own words turned into real page copy, and your best photo set as the front-page image. It does not include logo design or loading products into your shop. Both are things we can help with separately, just ask once you are set up.",
      },
      {
        question: "What exactly do I pay, and when?",
        answer:
          "One payment at signup: the R450 for the build plus your first month or year of membership, shown as a single total in Rand before you enter any card details. After that you pay only your normal plan fee, starting a month or a year later depending on what you chose. The R450 is charged once and never again.",
      },
      {
        question: "How do I get my photos to you?",
        answer:
          "As soon as you have paid, you get a login to your own dashboard, and you can upload your photos there yourself. If that is a hassle, send them to us on WhatsApp instead and we will load them for you. Either way the 3 working days start once we have what we need to build with.",
      },
      {
        question: "Can I still change things myself afterwards?",
        answer:
          "Yes, all of it. You get exactly the same dashboard as every other member: every word, every photo, your prices, your products, your front-page image. Nothing about a page we build is locked, and we send you a short guide so running it yourself is easy.",
      },
      {
        question: "Should I do it myself or have it built?",
        answer:
          "Do it yourself if you have your photos ready and half an hour to spare, it is genuinely straightforward and it costs nothing extra. Have it built if you would rather hand over the whole thing, or if you want the extra creative touch of someone designing it around your trade. The end result is the same platform either way.",
      },
    ],
  },
  {
    id: "plans-billing",
    title: "Plans & Billing",
    items: [
      {
        question: "What's the difference between Foundation and Growth?",
        answer:
          "Foundation gives you a professional business page, marketplace presence, lead generation page, and a monthly digital asset. Growth adds campaign landing pages, performance tracking, ongoing marketing assets, monthly optimisation, and growth reporting, everything you need once you're ready to actively reach more customers.",
      },
      {
        question: "Do I need a credit card to start?",
        answer: "No. Foundation is completely free for your first 7 days, no card required at signup.",
      },
      {
        question: "What happens after my Foundation trial ends?",
        answer:
          "If you haven't added payment, your page pauses until you do. Nothing is deleted, you can reactivate any time and pick up exactly where you left off.",
      },
      {
        question: "Can I upgrade or downgrade later?",
        answer: "Yes, any time, directly from your dashboard. Nothing about your existing page is lost when you switch.",
      },
      {
        question: "Can I cancel at any time?",
        answer: "Yes. There are no long-term contracts. You can cancel whenever you choose, directly from your dashboard.",
      },
      {
        question: "Are there any hidden costs?",
        answer: "Never. Transparency is one of our core values, what you see on the pricing page is what you pay.",
      },
      {
        question: "Is Enterprise available yet?",
        answer:
          "Not yet, full Meta and Google ad management is on its way. Get in touch from the pricing page and we'll let you know the moment it's ready.",
      },
    ],
  },
  {
    id: "your-page",
    title: "Your Page & Design",
    items: [
      {
        question: "Can I choose how my page looks?",
        answer:
          "Yes. Browse real, ready-made designs, already using your own colours and logo, and pick the one you like during signup.",
      },
      // Sprint "Onboarding two doors" item 2.
      {
        question: "How do I know which design suits my business?",
        answer:
          "We choose one for you as a starting point. Tell us your trade at the start of signup and the design built for that kind of business is put first, marked \"Recommended for your trade\", and already selected. A food business gets the one built around food photography, a plumber gets the one built for neighbourhood trades, a guest house gets the one built around the property itself. You are never stuck with it, every other design stays one tap away.",
      },
      {
        question: "Can I change my design later?",
        answer: "Yes, any time, at no extra cost, directly from your dashboard.",
      },
      {
        question: "Do I need my own photos?",
        answer:
          "Your own are always better, and it is worth taking a few on your phone in daylight before you start. A slightly imperfect real photo of your own work beats a perfect stock one. If you do not have any yet, search thousands of free stock photos right there in signup to set the mood while you gather your own. We never present a stock photo as your work: stock images never carry your name or a caption claiming they are yours.",
      },
      // Sprint "Onboarding two doors" item 3: the feature existed the whole
      // time and members did not know it was there, which is why it earns
      // its own question rather than a clause inside another answer.
      {
        question: "How do I choose the big photo at the top of my page?",
        answer:
          "Some designs show one large photo across the top, and signup asks you to pick which one it should be as soon as you have added your photos. If you skip it, we use a relevant stock image so your page still looks finished. You can change it whenever you like: go to your photos in your dashboard and choose \"Use as hero image\" on any photo.",
      },
      {
        question: "How many photos can I add?",
        answer:
          "Up to 15. Five or more is where a page starts looking properly filled in rather than sparse. Every photo you upload is straightened and resized for you automatically, so a photo taken sideways on your phone still appears the right way up on your page.",
      },
      // Sprint "Onboarding two doors" item 5.
      {
        question: "How do I know my page is ready?",
        answer:
          "Your dashboard shows a short checklist of the things that make the biggest difference to whether a visitor gets in touch: your front-page photo, five or more photos, your WhatsApp number, where you work, a tagline and a description. It ticks each one off as you go and disappears once you are done. None of it blocks your page from being live, it is a nudge, not a gate.",
      },
      {
        question: "Do I need a logo?",
        answer: "No, it's optional. Skip it during signup and add one any time later.",
      },
      {
        question: "Can I edit my page after it's live?",
        answer: "Yes, any time, from your dashboard, there's no need to go through onboarding again.",
      },
      {
        question: "What are Packages?",
        answer:
          "An optional way to showcase set prices, service packages, or a time-limited special or discount on your page, up to three. This is a showcase, not a checkout, customers get in touch with you directly to book or buy.",
      },
    ],
  },
  {
    id: "booking-shop",
    title: "Booking & Shop",
    items: [
      {
        question: "What is Booking?",
        answer:
          "A real appointment, rental, or slot calendar built into your page, available on Growth and above. Visitors see live availability and book directly, no back-and-forth messaging needed.",
      },
      {
        question: "What is Shop?",
        answer:
          "A proper shop, on Growth and above. Your own storefront at your own address, and every product gets its own page with its own pictures, description and price. That page is what Google indexes and what looks right when you send it in a WhatsApp message. Buyers order without making an account.",
      },
      {
        question: "Can two people book the same slot by accident?",
        answer:
          "No. Availability is checked in real time and enforced at the database level, so a slot someone else just took is never bookable by a second person.",
      },
      {
        question: "Can I oversell a product if two people buy at once?",
        answer:
          "Not if you are counting stock. Switch stock counting on for a product and two simultaneous orders for your last one can never both succeed. Most members leave it off, because if you make to order or restock as you go, a number nobody updates only ever turns away a sale.",
      },
      {
        question: "How do I get paid for a booking or order?",
        answer:
          "Connect a payment gateway from your dashboard, or don't, both work. We recommend Bob Pay first: a sole proprietor can apply with just an ID, proof of address and a bank statement, no CIPC registration needed. Already have a Paystack account? Connect that instead. Either way, buyers pay by card at checkout and the money goes straight to you, we never sit in the middle of it. With neither connected, the order still goes through: it is recorded, we email you the buyer's details, and you arrange payment with them directly. Plenty of members run exactly like that.",
      },
      {
        question: "How do I add products to my Shop?",
        answer:
          "Add them one at a time from your dashboard, or upload many at once with a CSV file, with clear per-row errors if anything doesn't import. A product needs a name and a price to start. Pictures, sizes and colours can follow after.",
      },
      {
        question: "Do my buyers need an account to order?",
        answer:
          "No. A buyer gives their name, a contact number, and an address if they want it delivered, and that's it. No sign-up, no password. Every order gets its own tracking page, and if they gave an email we send them the link.",
      },
      {
        question: "Can I list something before I know the price?",
        answer:
          "Yes. Leave the price out and the product still gets its page and still shows up in your shop, marked \"Price on request\" with the buy button replaced by a note to contact you. It becomes orderable the moment you set a real price. Useful when you're waiting on a supplier.",
      },
      {
        question: "Can I sell sizes, colours or other options?",
        answer:
          "Yes. Add options to a product and each one can have its own price and its own stock. A buyer picks before adding it to their basket.",
      },
      {
        question: "How do buyers check where their order is?",
        answer:
          "Every order has its own page showing whether it's paid and whether it's been sent. The link is on the confirmation and in the buyer's email, and there's a \"track an order\" page on your shop that emails the links back to whoever placed them.",
      },
      {
        question: "Can I put my events on my page?",
        answer:
          "Yes. Add them the same way you'd add a package, choose Event as the type, and put the date where the price would go. Your page shows them as a proper diary rather than a price list. Keep them current, an old date reads worse than none.",
      },
      {
        question: "Do you handle courier shipping for Shop orders?",
        answer:
          "You can. Connect your own Bob Go account from your dashboard and buyers see live courier prices for their own address at checkout. Shipments are booked on your account, in your name, so the parcel stays yours. If you would rather keep it simple, set one flat delivery charge, offer collection only, or quote delivery per order.",
      },
    ],
  },
  {
    id: "getting-found",
    title: "Getting Found Online",
    items: [
      {
        question: "Will Google find my page?",
        answer:
          "Every DigitalFlyer page is set up the way search engines expect from the moment it goes live, the technical groundwork is already done, not something you have to figure out later.",
      },
      {
        question: "Can my reviews show up in Google search?",
        answer:
          "Your page is built to hand Google exactly what it needs to show your star rating directly in search results, once you've collected some real reviews.",
      },
      {
        question: "Do you track who visits my page?",
        answer:
          "Yes. Real visitor numbers show up right in your own dashboard, no separate analytics account to create or learn.",
      },
      {
        question: "Can I run Facebook or Instagram ads?",
        answer:
          "Yes, on Growth. Connect your Meta Pixel and Ad Account from your dashboard, and your tracking holds up against today's privacy browsers and ad blockers, not just a pixel that quietly stops reporting results.",
      },
      {
        question: "Do I need to know what a \"Pixel\" is to connect Meta ads?",
        answer:
          "No. Your dashboard explains it in plain language, and you can tick a box asking us to help set it up if you'd rather not do it yourself.",
      },
    ],
  },
  {
    id: "social-assets",
    title: "Social Media Assets",
    items: [
      {
        question: "What are \"Digital Assets\"?",
        answer:
          "Ready-made, branded images sized for Facebook and Instagram, special offers, announcements, before-and-afters, new arrivals, and customer testimonials, generated in your own colours in seconds.",
      },
      {
        question: "Do I need design skills to make one?",
        answer: "No. Pick a style, type in your text, and download, no design experience needed.",
      },
      {
        question: "How many can I make?",
        answer:
          "Foundation includes a monthly digital asset. Growth includes ongoing marketing assets as part of your plan.",
      },
    ],
  },
  {
    id: "leads-reviews",
    title: "Leads, Reviews & Testimonials",
    items: [
      {
        question: "How do customers actually contact me?",
        answer: "Through the enquiry form built into your page, every message goes straight to you.",
      },
      {
        question: "Can customers leave reviews on my page?",
        answer:
          "Yes. Reviewers verify with a one-time code, so reviews are from real people. You can reply publicly to any review, but you can't edit or remove one yourself, if a review looks fake or abusive, flag it and our team will take a look.",
      },
      {
        question: "Can I add my own testimonials?",
        answer: "Yes, directly from your dashboard, any time.",
      },
    ],
  },
  {
    id: "ecosystem",
    title: "The DigitalFlyer Ecosystem",
    items: [
      {
        question: "What's included besides my own page?",
        answer:
          "Every membership includes a place on the DigitalFlyer Marketplace and KatisoBiz Nomads community access, at no extra cost.",
      },
      {
        question: "What is the DigitalFlyer Marketplace?",
        answer: "A shared marketplace where customers can discover your business alongside other DigitalFlyer members.",
      },
      {
        question: "What is KatisoBiz Nomads?",
        answer:
          "A private community of South African business owners for deals, support, and real conversations with people building the same thing you are.",
      },
      {
        question: "What is KatisoBiz?",
        answer:
          "Mobile quoting and invoicing for your business. Build a quote on your phone while you are standing on the job, send it on WhatsApp from your own number, and turn it into an invoice when the work is done. Foundation includes the free plan, ten documents a month. Growth includes the R49 plan.",
      },
      {
        question: "Is there an app I have to download?",
        answer:
          "No, and you do not need one. KatisoBiz adds itself to your phone's home screen with its own icon, and opens full screen exactly like an app. There is nothing to download from the Play Store or the App Store, no waiting, and it uses almost no space or data. On Android you press one button. On iPhone it is four taps in Safari and we show you exactly which ones.",
      },
      {
        question: "Does it work on any phone?",
        answer:
          "Yes. Any Android or iPhone with a browser, and on a computer too. There is no minimum phone, no version to keep updated, and nothing to reinstall. When we improve something you have it the next time you open it.",
      },
    ],
  },
  {
    id: "events",
    title: "Events",
    items: [
      {
        question: "What is DigitalFlyer Events?",
        answer: "A free event page for markets, workshops, fundraisers, and other community events, browsable by anyone.",
      },
      {
        question: "Do I need to be a DigitalFlyer member to list an event?",
        answer: "No, adding an event is open to anyone, member or not.",
      },
      {
        question: "Is there a fee to list an event?",
        answer: "No. It's free, always, with no account fees and no ticketing step.",
      },
    ],
  },
  {
    id: "agents",
    title: "Become an Agent",
    items: [
      {
        question: "What is the Agent Referral Programme?",
        answer:
          "A way to earn recurring commission promoting DigitalFlyer Growth to your own network, you don't need to be a Growth member yourself to apply.",
      },
      {
        question: "How much commission do agents earn?",
        answer:
          "25% on your first 10 referrals, 40% from your 11th referral onward, including earlier referrals once they renew. Only Growth and Enterprise annual plans qualify, never Foundation or a monthly plan.",
      },
      {
        question: "When do agents get paid?",
        answer:
          "Once a referred member's annual payment has actually cleared, via direct bank transfer. If someone cancels before paying, nothing is owed and nothing is clawed back later.",
      },
      {
        question: "Does commission repeat every year?",
        answer: "Yes, every year a referred member renews, not just on their first payment.",
      },
    ],
  },
  {
    id: "account-support",
    title: "Account & Support",
    items: [
      {
        question: "How do I log back in?",
        answer:
          "With the email and password you set during signup. Forgot your password? Use the reset link on the login page.",
      },
      {
        question: "Can I manage more than one business with one login?",
        answer: "Yes, switch between them any time from your dashboard.",
      },
      {
        question: "Who do I contact if I need help?",
        answer: "Use the Get in Touch form on our homepage, or reply to any of our emails, we respond within one business day.",
      },
    ],
  },
  // Agent Programme Phase 3: "Agent FAQ from Part 2, as an accordion on
  // /agents and in the main FAQ." Imported rather than retyped, because
  // agent-terms-and-faq.md opens with "Both must always say the same
  // thing", and these answers describe how someone gets paid. One array,
  // two pages, no chance of drift.
  {
    id: "agent-programme",
    title: "Agent Programme",
    items: AGENT_FAQ,
  },
];

const PAGE_TITLE = "Frequently Asked Questions";
const PAGE_DESCRIPTION = "Everything you need to know about DigitalFlyer Growth, every feature, plainly explained.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, url: "/faq" },
  twitter: { title: PAGE_TITLE, description: PAGE_DESCRIPTION },
};

export const revalidate = 3600;

export default function FaqPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />

      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-center font-display text-3xl uppercase tracking-wide text-ink sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-center text-gray-600">
            Every feature, plainly explained. Still have a question?{" "}
            <Link href="/pricing#get-in-touch" className="text-brand underline-offset-2 hover:underline">
              Get in touch
            </Link>
            .
          </p>

          {/* Jump list. Once expanded to 10 categories, scrolling past
              everything to find one answer defeats the point of this
              page. A visitor scanning for "how does billing work" should
              land there in one tap, not a scroll. */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {FAQ_CATEGORIES.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-brand hover:text-brand"
              >
                {cat.title}
              </a>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-12">
            {FAQ_CATEGORIES.map((cat) => (
              <div key={cat.id} id={cat.id} className="scroll-mt-20">
                <h2 className="mb-4 font-display text-xl uppercase tracking-wide text-ink">{cat.title}</h2>
                <FaqAccordion items={cat.items} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
