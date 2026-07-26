// Part 1 of docs/agent-terms-and-faq-v2.md, which replaces the previous
// terms entirely.
//
// THE GATE. v2's own header: "Legal review still needed on clauses 14 and
// 18 before publishing." Those are the two money clauses, 14 (commission
// clears, is held 14 days, then becomes available) and 18 (a refund or
// reversal comes off future earnings).
//
// Note the numbers moved. The previous version needed a legal read on 7.3
// and 8.4 under a section-and-subsection scheme; v2 renumbered to a single
// run of clauses 1 to 31, and the clauses now flagged are different ones.
// Anything sent for review under the old numbering is stale.
//
// While this is false, /agents/terms renders for an admin and returns a 404
// to everyone else, the same draft-then-publish shape an agent page uses,
// so the terms can be read and sent for review without being live. /agents
// links to it only when this is true.
export const AGENT_TERMS_PUBLISHED = false;

export type TermsSection = { title: string; clauses: { ref: string; text: string }[] };

export const AGENT_TERMS_LAST_UPDATED = "26 July 2026";

// v2 opens with a plain-language summary before the clauses, which is the
// same disclosure-first instinct the recruitment page is built on.
export const AGENT_TERMS_SUMMARY = [
  "You introduce a business to DigitalFlyer SA. They sign up and pay. You earn a share of what they pay, every year they stay.",
  "Yearly plans pay you 25%, and 40% once you have signed more than ten. Monthly plans pay you 10%. We pay out weekly, once you have R750 or more.",
  "That is the whole deal. The rest of this page is the detail.",
];

export const AGENT_TERMS: TermsSection[] = [
  {
    title: "What you are",
    clauses: [
      {
        ref: "1",
        text: "You are an independent contractor. Not an employee, not a partner, and you may not describe yourself as one. You set your own hours and work how you like.",
      },
      {
        ref: "2",
        text: "You handle your own tax. We do not deduct PAYE and we do not register you with SARS. If you are unsure what you owe, speak to a tax practitioner.",
      },
      {
        ref: "3",
        text: "You may run your own business at the same time, and many agents do. You get a separate page and dashboard for each, under one login.",
      },
      { ref: "4", text: "Applying does not guarantee acceptance. We may decline without giving a reason." },
    ],
  },
  {
    title: "How we know a signup came from you",
    clauses: [
      { ref: "5", text: "You get your own page and your own link. Anyone who arrives through either is held against your name for 30 days." },
      { ref: "6", text: "If they sign up in that time, they are yours permanently, for as long as your account is active." },
      { ref: "7", text: "Someone who signs up without using your link is not attributed to you. We do not add businesses to an agent afterwards." },
    ],
  },
  {
    title: "What you earn",
    clauses: [
      { ref: "8", text: "On any yearly plan you earn 25% of what the business pays. Once you have signed more than ten yearly members, you earn 40%." },
      { ref: "9", text: "On any monthly plan you earn 10%." },
      { ref: "10", text: "You earn again every year a member renews, for as long as your account is active." },
      {
        ref: "11",
        text: "Your rate is worked out fresh at every payment, using how many yearly members you have at that moment. This means your earlier members move up with you. Sign your eleventh yearly member, and when the first ten renew they pay you 40%.",
      },
      { ref: "12", text: "Your count of yearly members never goes down, even if one of them cancels." },
      { ref: "13", text: "Commission is worked out on the amount paid excluding VAT." },
    ],
  },
  {
    title: "Getting paid",
    clauses: [
      { ref: "14", text: "Commission is added to your account when the member's payment clears, held for 14 days in case it is reversed, and then available." },
      { ref: "15", text: "We pay out every week. If your available balance is R750 or more, all of it is paid to your bank account." },
      { ref: "16", text: "Under R750 it carries over. Anything sitting for more than 6 months is paid out in full at the next run, whatever the amount." },
      { ref: "17", text: "Keeping your bank details current is your responsibility. Your dashboard shows every amount and where it is, with the member and date behind each one." },
      { ref: "18", text: "If a payment you were paid commission on is later refunded or reversed, that amount comes off your next earnings. We will never invoice you or ask for money back." },
      {
        ref: "19",
        text: "If we cannot pay you because a transfer fails or we have no valid bank details, we hold the money for 90 days and try every contact detail we have, keeping a record. You can claim it any time in those 90 days by giving us working details. After 90 days it is forfeited. If an agent has died this does not apply, and the balance is settled with the estate.",
      },
    ],
  },
  {
    title: "Staying on the programme",
    clauses: [
      { ref: "20", text: "Sign in to your dashboard at least once every 60 days. That is the only requirement. There is no sales target." },
      { ref: "21", text: "If you have not signed in, we warn you at 30 days, 45 days, and a final time at 55 days, on every contact detail we hold. If you still have not signed in by day 60, your account closes." },
      { ref: "22", text: "When an account closes, your page and link stop working, and you stop earning on future payments including renewals. Those businesses become direct members." },
      { ref: "23", text: "Everything you have already earned is still yours. Your available balance is paid at the next weekly payout whatever the amount, and anything still clearing is paid once it clears." },
      { ref: "24", text: "You may apply to rejoin. You start from zero, and your previous businesses do not come back to you." },
    ],
  },
  {
    title: "How you work",
    clauses: [
      { ref: "25", text: "Be honest about what DigitalFlyer SA does. Do not promise results we have not promised and do not invent features." },
      { ref: "26", text: "Quote our published prices only. No prices, discounts, or packages of your own for DigitalFlyer SA products." },
      { ref: "27", text: "You may sell your own separate services alongside this, and your page has a place for them, as long as it is clear which is which." },
      { ref: "28", text: "No spam. No bulk unsolicited messaging, no bought contact lists, and no posting in groups against their rules. Meta closes accounts for this and it lands on our name as well as yours." },
      { ref: "29", text: "You can see contact details for the businesses attributed to you, so you can follow them up. Those details belong to DigitalFlyer SA and are shared with you under POPIA for that purpose only. Do not sell them, share them, or use them for anything else, and delete them if your account closes." },
      { ref: "30", text: "We may close an account immediately for a serious breach of this section, without the warnings in clause 21." },
    ],
  },
  {
    title: "Changes",
    clauses: [
      {
        ref: "31",
        text: "We may change these terms, and we will tell you at least 30 days before a change takes effect. Anything already earned or clearing is paid at the rate that applied when you earned it. If you do not accept a change you may close your account, and clauses 22 to 24 apply.",
      },
    ],
  },
];
