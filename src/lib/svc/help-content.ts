/**
 * The Help Centre's content, as data: every guide renders through the
 * same page, screenshots slot in per step when they exist, and adding a
 * guide is adding an entry here, not building a page.
 *
 * Voice rules apply: plain language, Rand, South African context, no
 * jargon, and the guides only ever promise what the platform actually
 * does.
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
  category: "Getting started" | "Your benefits" | "The draw" | "Referrals" | "Your account";
  summary: string;
  steps: HelpStep[];
};

export const HELP_GUIDES: HelpGuide[] = [
  {
    slug: "join",
    title: "Join Smart Value Club",
    category: "Getting started",
    summary: "From the home page to a live membership in about three minutes, on your phone.",
    steps: [
      {
        title: "Open the site and tap Join now",
        body: "On smartvalueclub.co.za, the yellow Join button is right on the first screen. Tap it.",
        image: "/svc/help/join-home.png",
        imageAlt: "The Smart Value Club home page with the Join button",
      },
      {
        title: "Fill in your details",
        body: "Your name, your cell number, your email and a password of your choosing. Your cell number is your membership number, so use the one you carry. Tick the consent box (we need it to run your membership) and choose for yourself whether you want news and offers; that one is optional.",
        image: "/svc/help/join-form.png",
        imageAlt: "The join form with its five fields and two tick boxes",
      },
      {
        title: "Enter your 6 digit code",
        body: "We send a one time code to confirm your number is really yours. Type it in and your number is verified. Codes arrive by email for now and expire after 10 minutes; the Send me a fresh code button is right there if it got lost.",
      },
      {
        title: "Complete your payment",
        body: "One screen shows your package and its price, and takes you through a secure payment. The moment it goes through, your membership is active and your welcome email is on its way.",
      },
      {
        title: "You are in",
        body: "Your dashboard is your home: your savings counter, your coupons, your draw entries and your referral link all live there. Your first benefits arrive with the next monthly issue on the 1st, or straight away if the month's issue has already run.",
        image: "/svc/help/dashboard.png",
        imageAlt: "The member dashboard with the savings counter at the top",
      },
    ],
  },
  {
    slug: "coupons",
    title: "Claim and use your coupons",
    category: "Your benefits",
    summary: "Where your coupons live, how to take them shopping, and why the I used this button matters.",
    steps: [
      {
        title: "Open My coupons",
        body: "From your dashboard, tap the green My coupons tile. Everything issued to you for the month is there, each with its value.",
        image: "/svc/help/coupons.png",
        imageAlt: "The My coupons screen with the month's coupon packs",
      },
      {
        title: "Show a coupon and take it shopping",
        body: "Tap Show my coupon on a pack to see its details and code where one exists, then Add to my coupons for this trip when you plan to use it. Coupons redeem digitally at participating stores; no printing.",
      },
      {
        title: "One good habit at the till",
        body: "Coupon discounts and your store loyalty card cannot both apply to the same product. The simple trick: ring up your coupon items as one purchase and the rest with your loyalty card as another. Same trip, both savings.",
      },
      {
        title: "After you shopped, tap I used this",
        body: "Tell us you used the coupon, and put in the amount if you know it. That amount lands in your savings counter, which only ever counts what you actually saved, and it earns you extra draw entries as it grows.",
      },
      {
        title: "They refresh every month",
        body: "On the 1st, a fresh set is issued to every active member and we email you when it lands. Unused coupons from last month do not roll over, so use them while they are hot.",
      },
    ],
  },
  {
    slug: "draw",
    title: "The monthly draw and your entries",
    category: "The draw",
    summary: "Free entries for being a member, extra entries for real savings, and a result anyone can check.",
    steps: [
      {
        title: "You are entered automatically",
        body: "Every active member gets free entries every month, no forms and no cost. Your dashboard's draw panel shows exactly how many you hold.",
      },
      {
        title: "Earn more by actually saving",
        body: "Every R50 of coupon value you genuinely use earns another entry. The panel shows a live line telling you how much more takes you to your next one. Self confirmed savings count up to a monthly cap, which the panel also shows.",
      },
      {
        title: "Entries freeze at the cutoff",
        body: "Each draw has a published cutoff. At that moment the entries freeze and nothing can change them, not even by us. That is your protection, not red tape.",
      },
      {
        title: "The result is published for checking",
        body: "The winner is picked by a seeded random draw, and every result page shows the seed and the total entries, so the draw can be verified rather than taken on trust. Winners are announced in the first week of the following month.",
      },
    ],
  },
  {
    slug: "referrals",
    title: "Tell a friend and earn a thank-you",
    category: "Referrals",
    summary: "Your link, your three numbers, and the honest rules before you share.",
    steps: [
      {
        title: "Copy your link from the dashboard",
        body: "Your referral section holds your personal link and a WhatsApp share button. Anyone who joins through it and stays active earns you a small monthly thank-you.",
      },
      {
        title: "Know the rules before you share",
        body: "You earn for a person only in months their membership is paid and active. It goes three levels deep and never further. Your own coupons and entries never depend on referring anyone; this is a bonus, not a job.",
      },
      {
        title: "Watch three numbers, not a network",
        body: "People joined at each level, this month's earning, and your balance. Earnings are calculated once a month, so the month's number appears after the monthly run rather than the second someone joins.",
      },
    ],
  },
  {
    slug: "account",
    title: "Manage your account",
    category: "Your account",
    summary: "Logging in two ways, fixing a lost password, and how leaving works.",
    steps: [
      {
        title: "Two ways to log in",
        body: "Email and password, or your cell number with a one time code. Both open the same account. The menu always shows where you stand: logged out you see Log in, logged in you see My dashboard and Log out.",
      },
      {
        title: "Lost your password",
        body: "On the login screen, tap Forgotten your password, give your email, and follow the link we send. Choose a new password and log in fresh.",
      },
      {
        title: "Cancelling, if you must",
        body: "From your dashboard, the cancel link is at the bottom. One question about why, no fees, no arguing, and your benefits stay live until the end of the period you paid for. Come back anytime; your number picks up where it left off.",
      },
      {
        title: "Getting help",
        body: "The contact page reaches a real person, and this Help Centre grows as the club does. If something looks broken, tell us where you were and what you expected; that is the fastest route to a fix.",
      },
    ],
  },
];

export function guideBySlug(slug: string): HelpGuide | undefined {
  return HELP_GUIDES.find((g) => g.slug === slug);
}

export const HELP_CATEGORIES = [
  "Getting started",
  "Your benefits",
  "The draw",
  "Referrals",
  "Your account",
] as const;
