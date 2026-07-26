// Agent Programme Phase 3. Part 2 of docs/agent-terms-and-faq.md, in full.
//
// One source of truth on purpose. That document opens with "Both must
// always say the same thing. If a rule changes, change it in both", and
// this FAQ is rendered in two places (the /agents recruitment page and the
// main /faq help centre). Two hardcoded copies would be two chances for
// them to drift, on a set of answers that describe how someone gets paid.
//
// The copy document is also explicit that this goes in as-is: "Use the FAQ
// from agent-terms-and-faq.md Part 2, in full, as an accordion. Do not
// shorten it. The disclosure is the sales pitch." Nothing here is trimmed.
export const AGENT_FAQ: { question: string; answer: string }[] = [
  {
    question: "What does an agent actually do?",
    answer:
      "You introduce South African businesses to DigitalFlyer SA. When one of them becomes a paying member, you earn a share of what they pay, every year they stay.",
  },
  {
    question: "Do I need my own business to become an agent?",
    answer:
      "No. You do not need to be a member yourself and you do not need a business. Plenty of agents do have their own business, and that is fine too. You get a page and a dashboard for each.",
  },
  {
    question: "Does it cost anything to join?",
    answer:
      "No. There is no joining fee, no monthly fee, and nothing to buy. If anyone tells you otherwise, it is not us.",
  },
  {
    question: "What do I actually get?",
    answer:
      "Your own page with your name, your photo and your story, on your own web address that you can share anywhere. A dashboard showing who signed up, who is still on trial and who has paid. Ready made social posts. Scripts for what to say. And the contact details of the businesses you brought in, so you can follow them up.",
  },
  {
    question: "How much can I earn?",
    answer:
      "On a Growth Engine or Enterprise member paying annually, you earn 25% of what they pay. Once you have signed more than ten of those, every one earns 40%, including the first ten when they renew. Foundation members paying annually earn you 10%. Anyone paying monthly earns you nothing for their first three months and 10% after that.",
  },
  {
    question: "Why is monthly worth so much less?",
    answer:
      "Monthly members cost us more to carry and leave sooner. Annual members stay. The rates are built to point you at the sale that is worth more to both of us.",
  },
  {
    question: "Do I get paid again next year?",
    answer:
      "Yes. Every year a member you introduced renews, you earn on it again, for as long as your account is active.",
  },
  {
    question: "When do I get my money?",
    answer:
      "Commission is added to your account once the member's payment clears, held for 14 days, then paid out at the next weekly payout as long as your balance is R750 or more. If it takes a while to reach R750, it carries over, and anything sitting longer than six months is paid out regardless.",
  },
  {
    question: "Why R750?",
    answer: "Bank transfer costs make paying out very small amounts wasteful. The six month rule is there so nothing is ever stuck.",
  },
  {
    question: "What if someone cancels or gets a refund?",
    answer: "That amount comes off your next earnings. We never ask you to pay money back.",
  },
  {
    question: "What do I have to do to stay active?",
    answer:
      "Sign in to your dashboard at least once every 60 days. That is all. There is no sales target. If you have not signed in, we warn you three times before anything happens.",
  },
  {
    question: "What happens if I stop?",
    answer:
      "If you go 60 days without signing in, your page and link stop working and you stop earning on future renewals. Everything you have already earned is still paid to you.",
  },
  {
    question: "Can I say I work for DigitalFlyer SA?",
    answer:
      "No. You are independent, and you should say so. You are an agent, not an employee, and you handle your own tax.",
  },
  {
    question: "Can I set my own prices?",
    answer:
      "No. Quote our published prices. You are welcome to sell your own separate services alongside, and your page has a section for exactly that.",
  },
  {
    question: "How do you know a signup came from me?",
    answer:
      "Your page and your link carry your own code. Anyone who arrives through it is held against your name for 30 days, and if they sign up in that time they are yours permanently.",
  },
  {
    question: "How do I apply?",
    answer: "Fill in the form on the agent page. We look at every application and come back to you.",
  },
];
