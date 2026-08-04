/**
 * The Help Centre's content, as data: every guide renders through the
 * same page, screenshots slot in per step when they exist, and adding a
 * guide is adding an entry here, not building a page.
 *
 * Written for the member the handoff describes: a household on a
 * mid-range phone. Rules for every line: one idea per sentence, name the
 * button by its colour and words, never assume the reader knows what a
 * dashboard or a browser tab is, and never promise what the platform
 * does not do.
 */

export type HelpStep = {
  title: string;
  body: string;
  /** Path under /public, a 360px-wide phone screenshot where one exists. */
  image?: string;
  imageAlt?: string;
};

export type HelpGuide = {
  slug: string;
  title: string;
  category: "Getting started" | "Your coupons" | "The draw" | "Referrals" | "Your account";
  summary: string;
  steps: HelpStep[];
};

export const HELP_GUIDES: HelpGuide[] = [
  {
    slug: "join",
    title: "Becoming a member",
    category: "Getting started",
    summary: "From the front page to a paid membership, one small step at a time. About three minutes.",
    steps: [
      {
        title: "Open the site and find the yellow button",
        body: "Type smartvalueclub.co.za into your phone's internet app, or tap the link someone sent you. The yellow button that says Join is right there on the first screen. Tap it.",
        image: "/svc/help/join-home.png",
        imageAlt: "The Smart Value Club front page with the yellow Join button",
      },
      {
        title: "Fill in the form, five things only",
        body: "Your first name. Your surname. Your cell number, the one you always have with you, because it becomes your membership number. Your email address. And a password you choose yourself; write it somewhere safe. Then tick the first box, which gives us permission to run your membership. The second box is only for news and specials, and it is your choice.",
        image: "/svc/help/join-form.png",
        imageAlt: "The join form with its five fields and two tick boxes",
      },
      {
        title: "Tap the yellow Create my account button",
        body: "The site now sends a code to your email to make sure your number is really yours. Go to your email app and look for a message from Smart Value Club. The code is six numbers, nice and big.",
      },
      {
        title: "Type in the six numbers",
        body: "Back on the site, put the six numbers in the box and tap Confirm my number. If the email has not arrived after two minutes, look in your Spam or Junk folder first, then use the Send me a fresh code button.",
      },
      {
        title: "Pay, and you are in",
        body: "The last screen shows your package and the price. Tap the payment button and follow it through; it is a secure payment page. The moment it finishes, your membership is active and a welcome email is on its way to you.",
      },
      {
        title: "Save the site like an app",
        body: "So you never have to type the address again: with the site open, tap your browser's menu button (the three dots or the share arrow) and choose Add to Home Screen. Now Smart Value Club sits on your phone like any other app.",
      },
    ],
  },
  {
    slug: "dashboard",
    title: "Your dashboard, explained",
    category: "Getting started",
    summary: "The screen you land on when you log in, and what every block on it means.",
    steps: [
      {
        title: "The big number at the top is YOUR savings",
        body: "It counts only the Rand value of coupons you have actually used. If you have not used any yet, it shows what is waiting for you instead. We never show a made-up number, so if it says R0, that is the truth, and it grows the first time you use a coupon.",
        image: "/svc/help/dashboard.png",
        imageAlt: "The dashboard with the savings counter and the two big tiles",
      },
      {
        title: "Two big tiles: My coupons and The draw",
        body: "The green tile takes you to your coupons and shows how many are waiting. The blue tile jumps to this month's draw and shows how many entries you hold. These two are why most people open the app, so they sit right at the top.",
      },
      {
        title: "Your benefits for the month",
        body: "Below the tiles is everything this month's membership gave you: your coupon packs, the Moxie magazine, your e-course and your e-book. Each one is a card with one clear button for what to do next.",
      },
      {
        title: "Tell a friend",
        body: "Your personal sharing link lives here, with a WhatsApp button, and three honest numbers: who joined through you, what you earned this month, and your balance. There is a whole guide on this one; find Referrals in the Help Centre.",
      },
      {
        title: "The bottom of the page is housekeeping",
        body: "Your membership details, the question about which shop we should get coupons for next (answer it, we really do read them), the Help Centre link, Log out, and the cancel link. Nothing down there needs you daily.",
      },
    ],
  },
  {
    slug: "coupons-arrive",
    title: "Getting your coupons each month",
    category: "Your coupons",
    summary: "When they come, how you will know, and where to find them.",
    steps: [
      {
        title: "They arrive on the 1st of the month",
        body: "Every month, on the first day of the month, a fresh set of coupons is put into every paid member's account. You do not have to do anything to receive them.",
      },
      {
        title: "We email you when they land",
        body: "Look for a message saying your benefits are ready. No email? Check Spam or Junk once; if it is there, mark it as Not Spam so next month's lands in your inbox.",
      },
      {
        title: "Find them under My coupons",
        body: "Log in, and tap the green My coupons tile at the top of your dashboard. Everything for the month is there, each coupon pack with its own card and value.",
        image: "/svc/help/coupons.png",
        imageAlt: "The My coupons screen with the month's coupon packs",
      },
      {
        title: "Last month's coupons do not roll over",
        body: "When the new month's set arrives, the old set is finished. Use them while they are fresh; that is what they are for.",
      },
    ],
  },
  {
    slug: "coupons-use",
    title: "Using your coupons in the shop",
    category: "Your coupons",
    summary: "Taking a coupon shopping, the one till trick worth knowing, and the button that grows your savings number.",
    steps: [
      {
        title: "Open the coupon before you shop",
        body: "On My coupons, tap the green button on a coupon pack. It opens and shows you the details, and its code where one exists. Then tap Add to my coupons for this trip so it is ready.",
      },
      {
        title: "The one till trick: two payments",
        body: "A coupon discount and your store loyalty card discount cannot both count on the same product. So at the till, do this: pay for your coupon products as one purchase, and everything else with your loyalty card as a second purchase. Same trolley, same queue, both savings.",
      },
      {
        title: "After shopping, tap I used this",
        body: "Back on the coupon's card, tap the black I used this button and type in what you saved if you know the amount. That is the moment your savings counter at the top of the dashboard grows, and it also earns you extra draw entries.",
      },
      {
        title: "Why we ask you to tell us",
        body: "Nobody reports your till slip to us, so your word is what keeps your savings number honest. It only ever counts what you say you used, which is why it is a number you can trust.",
      },
    ],
  },
  {
    slug: "draw",
    title: "The monthly draw",
    category: "The draw",
    summary: "Free entries for being a member, extra entries for really saving, and a result anyone can check.",
    steps: [
      {
        title: "You are in automatically",
        body: "Every paid member gets free entries every month. No forms, no cost, nothing to do. Your dashboard's draw block shows exactly how many you hold.",
        image: "/svc/help/draw.png",
        imageAlt: "The draw block on the dashboard showing free, earned and purchased entries",
      },
      {
        title: "Earn more entries by saving",
        body: "Every R50 of coupon value you actually use earns one more entry. The draw block shows a line like R30 more and you earn another entry, so you always know where you stand.",
      },
      {
        title: "Entries lock at the cutoff",
        body: "Each draw shows its closing date and time. At that moment all entries freeze, and nothing and nobody can change them, including us. That is your protection.",
      },
      {
        title: "The winner is drawn and published",
        body: "A computer picks the winning entry at random, and the result is published on the site with the numbers that prove it was fair. Winners get an email in the first week of the new month. If you win, we contact you on your email to arrange the prize.",
      },
    ],
  },
  {
    slug: "referrals",
    title: "Tell a friend and earn a thank-you",
    category: "Referrals",
    summary: "Your link, the honest rules, and the three numbers that show where you stand.",
    steps: [
      {
        title: "Find your link on the dashboard",
        body: "In the Tell a friend block is your personal link and a green Share on WhatsApp button. Send it to anyone you like.",
      },
      {
        title: "What happens when they join",
        body: "When someone joins through your link and pays their membership, you earn a small amount every month that they stay active. If they ever skip a month, you simply do not earn for them that month.",
      },
      {
        title: "The honest rules, up front",
        body: "It goes three levels: people you invited, people they invited, and one level more. Never further. Your own coupons and draw entries never depend on inviting anyone. There are no teams, no ranks, and nothing to buy. This is a thank-you, not a job.",
      },
      {
        title: "Where the money shows",
        body: "Three numbers in the same block: people joined at each level, this month's earning, and your balance. Earnings are worked out once a month, so a new signup shows in your people count straight away but in your money after the month's run.",
      },
    ],
  },
  {
    slug: "account",
    title: "Logging in, passwords and leaving",
    category: "Your account",
    summary: "The two ways in, what to do when a password is lost, and how cancelling really works.",
    steps: [
      {
        title: "Two ways to log in",
        body: "Email and password is one way. Your cell number is the other: tap Log in with my cell number, and we send a code to type in, no password needed. Both open the same account.",
        image: "/svc/help/login.png",
        imageAlt: "The login screen with the email form and the cell number option",
      },
      {
        title: "Lost password, thirty-second fix",
        body: "On the login screen tap Forgotten your password. Type your email. We send you a link; tap it, choose a new password, and log in with it. If the email hides, check Spam.",
      },
      {
        title: "The menu always tells you where you stand",
        body: "Logged out, the menu offers Log in and Join now. Logged in, it shows My dashboard and Log out instead. If you ever feel lost, open the menu; it never lies.",
      },
      {
        title: "Cancelling, no tricks",
        body: "At the bottom of your dashboard is Cancel your membership. One question about why, no fees, no phone calls to endure. Everything you paid for stays yours until the end of the month you paid for. And if you come back later, your number picks up where it left off.",
      },
      {
        title: "When something looks broken",
        body: "Go to the Contact page and tell us three things: where you were, what you tapped, and what happened. A real person reads it and a real person answers.",
      },
    ],
  },
];

export function guideBySlug(slug: string): HelpGuide | undefined {
  return HELP_GUIDES.find((g) => g.slug === slug);
}

export const HELP_CATEGORIES = [
  "Getting started",
  "Your coupons",
  "The draw",
  "Referrals",
  "Your account",
] as const;
