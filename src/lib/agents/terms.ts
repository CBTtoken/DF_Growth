// Agent Programme Phase 3. Part 1 of docs/agent-terms-and-faq.md.
//
// THE GATE. The build spec is unambiguous: "/agents/terms from
// agent-terms-and-faq.md Part 1. Do not publish until Dewald confirms a
// legal read of sections 7.3 and 8.4." Those are the two forfeiture
// clauses: 7.3 (what happens to a balance when an account is deactivated)
// and 8.4 (an unclaimed balance is forfeited after 90 days).
//
// So the page is written and complete, and this one boolean decides
// whether the public can reach it. While it is false, /agents/terms
// renders for an admin and returns a 404 to everyone else, exactly the way
// a draft agent page does, so the terms can be read and sent for review
// without being published. /agents links to it only when this is true.
//
// Flip to true only after the legal read of 7.3 and 8.4 comes back.
export const AGENT_TERMS_PUBLISHED = false;

// Kept as structured data rather than prose in JSX so the numbering can
// never drift out of step with the source document, and so the same
// content can be rendered elsewhere (a PDF for the acceptance email is the
// obvious next use) without being retyped.
export type TermsSection = { number: string; title: string; clauses: { ref: string; text: string }[] };

export const AGENT_TERMS_LAST_UPDATED = "26 July 2026";

