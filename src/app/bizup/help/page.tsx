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

export const metadata: Metadata = {
  title: "How KatisoBiz works",
  description:
    "How to send your first quote, turn it into an invoice, get paid, and hand everything to your accountant.",
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

      <section className="border-t border-neutral-border bg-neutral-surface px-4 py-14 sm:px-6">
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
