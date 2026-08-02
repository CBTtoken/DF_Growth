// Every question KatisoBiz answers, in one place.
//
// Moved out of the help page on 1 August 2026 so the help page and the FAQ
// page cannot drift apart. Two pages rendering two copies of the same
// answers is how a product ends up telling somebody two different things,
// and it splits the search ranking between them as well.
//
// The rule this file inherits, and it matters more than the structure:
// never describe something the product does not do. Every answer in here
// was checked against the code, not remembered.

export type FaqItem = { q: string; a: string };
export type FaqGroup = { heading: string; items: FaqItem[] };

/** Slug for the jump links and the anchor on each group. */
export function faqGroupId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const FAQ_GROUPS = [
  {
    heading: "Putting KatisoBiz on your phone",
    items: [
      {
        q: "Can I get a KatisoBiz icon on my phone like a normal app?",
        a: "Yes, and it takes about ten seconds. There is nothing to download from the Play Store or the App Store, and it uses almost no space on your phone. Once it is there, KatisoBiz opens full screen with your icon, exactly like any other app.",
      },
      {
        q: "How do I add it on an Android phone?",
        a: "Open katisobiz.co.za in Chrome and log in. On your home screen you will see a card that says Put KatisoBiz on your phone. Press Add to my phone, then press Install when your phone asks. That is it. If you do not see the card, press the three dots at the top right of Chrome and choose Add to Home screen or Install app.",
      },
      {
        q: "How do I add it on an iPhone?",
        a: "iPhones do not offer a button for this, so it is done by hand and it is easy once you know. Open katisobiz.co.za in Safari, it must be Safari and not Chrome. Press the Share button at the bottom of the screen, the square with an arrow pointing up out of it. Scroll down the list and press Add to Home Screen. Then press Add at the top right. The KatisoBiz icon is now on your phone with your other apps.",
      },
      {
        q: "Does it cost data or take up space?",
        a: "Almost none. It is not a download like a normal app, so there is nothing to install and no big file. It uses about the same data as opening the website, because that is what it is.",
      },
      {
        q: "Will I still get my documents if I remove the icon?",
        a: "Yes. Nothing is stored only on your phone. Removing the icon is like deleting a bookmark, your account, your quotes and your invoices are all still there when you log in again from anywhere.",
      },
    ],
  },
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
  // The four groups below were added 1 August 2026, from the questions
  // Dewald started getting more than once. Each answer was checked against
  // the code before it was written: the login really is email and password,
  // there really are exactly three notification emails, the public link
  // really has no expiry, and multi-user really is not built.
  {
    heading: "Getting in, and staying in",
    items: [
      {
        q: "How do I log in?",
        a: "With the email address and password you chose when you signed up. There is no code to wait for and nothing to install.",
      },
      {
        q: "I have forgotten my password",
        a: "On the login screen press Forgot your password. We email you a link to set a new one. If the email does not arrive within a minute or two, check your spam folder before trying again.",
      },
      {
        q: "Can I use it on my phone and my laptop?",
        a: "Yes, as many devices as you like. It is the same account and the same information on all of them, so a quote you start on the laptop is on your phone straight away.",
      },
      {
        q: "Can my wife or my assistant have their own login?",
        a: "Not yet. Today one account means one login, so if somebody else needs to send quotes they would use the same details as you. Extra users are planned and we will tell you when they arrive.",
      },
      {
        q: "I have changed my business name or my email",
        a: "Business name, address and VAT number are all in Settings under your business details, and they change what prints at the top of new documents. Documents you have already issued do not change, which is deliberate: an issued document is a record of what you sent. To change the email you log in with, message us and we will do it for you.",
      },
    ],
  },
  {
    heading: "What your customer sees",
    items: [
      {
        q: "Does my customer need an app or an account?",
        a: "No. They get a link. It opens on any phone or computer, with nothing to install and nothing to sign up for. If they would rather have a file, download the PDF from the document and send that instead. It is the same document.",
      },
      {
        q: "What is actually on the page they open?",
        a: "Your business details at the top, the line items and the total, and your banking details with your document number as the payment reference. It looks like the PDF, because it is the same document.",
      },
      {
        q: "Can anyone find that page on Google?",
        a: "No. The link is long and unguessable, and the page tells search engines not to index it. The only way to reach it is to have the link, which means the person you sent it to.",
      },
      {
        q: "Do I know if they have looked at it?",
        a: "Yes. The first time your customer opens the link we email you to say so, once, and the document is marked as Opened in your list. It is worth knowing before you follow up, because a quote nobody has opened is a different conversation from one they have read and gone quiet on.",
      },
      {
        q: "Does the link ever stop working?",
        a: "No, it stays live so an old quote can still be opened months later. If you send a corrected version, send the new link and use that one.",
      },
    ],
  },
  {
    heading: "Emails we send you",
    items: [
      {
        q: "What will KatisoBiz email me about?",
        a: "Three things, and only when they actually happen. When a customer first opens a document you sent. When a quote is about to pass its valid until date and you have not marked it accepted or declined. And when an invoice goes past its due date. That is the lot.",
      },
      {
        q: "Will you email my customers behind my back?",
        a: "Never. The only thing we send your customer is the document you chose to send, and only when you press send. Reminders go to you, so you decide whether to chase.",
      },
      {
        q: "I got a message asking how I am finding it",
        a: "That is us checking in during your first few days, and a reply comes straight to a person. If something is in your way we would rather hear it than guess. There is an unsubscribe link at the bottom of every one.",
      },
      {
        q: "How do I stop the emails?",
        a: "Every email we send has an unsubscribe link at the bottom. It stops the check-ins and the notifications. It never stops the document emails your customers receive, because those are yours, not ours.",
      },
    ],
  },
  {
    heading: "Your information",
    items: [
      {
        q: "Who can see my quotes and invoices?",
        a: "You, and anyone you send a link to. Nobody else using KatisoBiz can see your customers, your prices or your documents.",
      },
      {
        q: "Can I get my own information out?",
        a: "Yes. Reports has a CSV export of your documents, and the accountant package pulls everything for a period into one place. Both are yours to download whenever you like.",
      },
      {
        q: "What happens to my documents if I stop paying?",
        a: "They stay. Dropping to the free plan limits how many new documents you can issue each month, it does not take away what you have already done, and your history stays where it is.",
      },
      {
        q: "How long do you keep my records?",
        a: "Five years, because they are financial records and that is what the law expects of them. This is deliberately longer than we keep anything else, and it is set out in our privacy policy.",
      },
    ],
  },
];