export const AGENT_TERMS: TermsSection[] = [
  {
    number: "1",
    title: "What an agent is",
    clauses: [
      {
        ref: "1.1",
        text: "An agent introduces South African businesses to DigitalFlyer SA and earns commission when those businesses become paying members.",
      },
      {
        ref: "1.2",
        text: "You are an independent contractor. You are not an employee, partner, or representative of DigitalFlyer SA, and you may not describe yourself as one. You set your own hours and choose how you work.",
      },
      {
        ref: "1.3",
        text: "You are responsible for your own tax on everything you earn here. We do not deduct PAYE and we do not register you with SARS. If you are unsure what you owe, speak to a tax practitioner.",
      },
      {
        ref: "1.4",
        text: "You may run your own business at the same time. Many agents do. Your business gets its own member page and dashboard, and your agent work gets its own agent page and dashboard, under the same login.",
      },
      { ref: "1.5", text: "Applying does not guarantee acceptance. We review every application and may decline without giving a reason." },
    ],
  },
  {
    number: "2",
    title: "How a referral is counted as yours",
    clauses: [
      { ref: "2.1", text: "You get a personal agent page with your own web address, and every link and button on it carries your referral code." },
      { ref: "2.2", text: "When someone reaches DigitalFlyer SA through your page or your link, that referral is held against your code for 30 days." },
      { ref: "2.3", text: "If they sign up within those 30 days, the business is attributed to you permanently, for as long as your account stays active." },
      { ref: "2.4", text: "If two agents have introduced the same business, the referral goes to whichever agent's link was used most recently before signup." },
      { ref: "2.5", text: "A business that signs up on its own, with no agent link, is a direct signup and earns no commission. We do not attribute businesses retrospectively." },
    ],
  },
  {
    number: "3",
    title: "What you earn",
    clauses: [
      { ref: "3.1", text: "There are two rates. Which one applies depends on the plan the business takes. On Growth Engine and Enterprise paid annually, your first 10 annual members earn 25% and from your 11th annual member onward you earn 40%. On Foundation paid annually you earn 10%. On any plan paid monthly you earn nothing for the first 3 months, then 10%." },
      { ref: "3.2", text: "Only Growth Engine and Enterprise annual members count toward your ten. Foundation and monthly members earn you commission but do not move you up the ladder." },
      { ref: "3.3", text: "Your count is cumulative for the life of your account. It never goes down, even if a member you signed cancels." },
      { ref: "3.4", text: "On monthly plans, the three unpaid months are counted as three cleared payments, not three calendar months. If a member pauses and comes back, their count carries on from where it stopped." },
      { ref: "3.5", text: "If a monthly member upgrades to an annual Growth Engine or Enterprise plan, they count toward your ten from that point, and you earn the annual rate that your count earns at that moment." },
      { ref: "3.6", text: "Commission is calculated on the amount paid excluding VAT." },
    ],
  },
  {
    number: "4",
    title: "Renewals",
    clauses: [
      { ref: "4.1", text: "You keep earning on a member every year they renew, for as long as your account stays active." },
      { ref: "4.2", text: "Your rate is worked out fresh at every payment, based on how many annual members you have at that moment. It is not fixed at signup." },
      { ref: "4.3", text: "This means your first ten move up with you. If you sign your eleventh annual member and then your earlier members renew, those renewals pay 40%, not 25%." },
      { ref: "4.4", text: "It also works the other way. If you are still at ten or fewer when your members renew, those renewals pay 25%." },
    ],
  },
  {
    number: "5",
    title: "When and how you get paid",
    clauses: [
      { ref: "5.1", text: "Commission is added to your ledger when a member's payment actually clears, not when they sign up." },
      { ref: "5.2", text: "Every amount is then held for 14 days before it becomes available. This covers reversed and disputed payments." },
      { ref: "5.3", text: "We run a payout every week. If your available balance is R750 or more, the full available balance is paid out." },
      { ref: "5.4", text: "If your balance stays under R750, it carries over. Any balance that has been sitting for longer than 6 months is paid out in full at the next run, whatever the amount." },
      { ref: "5.5", text: "Payment goes by bank transfer to the account you have saved with us. Keeping those details current is your responsibility." },
      { ref: "5.6", text: "Your dashboard shows every amount at every stage, pending, clearing, available, and paid, with the member and date behind each one." },
      { ref: "5.7", text: "If a payment we have already paid you commission on is later reversed or refunded, that amount is deducted from your next earnings. We will not invoice you for it or ask you to pay it back." },
    ],
  },
  {
    number: "6",
    title: "Staying active",
    clauses: [
      { ref: "6.1", text: "To stay active, sign in to your agent dashboard at least once every 60 days. That is the only requirement." },
      { ref: "6.2", text: "If you have not signed in, we will warn you at 30 days, again at 45 days, and a final time at 55 days, using every contact detail we hold for you." },
      { ref: "6.3", text: "If you still have not signed in by day 60, your account is deactivated." },
    ],
  },
  {
    number: "7",
    title: "What happens if your account is deactivated",
    clauses: [
      { ref: "7.1", text: "Your agent page and your referral link stop working." },
      { ref: "7.2", text: "You stop earning on your members, including on renewals. Those businesses become direct members of DigitalFlyer SA." },
      { ref: "7.3", text: "Everything you have already earned is still yours. Your available balance is paid out at the next weekly payout, whatever the amount, and anything still clearing is paid once it clears." },
      { ref: "7.4", text: "You may apply to rejoin. You start again from zero, and businesses you introduced before are not returned to you." },
    ],
  },
  {
    number: "8",
    title: "Money we cannot pay you",
    clauses: [
      { ref: "8.1", text: "If a payout fails, or we have no valid bank details for you, the amount is held for 90 days." },
      { ref: "8.2", text: "During those 90 days we will try to reach you on every contact detail we hold, and we keep a record of every attempt." },
      { ref: "8.3", text: "You can claim it at any point in those 90 days by giving us working bank details." },
      { ref: "8.4", text: "After 90 days, an unclaimed balance is forfeited." },
      { ref: "8.5", text: "If an agent has died, this clause does not apply. The account is frozen and the balance is settled with the estate." },
    ],
  },
  {
    number: "9",
    title: "How you may work",
    clauses: [
      { ref: "9.1", text: "Represent DigitalFlyer SA honestly. Do not promise results we have not promised, and do not invent features." },
      { ref: "9.2", text: "Quote our published prices only. Do not advertise your own prices, discounts, or packages for DigitalFlyer SA products." },
      { ref: "9.3", text: "You may sell your own separate services alongside this, and your agent page has a place for them, as long as it is clear which is which." },
      { ref: "9.4", text: "No spam. That includes bulk unsolicited messaging, buying contact lists, and posting in groups against their rules. Meta bans accounts for this, and it lands on our brand as well as yours." },
      { ref: "9.5", text: "You will see the contact details of businesses attributed to you, so you can follow up with them. Those details belong to DigitalFlyer SA and are shared with you under POPIA for that purpose only. You may not sell them, share them, or use them for anything else, and you must delete them if your account closes." },
      { ref: "9.6", text: "We may deactivate an account immediately for a serious breach of this section, without the warning ladder in section 6." },
    ],
  },
  {
    number: "10",
    title: "Changes",
    clauses: [
      { ref: "10.1", text: "We may change these terms. We will tell you at least 30 days before a change takes effect." },
      { ref: "10.2", text: "Commission already earned or clearing is paid at the rate that applied when it was earned." },
      { ref: "10.3", text: "If you do not accept a change, you may close your account, and section 7 applies." },
    ],
  },
];
