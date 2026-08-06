import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BizUpHeader } from "@/components/bizup/landing/BizUpHeader";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";
import { katisoPath } from "@/lib/bizup/product";
import { Btn, BtnOutline, BtnWhatsApp, BtnPaid, MenuItem } from "@/components/bizup/help/UiBits";

// The walkthrough: land on the page, sign up, get set up, send your first
// quote. Same shape as Growth's /how-it-works, which Dewald asked me to
// mirror, and built from real screenshots of the real product.
//
// Two rules about the pictures, and the second one is the important one.
//
// They are phone screenshots, because KatisoBiz is used on a phone in
// somebody's driveway, and a desktop screenshot would misrepresent the
// product a member actually holds.
//
// And a step only gets a picture if the picture is still true. The home
// screen was rebuilt on 30 July, three commits deep: b92aca5 led with the
// job rather than the numbers, 1851294 put the buttons first, and d7f67a5
// replaced the setup checklist with one button. The screenshots of that
// screen date from 28 July and show a four tile "Get to work" grid that no
// longer exists. Rather than show a new member a screen they will not find,
// those steps are drawn with the same button components the help page uses,
// which are generated from the real styles and cannot go stale.
//
// If those screens are re-shot, drop the files in
// public/katisobiz-how-it-works and add screenshot to the step.

const SHOT = "/katisobiz-how-it-works";

const PAGE_TITLE = "How to start on KatisoBiz";
const PAGE_DESCRIPTION =
  "From landing on the page to sending your first quote, with a picture of every screen. About ten minutes.";

