// The "your page is live, here is how to finish it" email, for one member.
//
// Dewald asked for this to be a standard template going forward rather than
// another one-off script, so the words that are specific to a member live in
// MEMBERS below and everything else lives in src/lib/email/member-welcome.ts.
// Adding the next member is a new entry in that object, not a new file.
//
//   node --env-file=.env.local scripts/send-member-welcome.mjs milas-place
//   node --env-file=.env.local scripts/send-member-welcome.mjs milas-place --live
//
// Dry run by default: prints the subject, the recipients and the whole body
// as plain text so it can be read before anybody receives it.

import { registerHooks } from "node:module";

// The template is TypeScript and imports its neighbours without file
// extensions, which is what Next expects and what Node does not. Same
// resolver hook scripts/check-layout.mjs uses, and for the same reason:
// keeping a compiled copy in step is the duplication these scripts exist
// to avoid.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        // Fall through to normal resolution.
      }
    }
    return next(specifier, context);
  },
});

const { memberWelcomeEmail } = await import("../src/lib/email/member-welcome.ts");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL ?? "DigitalFlyer SA <onboarding@resend.dev>";
const SITE_URL = "https://growth.digitalflyersa.co.za";

// Every email of this kind copies DigitalFlyer, so there is always a record
// of what a member was told and what they were asked for.
const CC = ["info@digitalflyer.co.za"];

const EMAIL_FOOTER_HTML = `
  <hr style="margin-top:32px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:13px;line-height:1.6;color:#4b5563;margin:0 0 12px;">
    Kind Regards<br />
    Your DigitalFlyer SA Team<br />
    Visibility and Accessibility<br />
    <a href="mailto:info@digitalflyer.co.za" style="color:#4b5563;">info@digitalflyer.co.za</a><br />
    Our Marketplace: <a href="${SITE_URL}/marketplace" style="color:#4b5563;">growth.digitalflyersa.co.za/marketplace</a>
  </p>
  <p style="font-size:11px;line-height:1.5;color:#9ca3af;margin:0;">
    This email is confidential and may also be privileged. The recipient is responsible for virus
    checking this email and any attachments. If you are not the intended recipient please
    immediately notify us and delete this email, you must not use, disclose, distribute, copy,
    print or rely on this email. DigitalFlyer SA does not accept any liability for any loss or
    damage from your receipt or use of this email.
  </p>
`;

