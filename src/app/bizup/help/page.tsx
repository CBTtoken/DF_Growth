import type { Metadata } from "next";
import Link from "next/link";
import { BizUpHeader } from "@/components/bizup/landing/BizUpHeader";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";

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
  },
  twitter: { card: "summary_large_image", title: "How KatisoBiz works", description: HELP_DESCRIPTION },
};

const STEPS = [
  {
    n: "1",
    title: "Put in your business details",
    body: "Settings, then Business details. Your business name, address and phone go on every document. If you are registered for VAT, put your VAT number in here too and every invoice becomes a proper Tax Invoice by itself. If you are not registered, leave it blank and KatisoBiz never mentions VAT again.",
    time: "About 2 minutes",
  },
  {
    n: "2",
    title: "Add your banking details",
    body: "Settings, then Banking details. This is how your customer pays you, so nothing gets paid until it is done. You enter it once and it prints on every invoice. Changing it later needs a code from your email, on purpose, so that nobody who gets into your account can quietly swap in their own account number.",
    time: "About 2 minutes",
  },
  {
    n: "3",
    title: "Save the prices you charge most",
    body: "Price list, then Add a price. Your callout fee, your hourly rate, the parts you fit most often. You do not have to do this first, and you can skip it entirely, but every price you save here is one you never type again. You can also save a price straight off a quote later, so the list builds itself while you work.",
    time: "As long as you like, and you can come back",
  },
  {
    n: "4",
    title: "Build your first quote",
    body: "New quote on the home screen. Choose the customer, or add them right there if they are new. Tap prices from your list, or type a one-off line. The total works itself out as you go.",
    time: "Under a minute once your prices are in",
  },
  {
    n: "5",
    title: "Send it",
    body: "Press Issue, which gives the quote its number, then Send on WhatsApp. It opens WhatsApp on your own phone with the message already written and a link to the quote. It comes from your number, so your customer sees a name they know. You can see when they open it.",
    time: "Seconds",
  },
  {
    n: "6",
    title: "Turn it into an invoice and get paid",
    body: "Customer says yes and the job is done, so open the quote and press Turn into invoice. Nothing is retyped. Send it the same way. When the money lands, press Mark as paid, or record a part payment if they paid some of it.",
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

const FAQ_GROUPS = [
  {
    heading: "Quotes and invoices",
    items: [
      {
        q: "How do I send a quote on WhatsApp?",
        a: "Open the quote, press Issue to give it a number, then press Send on WhatsApp. It opens WhatsApp on your phone with the message ready. You press send yourself, from your own number, so it is not us messaging your customer.",
      },
      {
        q: "Does my customer need to install anything?",
        a: "No. They get an ordinary link that opens on any phone or computer. They do not sign up for anything and they do not need an account.",
      },
      {
        q: "What is the difference between a draft and an issued document?",
        a: "A draft is yours to change as much as you like and has no number. Issuing gives it a number and locks the amounts, which is what SARS expects. A draft does not count towards your monthly document count.",
      },
      {
        q: "How do I turn a quote into an invoice?",
        a: "Open the quote and press Turn into invoice. Everything copies across. It arrives as a draft, so you can adjust it for what actually happened on the day before you send it.",
      },
      {
        q: "Can I make an invoice without doing a quote first?",
        a: "Yes. New invoice on the home screen. Some jobs never get quoted and that is normal.",
      },
      {
        q: "I sent an invoice with a mistake on it. How do I fix it?",
        a: "Open the invoice and press Fix this invoice. It asks you one question: does the amount need to change? If only the details were wrong, it corrects them and keeps the same number and date. If the amount was wrong, it cancels the old one properly with a credit note and gives you a new one. Both are kept, which is what the law requires. The button only appears once an invoice has been issued, because there is nothing to fix on a draft.",
      },
    ],
  },
  {
    heading: "Getting paid",
    items: [
      {
        q: "My customer paid me cash before I made the invoice. What do I do?",
        a: "On the draft invoice there is a section called Already paid something. Put in the amount, the date and how they paid. The invoice then shows the full amount, then what they already paid, then the balance still owing. Nothing gets hidden and your VAT stays correct.",
      },
      {
        q: "They only paid half. How do I record that?",
        a: "On the invoice, press Part payment and type the amount. The invoice shows as partly paid and the balance updates. Do it again when the rest arrives.",
      },
      {
        q: "How do I see who still owes me?",
        a: "The home screen shows what you are owed. Reports shows it broken down by how overdue it is: inside terms, over 30 days, over 60, over 90. That last group is the one to phone about.",
      },
      {
        q: "How do I chase a customer who owes me for several jobs?",
        a: "Reports, then Customer statement. Pick the customer and the period. It lists every invoice, every payment and the balance at the bottom, and you can send it on WhatsApp or download it. It is much harder to argue with than a message saying you still owe me for the geyser.",
      },
    ],
  },
  {
    heading: "VAT and SARS",
    items: [
      {
        q: "Do I need to be registered for VAT?",
        a: "Most small businesses are not, and you do not need to be to use KatisoBiz. You only have to register once your sales pass R2.3 million in any twelve months, and you may choose to register once you pass R120,000. Until then your documents say Invoice and no VAT is added anywhere.",
      },
      {
        q: "How do I turn VAT on?",
        a: "Settings, Business details, and enter your VAT number. From then on your invoices are titled Tax Invoice, show your VAT number and work out the 15% for you. Documents you have already sent do not change, which is correct: they were right when you sent them.",
      },
      {
        q: "How close am I to having to register?",
        a: "Reports has a VAT turnover section. It adds up your last twelve months of sales and shows you against both markers. It always looks at twelve months no matter which period you picked, because that is how SARS measures it.",
      },
      {
        q: "Why is it asking for my customer's full address on a big invoice?",
        a: "Once a VAT invoice goes over R5,000, SARS wants the customer's full name and address on it. KatisoBiz asks at the moment you cross that line rather than letting you send something that is not right.",
      },
      {
        q: "How long do I need to keep my invoices?",
        a: "SARS generally wants five years. KatisoBiz keeps them for you and you can download the lot at any time.",
      },
    ],
  },
  {
    heading: "Your prices and your customers",
    items: [
      {
        q: "How do I add a price I use often?",
        a: "Price list, then Add a price. Give it a name you will recognise, say how it is charged (per hour, per job, each) and put in the price.",
      },
      {
        q: "I typed a price on a quote. Can I keep it?",
        a: "Yes. On that line press Save to price list and it is there next time. The line keeps the price you typed.",
      },
      {
        q: "I buy parts and sell them on. Can it add my markup?",
        a: "Yes. On the price, choose Percentage or Rand amount and put in your markup. It shows you what it will actually bill at before you save.",
      },
      {
        q: "I charge different rates for insurance work. Can it handle that?",
        a: "Yes, but it is off until you ask for it. Settings, Business details, Insurance work, then Turn insurance rates on. Each price then gets a private price and an insurance price, and every quote has a choice at the top of which rates to use. Leave an insurance price blank and it just uses the private one.",
      },
      {
        q: "I have a lot of prices. How do I find one?",
        a: "Start typing in the box above your price list on a quote and it narrows down as you type.",
      },
    ],
  },
  {
    heading: "How your documents look",
    items: [
      {
        q: "Can I put my logo on them?",
        a: "Yes, on the R49 plan. Settings, Business details, Your logo. It appears at the top of everything you send from then on. Anything already sent stays as your customer received it.",
      },
      {
        q: "Can I change the layout?",
        a: "Yes. Settings, Business details, How your documents look. There are five to choose from. The free plan uses Clean; the other four come with the R49 plan.",
      },
      {
        q: "Why do my banking details have a warning next to them?",
        a: "Because invoice fraud is common here. Someone intercepts an invoice, changes the account number and your customer pays a stranger. The line tells your customer that your details never change and to phone you if they get a message saying otherwise. You can turn it off in Settings if you would rather not have it.",
      },
    ],
  },
  {
    heading: "Your accountant, and your records",
    items: [
      {
        q: "How do I give everything to my accountant?",
        a: "Reports, then Export for my accountant. Pick the period and it makes a link. Send that link to your accountant on WhatsApp or email. They get one file with every invoice, credit note and payment as spreadsheets they can open in Excel, all the PDFs, and a cover page with the totals.",
      },
      {
        q: "Why a link and not just a file?",
        a: "Because that file has your customers' names and addresses in it, and an attachment sits in an inbox forever. The link stops working after 14 days, and you can stop it sooner from the same screen. You can also see whether your accountant has opened it.",
      },
      {
        q: "I do not have an accountant. Can you help?",
        a: "There is a link on that screen to find one on the DigitalFlyer SA marketplace.",
      },
      {
        q: "Where do I find an old quote or invoice?",
        a: "History in the top menu. It holds everything you have finished with, split into quotes and invoices, and you can search by number or by customer name. Anything still open stays on the Quotes and Invoices screens.",
      },
    ],
  },
  {
    heading: "Plans and payment",
    items: [
      {
        q: "Is the free plan really free?",
        a: "Yes. Ten documents a month, every month, no card. A quote and an invoice count as two documents. Drafts do not count, only what you send.",
      },
      {
        q: "What happens if I run out of documents?",
        a: "You can carry on building quotes, you just cannot send them until you add more. You will have seen a counter all month and warnings as you got close, so it should not be a surprise.",
      },
      {
        q: "How do I upgrade?",
        a: "Settings, then Your plan. Or tap the document counter on your home screen. You can pay for R49 a month, R89 a month, or buy a one-off top up of 75 more documents. Top ups never expire.",
      },
      {
        q: "I already pay for DigitalFlyer Growth. Do I pay again?",
        a: "No. KatisoBiz comes with Growth Engine and Enterprise at no extra cost. Your plan screen will say so and will not offer you anything to buy.",
      },
      {
        q: "Can I cancel?",
        a: "Yes, any time, and you keep everything you have already made. You go back to the free plan rather than losing your records.",
      },
    ],
  },
  {
    heading: "Chasing money",
    items: [
      {
        q: "How do I remind someone who has not paid?",
        a: "Once an invoice passes its due date it appears in a chasing section on your home screen with a Send a reminder button. Press it and WhatsApp opens with the message already written, including what they owe and a link to the invoice. You press send. KatisoBiz never messages your customers by itself.",
      },
      {
        q: "What does the reminder say?",
        a: "It is polite and short, because most people find asking for money awkward and that is why they put it off. It greets them by name, says which invoice and how much, mentions the due date, gives them the link, and says that if they have already paid they should ignore it. You can edit it in WhatsApp before sending.",
      },
      {
        q: "Does it chase the full amount if they part paid?",
        a: "No. It chases what is actually still owing. Reminding someone for the full amount after they have paid half makes you look disorganised.",
      },
      {
        q: "Will it nag my customer?",
        a: "Never on its own. It also shows you when you last reminded them, so you do not accidentally chase the same person twice in a morning.",
      },
      {
        q: "How do I know who is worst?",
        a: "Reports shows who is behind, grouped by how overdue: inside terms, over 30 days, over 60, over 90. Tap any group to see exactly which invoices are in it.",
      },
    ],
  },
  {
    heading: "Reports and what they mean",
    items: [
      {
        q: "What does the win rate mean?",
        a: "How many of the quotes you sent in that period were accepted. If you sent ten and won four, it says 40%. It stays blank rather than showing 0% when you have not sent any, because 0% would be a lie.",
      },
      {
        q: "Why does the outstanding figure not change when I change the period?",
        a: "Because what you are owed is what you are owed today, not what you were owed in March. The same is true of the aged groups and of open quotes. Those figures say As things stand today when you open them.",
      },
      {
        q: "What does 61 to 90 days mean exactly?",
        a: "How far past the due date it is, not how old the invoice is. An invoice sent last week on 30 day terms is not late, so it sits in the first group rather than being counted against you.",
      },
      {
        q: "Why does the VAT report ignore the period I picked?",
        a: "Because SARS measures your turnover over any twelve months in a row, so that figure always covers twelve months no matter what period you are looking at. Changing the period would give you a number SARS does not use.",
      },
      {
        q: "Can I get the numbers into a spreadsheet?",
        a: "Yes. Download as CSV on the reports screen, and on any customer statement. They open in Excel.",
      },
    ],
  },
  {
    heading: "Your information and your customers' information",
    items: [
      {
        q: "Who can see my customer list?",
        a: "Nobody else using KatisoBiz. Your data is separated from every other business on the platform and is never shared with them. Our staff do not access it in the course of normal support.",
      },
      {
        q: "Are my banking details safe?",
        a: "They are encrypted, and reading them is restricted and logged. Changing them needs a code sent to your email, which exists so that somebody who gets into your account cannot quietly swap in their own account number.",
      },
      {
        q: "Why does my invoice show my full account number?",
        a: "Because your customer has to be able to pay you. It is on the document you chose to send them, the same as it would be on a printed invoice.",
      },
      {
        q: "What happens to my customers' details?",
        a: "They are yours. We hold them so the product can work, and we act on your instructions with them, not on our own. If one of your customers asks us to delete their information we refer them to you, because it is your relationship, not ours.",
      },
      {
        q: "How long is everything kept?",
        a: "Financial records are kept for five years, because SARS requires it. You can download everything at any time.",
      },
    ],
  },
  {
    heading: "When something is not working",
    items: [
      {
        q: "My code did not arrive",
        a: "Check your spam folder first, that is usually it. On the code screen there is a Send me a new code button, and a Start again button if you typed your email wrong. The code is longer than six digits, so make sure you have copied all of it.",
      },
      {
        q: "My customer says the link does not open",
        a: "The link works on any phone or computer with no login. If they are struggling, download the PDF from the document and send them that instead. It is the same document.",
      },
      {
        q: "I cannot send a quote",
        a: "Two usual reasons. Either you have not chosen a customer yet, or you have used up this month's documents. The screen will say which.",
      },
      {
        q: "Something else is wrong",
        a: "WhatsApp us on +27 72 311 0570 or email info@digitalflyer.co.za. Tell us the document number if it is about a particular quote or invoice, it makes it much quicker.",
      },
    ],
  },
];

export default function BizUpHelpPage() {
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
            <Link href="/bizup/signup" className="btn-accent-lg">
              Create your first quote free
            </Link>
            <Link href="/bizup" className="btn-outline px-6 py-3">
              Back to KatisoBiz
            </Link>
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

      <section className="border-t border-neutral-border px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-ink">
            How do I ...
          </h2>
          <p className="mt-2 text-neutral-mid">Tap a question to see the answer.</p>

          <div className="mt-8 flex flex-col gap-8">
            {FAQ_GROUPS.map((group) => (
              <div key={group.heading}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-muted">
                  {group.heading}
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {group.items.map((item) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-neutral-border bg-white px-4 py-3"
                    >
                      <summary className="cursor-pointer list-none font-semibold text-neutral-ink marker:content-none">
                        <span className="flex items-start justify-between gap-3">
                          <span>{item.q}</span>
                          <span
                            aria-hidden
                            className="mt-1 shrink-0 text-neutral-muted transition group-open:rotate-45"
                          >
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-2 leading-relaxed text-neutral-mid">{item.a}</p>
                    </details>
                  ))}
                </div>
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