export const metadata: Metadata = {
  metadataBase: new URL("https://katisobiz.co.za"),
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "https://katisobiz.co.za/how-it-works" },
  openGraph: {
    type: "article",
    siteName: "KatisoBiz",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "https://katisobiz.co.za/how-it-works",
    locale: "en_ZA",
    images: [{ url: "https://katisobiz.co.za/opengraph-image", width: 1200, height: 630, alt: "KatisoBiz" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["https://katisobiz.co.za/opengraph-image"],
  },
};

type Step = {
  n: string;
  title: string;
  body: React.ReactNode;
  time: string;
  shot?: { src: string; alt: string };
};

const STEPS: Step[] = [
  {
    n: "1",
    title: "See what it costs",
    body: (
      <>
        Free is a real plan, not a trial that stops working. Ten documents a month, forever, with no
        card. R49 lifts that to 75 a month and unlocks your own logo, all five templates, your
        customer list and the reports. You can start free and decide later.
      </>
    ),
    time: "A minute to read",
    shot: { src: `${SHOT}/step-01-pricing.jpg`, alt: "The KatisoBiz plans, free, R49 and R89 a month" },
  },
  {
    n: "2",
    title: "Sign up",
    body: (
      <>
        Four things: your business name, your mobile number, your email and a password. No card, and
        nothing to download. The email matters because it is how you log in and where your own
        copies go, so use one you actually check.
      </>
    ),
    time: "About a minute",
    shot: { src: `${SHOT}/step-02-sign-up.jpg`, alt: "The KatisoBiz signup form" },
  },
  {
    n: "3",
    title: "Enter the code we email you",
    body: (
      <>
        We send a code to that address to check it works. Type it in and you are in. If it has not
        arrived in a minute, check your spam folder, and there is a button to send a new one.
      </>
    ),
    time: "Seconds",
    shot: { src: `${SHOT}/step-03-email-code.jpg`, alt: "The screen asking for the code from your email" },
  },
  {
    n: "4",
    title: "You are in",
    body: (
      <>
        That is the account done. You could stop here and build a quote right now, but the next four
        steps are what make every document after this one look like it came from a real business.
      </>
    ),
    time: "",
    shot: { src: `${SHOT}/step-04-you-are-in.jpg`, alt: "The welcome screen after signing up" },
  },
  {
    n: "5",
    title: "Put in your business details",
    body: (
      <>
        <MenuItem>Settings</MenuItem> then <BtnOutline>Business details</BtnOutline>. Your name,
        address and phone print at the top of every document. This is what turns a quote from a
        WhatsApp message into something that looks like a business sent it.
      </>
    ),
    time: "About 2 minutes",
    shot: { src: `${SHOT}/step-05-business-details.jpg`, alt: "The business details form in Settings" },
  },
  {
    n: "6",
    title: "VAT, only if you are registered",
    body: (
      <>
        Put your VAT number in and every invoice becomes a proper Tax Invoice by itself, with the VAT
        worked out and shown. Leave it blank and KatisoBiz never mentions VAT again. Most members
        leave it blank, and that is normal.
      </>
    ),
    time: "A minute",
    shot: { src: `${SHOT}/step-06-vat-and-address.jpg`, alt: "The VAT number and address fields" },
  },
  {
    n: "7",
    title: "Add your banking details",
    body: (
      <>
        This is how you get paid, so nothing is more worth two minutes. It prints on every invoice
        with your invoice number as the reference, which is what lets you match a payment when it
        lands. Changing it later needs a code from your email, on purpose.
      </>
    ),
    time: "About 2 minutes",
    shot: { src: `${SHOT}/step-08-contact-details-filled.jpg`, alt: "Contact and banking details filled in" },
  },
  {
    n: "8",
    title: "Pick how your documents look",
    body: (
      <>
        Five templates on the paid plan, one on free. Pick the one that looks like your trade. You
        can change it later and it only affects new documents, so nothing you have already sent
        changes behind your back.
      </>
    ),
    time: "A minute",
    shot: { src: `${SHOT}/step-09-document-templates.jpg`, alt: "The document template choices" },
  },
  {
    n: "9",
    title: "Add your logo",
    body: (
      <>
        On the paid plan you can upload your own logo and it prints on every document. If you do not
        have one yet, your business name in clean type looks perfectly professional, and plenty of
        members never add one.
      </>
    ),
    time: "A minute",
    shot: { src: `${SHOT}/step-10-logo-and-members-list.jpg`, alt: "Uploading a logo" },
  },
  {
    n: "10",
    title: "Insurance rates, if you do that work",
    body: (
      <>
        If you quote insurance jobs at a different rate, switch this on and every price in your list
        gets a second price. The document decides which one it uses, so you never quote the wrong
        rate by accident. Ignore it entirely if it is not your world.
      </>
    ),
    time: "Optional",
    shot: { src: `${SHOT}/step-11-members-list-and-insurance.jpg`, alt: "The insurance pricing switch" },
  },
  {
    n: "11",
    title: "Save the prices you charge most",
    body: (
      <>
        <MenuItem>Price list</MenuItem> then <Btn>Add a price</Btn>. Your callout fee, your hourly
        rate, the parts you fit most. Every price saved here is one you never type again. You can
        skip it and add them from a quote as you go, which is what most members end up doing.
      </>
    ),
    time: "As long as you like",
  },
  {
    n: "12",
    title: "Start your first quote",
    body: (
      <>
        Your home screen opens on one big <Btn>Start a quote</Btn> button. Press it, then add what
        you are charging for. Search your price list or type a line straight in. The total works
        itself out as you go, and anything you type can be saved to your price list with one tap.
      </>
    ),
    time: "Under a minute once your prices are in",
  },
  {
    n: "13",
    title: "Put a customer on it",
    body: (
      <>
        Type their name straight into the quote. If they are new, that creates them without leaving
        the screen, so you never lose what you were doing. Only a name is required. Add a mobile
        number if you want to send it on WhatsApp.
      </>
    ),
    time: "Seconds",
  },
  {
    n: "14",
    title: "Issue it, then send it",
    body: (
      <>
        Press <Btn>Issue this quote</Btn>. That gives it a number and locks the amounts, which is
        what makes it a document rather than a draft. Then <BtnWhatsApp>Send on WhatsApp</BtnWhatsApp>
        . Your own WhatsApp opens with the message written and a link to the quote, and you press
        send yourself, so it arrives from your number. We email you when your customer opens it.
      </>
    ),
    time: "Seconds",
  },
  {
    n: "15",
    title: "Turn it into an invoice and get paid",
    body: (
      <>
        They said yes and the job is done, so open the quote and press <Btn>Turn into invoice</Btn>.
        Nothing is retyped. Send it the same way, and when the money lands press{" "}
        <BtnPaid>Mark paid</BtnPaid>. Now your reports know what you have earned, what you are owed
        and who is behind.
      </>
    ),
    time: "Seconds",
  },
];

/** The tour, for after the first quote is out. */
const TOUR = [
  { name: "Quotes", shot: `${SHOT}/step-16-quotes.jpg`, alt: "The quotes screen", what: "Everything you have quoted, and where you build a new one." },
  { name: "Invoices", shot: `${SHOT}/step-17-invoices.jpg`, alt: "The invoices screen", what: "Everything you have invoiced, and what is still owed." },
  { name: "History", shot: `${SHOT}/step-18-history.jpg`, alt: "The history screen", what: "Everything finished with, searchable by number or customer." },
  { name: "Reports", shot: `${SHOT}/step-19-reports.jpg`, alt: "The reports screen", what: "What you quoted, won, invoiced and were actually paid." },
  { name: "The menu", shot: `${SHOT}/step-15-menu.jpg`, alt: "The KatisoBiz menu", what: "Every screen is one tap from here." },
  { name: "Help", shot: `${SHOT}/step-20-help.jpg`, alt: "The help screen", what: "This guide, and a way to reach a person." },
];

export default async function KatisoBizHowItWorksPage() {
  const [signupHref, helpHref, faqHref] = await Promise.all([
    katisoPath("/signup"),
    katisoPath("/help"),
    katisoPath("/faq"),
  ]);
  return (
    <main className="flex flex-1 flex-col bg-white">
      <BizUpHeader />

      <section className="border-b border-neutral-border bg-brand-blue-light px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink lg:text-4xl">
            From signing up to your first quote
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-neutral-mid">
            Fifteen steps, most of them under a minute. Do the first four and you can quote. The rest
            is what makes it look like a real business sent it.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={signupHref} className="btn-accent-lg">
              Start free, no card needed
            </Link>
            <Link href={faqHref} className="btn-outline px-6 py-3">
              Questions and answers
            </Link>
            <Link href={helpHref} className="btn-outline px-6 py-3">
              Full guide
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-14">
          {STEPS.map((step) => (
            <div key={step.n} className="flex flex-col gap-5 sm:flex-row sm:gap-8">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-base font-bold text-white">
                    {step.n}
                  </span>
                  <h2 className="text-xl font-bold text-neutral-ink">{step.title}</h2>
                </div>
                <p className="mt-3 leading-relaxed text-neutral-mid">{step.body}</p>
                {step.time && <p className="mt-2 text-sm text-neutral-muted">{step.time}</p>}
              </div>

              {step.shot && (
                <div className="shrink-0 sm:w-56">
                  {/* The phone frame is the point: a member should recognise
                      this as the thing in their hand. */}
                  <div className="overflow-hidden rounded-2xl border-4 border-neutral-ink bg-neutral-ink shadow-lg">
                    <Image
                      src={step.shot.src}
                      alt={step.shot.alt}
                      width={576}
                      height={1240}
                      sizes="(min-width: 640px) 224px, 100vw"
                      className="h-auto w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-border bg-neutral-surface px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-ink">
            The rest of it, once you are going
          </h2>
          <p className="mt-2 text-neutral-mid">
            You do not need any of this to send your first quote. It is here for when you want it.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TOUR.map((item) => (
              <div key={item.name} className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-xl border-4 border-neutral-ink bg-neutral-ink shadow">
                  <Image
                    src={item.shot}
                    alt={item.alt}
                    width={576}
                    height={1240}
                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 45vw, 100vw"
                    className="h-auto w-full"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-ink">{item.name}</h3>
                  <p className="text-sm text-neutral-mid">{item.what}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-neutral-border bg-white p-6 text-center">
            <p className="text-lg font-bold text-neutral-ink">That is the whole thing</p>
            <p className="mt-1 text-neutral-mid">
              Ten documents a month free, forever, with no card. Your first quote can go out in the
              next ten minutes.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href={signupHref} className="btn-accent-lg">
                Start free
              </Link>
              <Link href={helpHref} className="btn-outline px-6 py-3">
                Read the full guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      <BizUpFooter />
    </main>
  );
}