const MEMBERS = {
  "milas-place": {
    to: "info@milasplace.co.za",
    welcome: {
      // No first name on his record and none in anything he has sent, so the
      // greeting uses the business name, exactly as the platform's own
      // trial emails do. Swap it the moment we know what he is called.
      greetingName: "Mila's Place",
      businessName: "Mila's Place",
      pageUrl: `${SITE_URL}/mila-s-place`,
      loginEmail: "info@milasplace.co.za",
      opening: [
        "Thank you for the photographs and for your patience. Your page is finished and it is live, and it is a good one.",
        "We have also built something new for you specifically. Guest houses have never fitted properly on our platform, because everything we had was built for appointments rather than nights. So we built the accommodation side properly, and yours is the first one on it.",
      ],
      headsUp: {
        title: "One thing before you look, so it does not puzzle you",
        body: [
          "When you open your page you will **not** see a booking section on it yet, and nothing is broken. It is waiting for you.",
          "The room booking system is built, your three rooms are loaded, and it is switched off on purpose because we do not have your prices. A date picker sitting over rooms with no prices would answer every guest with \"nothing available\", which is worse than not being there at all.",
          "Put a price on one room and switch it on, and the **Stay with us** section appears on your page immediately. It takes about two minutes and step 1 below walks you through it. Or send us your rates and we will do it for you.",
        ],
      },
      liveNow: [
        "**Your page**, with thirteen of your own photographs, including the view over the park to the Helderberg as the picture people see first",
        "**Your own words**, rewritten so that a guest can read them quickly: who you are, what the rooms are, what breakfast is, and what is nearby",
        "**Your three house rules, before booking rather than after.** No smoking or alcohol, only married couples share a room, and Saturday check in between 19:00 and 21:00. They are the reason the right kind of guest chooses you, so they belong up front",
        "**A room booking system** built for a guest house: a guest picks their dates and how many people, and sees only what actually fits and is genuinely free",
        "**Your three room types** loaded and ready: the two with their own bathroom, the two sharing, and the family room",
        // Careful wording, and worth copying. It is tempting to write "you
        // are on Google now", and it would not be true: Google decides when
        // it crawls and what it ranks, and we control neither. What we
        // actually did is make the page say the right things about him, and
        // that is what this claims. Dewald asked what the earlier, vaguer
        // version of this line meant, which is a fair sign it was claiming
        // more than it could back up.
        "**Your page now tells Google the right things about you.** Its title reads \"Mila's Place, Guest Houses and B&Bs in Somerset West\" instead of House Sitting and Property Maintenance, which is what it said before, and it is listed in the site map we hand to search engines. Getting found takes a few weeks and reviews help it along",
        "**Your listing on our marketplace**, where people browse South African businesses",
      ],
      canDo: [
        {
          title: "Put your prices in, which is the one thing that turns bookings on",
          steps: [
            "Log in and tap **Selling**, then **Open Stays and Tours**.",
            "Tap **Rooms and rates**. Your three rooms are already there.",
            "Tap **Change** on each one and fill in the price for one night.",
            "Tap **Save this room**.",
          ],
          note: "A room with no price is never shown to a guest, so nothing goes wrong while you decide. Nothing can be booked until you have done this.",
        },
        {
          title: "Switch bookings on",
          steps: [
            "Once at least one room has a price, tap **Switch on** at the top of that same screen.",
            "A **Stay with us** section appears on your page with a date picker in it.",
          ],
          note: "Rooms only appear to a guest after they have chosen their dates. That is on purpose: we never show a room we cannot promise them.",
        },
        {
          title: "Set your check in times and your cancellation terms",
          steps: [
            "In Stays and Tours, tap **Your details**.",
            "Fill in check in from, check out by, and how many days before arrival the balance is due.",
            "Write your cancellation terms in your own words.",
            "Tick everything the place has: WiFi, parking, breakfast, garden, and the rest.",
          ],
          note: "Guests see your cancellation terms before they pay and again on their confirmation, so there are no surprises either way.",
        },
        {
          title: "Block nights you have sold somewhere else",
          steps: [
            "In Stays and Tours, tap **Blocked dates**.",
            "Choose the room, the first night and the last night.",
          ],
          note: "A blocked night behaves exactly like a booked one. Nobody can take it, and it never shows as free.",
        },
        {
          title: "Add your tours",
          steps: [
            "In Stays and Tours, tap **Tours**, then **Add a trip**.",
            "Give it a title, a date, a price per person and how many seats.",
            "Write what you do and the plan for the day, and tick which photographs belong to it.",
            "Tick **Show this on my page**.",
          ],
          note: "Every trip gets its own page with its own link. That is the one to send on WhatsApp, and the one Google finds. When a trip fills up, the page collects names for the next date instead of turning people away.",
        },
        {
          title: "Take deposits by card, straight into your own account",
          steps: [
            "Open a Paystack account at paystack.com. It is free and there is no monthly fee.",
            "In your dashboard, tap **Selling** and connect it.",
          ],
          note: "The money goes directly to you and never passes through us. Without it, a booking still reaches you, but as a request you have to phone about. With it, the deposit is paid the moment somebody books and the room is held for them. Say the word and we will send you the steps.",
        },
        {
          title: "Change any word on your page, any time",
          steps: [
            "In your dashboard, tap **Your page**.",
            "Open the section you want and change it.",
          ],
          note: "It is your page. If anything we wrote does not sound like you, change it or tell us and we will.",
        },
      ],
      weNeed: [
        "**A price per night for each of the three rooms.** This is the only thing standing between you and taking bookings.",
        "**A quick check on the rooms.** You describe four bedrooms, two with their own bathroom and two sharing, and separately a family room. We have set up two plus two plus one, which is five. Is the family room one of the four?",
        "**Your check in and check out times**, other than the Saturday rule which is already on the page.",
        "**Your cancellation terms** in your own words, if you would rather we put them on for you.",
        "**How much deposit you want to take**, either a share of the total or a set amount in Rand.",
        "**Your tours.** The Kombi in your photographs says you run them, and each one deserves its own page. Titles, dates, prices and how many seats.",
        "**A first name to write to.** We only have the business address, and it would be nicer to greet you properly.",
      ],
      closing:
        "Have a look at the page and tell us what you would change. We would rather hear it now than have you quietly not like something.",
      pricing: {
        freeUntil: "8 September 2026",
        monthly: "R180",
        annual: "R1 199",
      },
    },
  },
};

function htmlToText(html) {
  return html
    .replace(/<li[^>]*>/g, "\n  - ")
    .replace(/<\/(p|h2|ol|ul|li)>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const key = process.argv[2];
const LIVE = process.argv.includes("--live");
const member = MEMBERS[key];

if (!member) {
  console.error(`Unknown member "${key}". Known: ${Object.keys(MEMBERS).join(", ")}`);
  process.exit(1);
}

const { subject, html } = memberWelcomeEmail(member.welcome);
const body = `${html}${EMAIL_FOOTER_HTML}`;

console.log(`To:      ${member.to}`);
console.log(`Cc:      ${CC.join(", ")}`);
console.log(`From:    ${FROM}`);
console.log(`Subject: ${subject}`);
console.log("");
console.log(htmlToText(html));
console.log("");

if (!LIVE) {
  console.log("Dry run. Nothing sent. Re-run with --live to send.");
  process.exit(0);
}

if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set.");
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: FROM,
    to: [member.to],
    cc: CC,
    reply_to: "info@digitalflyer.co.za",
    subject,
    html: body,
  }),
});

const result = await res.json();
if (!res.ok) {
  console.error("Send failed", res.status, result);
  process.exit(1);
}
console.log(`Sent. Resend id ${result.id}`);
