// Part 2 of docs/agent-terms-and-faq-v2.md, in full.
//
// One source of truth on purpose. That document opens with "They must
// always say the same thing", and this FAQ renders in two places (the
// /agents recruitment page and the main help centre). Two hardcoded copies
// would be two chances for them to drift, on a set of answers that describe
// how someone gets paid.
//
// v2 changed the commercial substance, not just the wording: the Foundation
// 10% carve-out is gone (any yearly plan pays the same), and the three
// month delay on monthly is gone (monthly pays 10% from the first cleared
// payment). lib/agents/commission.ts implements exactly these rules.
export const AGENT_FAQ: { question: string; answer: string }[] = [
  {
    question: "What does an agent actually do?",
    answer:
      "You introduce South African businesses to DigitalFlyer SA. When one becomes a paying member, you earn a share of what they pay, every year they stay.",
  },
  {
    question: "Does it cost anything to join?",
    answer:
      "No. No joining fee, nothing to buy, no monthly cost. If anyone asks you to pay to be an agent, it is not us.",
  },
  {
    question: "Do I need my own business?",
    answer:
      "No. You do not need a business and you do not need to be a member yourself. If you do have a business, you can run both, with a page and dashboard for each.",
  },
  {
    question: "How much do I earn?",
    answer: "25% on any yearly plan, rising to 40% once you have signed more than ten yearly members. 10% on monthly plans.",
  },
  {
    question: "Does the 40% apply to the members I signed before that?",
    answer:
      "Yes, when they renew. Your rate is worked out fresh at every payment, so your eleventh sale lifts everything you have already built.",
  },
  {
    question: "Why is yearly worth more than monthly?",
    answer:
      "Yearly members stay, and the money arrives upfront. The rates point you at the sale that is worth more to both of us.",
  },
  {
    question: "Do I get paid again next year?",
    answer: "Yes, every year they renew, for as long as your account is active.",
  },
  {
    question: "When do I actually get the money?",
    answer:
      "Commission lands in your account when the member's payment clears, sits for 14 days, then goes out at the next weekly payout as long as you have R750 or more. Under R750 it carries over, and anything sitting more than six months gets paid regardless.",
  },
  {
    question: "Why R750?",
    answer: "Bank transfer fees make very small payouts wasteful. The six month rule means nothing ever gets stuck.",
  },
  {
    question: "What if a member gets a refund?",
    answer: "It comes off your next earnings. We never ask you to pay money back.",
  },
  {
    question: "What do I have to do to stay on?",
    answer:
      "Sign in to your dashboard once every 60 days. There is no target and no quota, and we warn you three times before anything happens.",
  },
  {
    question: "What happens if I stop?",
    answer:
      "Your page and link stop working and you stop earning on future renewals. Everything you have already earned is still paid to you.",
  },
  {
    question: "Can I say I work for DigitalFlyer SA?",
    answer: "No. You are independent, you choose your own hours, and you handle your own tax.",
  },
  {
    question: "Can I set my own prices?",
    answer:
      "No, quote ours. You are welcome to sell your own separate services alongside, and your page has a section for exactly that.",
  },
  {
    question: "How do I apply?",
    answer: "Fill in the form on the agent page. We read every one and come back to you either way.",
  },
];
