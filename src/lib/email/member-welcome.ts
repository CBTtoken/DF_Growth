// The "your page is live, here is how to finish it" email.
//
// Dewald, 8 August 2026, asking for the Mila's Place one: "let's try this as
// a standard template going forward... a nice friendly welcome, thank you
// and this is what you now can do and to finalise your setup, here's what
// you must do, kind of email".
//
// So this is a template rather than a one-off. Every member we set up gets
// the same five things in the same order, because the same five things are
// always true at that moment:
//
//   1. Thank you, and here is your page.
//   2. What is live right now.
//   3. What you can do yourself, with the actual taps.
//   4. What we still need from you before it is finished.
//   5. What it costs, and when.
//
// The order matters. What is live comes before what is missing, because a
// member reading "here is what we still need" first hears a bill. And the
// steps are real taps in the real interface, not "log in and configure your
// settings", because the person reading has not seen the screen before.
//
// House style throughout: "DigitalFlyer SA", no em dashes, South African
// English, Rand, and the greeting opens "Good day {name},".
//
// The footer is NOT included here. sendEmail() in src/lib/email/resend.ts
// appends EMAIL_FOOTER_HTML to every message it sends, so adding it here
// would print it twice.

export type WelcomeStep = {
  /** What they are trying to do, in their words. */
  title: string;
  /** The actual taps, in order. */
  steps: string[];
  /** One line of why, or a warning. Optional. */
  note?: string;
};

export type MemberWelcome = {
  /** How the greeting reads. A person's first name where we have one. */
  greetingName: string;
  businessName: string;
  pageUrl: string;
  /** The email address their login is on. */
  loginEmail: string;
  /** One or two friendly sentences specific to this member. */
  opening: string[];
  /**
   * The one thing that would confuse them if nobody said it, in a box they
   * cannot scroll past.
   *
   * Dewald asked for this after reading the Mila's Place draft: his page is
   * live but the booking section is not on it yet, because there are no
   * prices, and somebody clicking the link and not finding what they were
   * told about will assume it is broken rather than assume it is waiting for
   * them. A member should never have to work out why something is missing.
   */
  headsUp?: { title: string; body: string[] };
  /** What is live and working today. */
  liveNow: string[];
  /** What they can do themselves, with the taps. */
  canDo: WelcomeStep[];
  /** What we need from them before the setup is finished. */
  weNeed: string[];
  /** One closing line before the pricing. Optional. */
  closing?: string;
  pricing: {
    /** "8 September 2026". */
    freeUntil: string;
    /** "R180". */
    monthly: string;
    /** "R1 199". */
    annual: string;
  };
};

const SITE_URL = "https://growth.digitalflyersa.co.za";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Lets a caller write **bold** in plain strings without hand-writing tags
 * in every bullet. Deliberately the only markup allowed: an email body that
 * accepts arbitrary HTML from a config file is an email body somebody will
 * eventually break.
 */
function inline(value: string): string {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function list(items: string[]): string {
  return `<ul style="margin:0 0 16px;padding-left:20px;">${items
    .map((item) => `<li style="margin-bottom:6px;">${inline(item)}</li>`)
    .join("")}</ul>`;
}

export function memberWelcomeEmail(welcome: MemberWelcome): { subject: string; html: string } {
  const steps = welcome.canDo
    .map(
      (task, index) => `
        <p style="margin:0 0 6px;"><strong>${index + 1}. ${escapeHtml(task.title)}</strong></p>
        <ol style="margin:0 0 ${task.note ? "6px" : "18px"};padding-left:20px;">
          ${task.steps.map((step) => `<li style="margin-bottom:4px;">${inline(step)}</li>`).join("")}
        </ol>
        ${
          task.note
            ? `<p style="margin:0 0 18px;font-size:14px;color:#4b5563;">${inline(task.note)}</p>`
            : ""
        }
      `
    )
    .join("");

  const html = `
    <p>Good day ${escapeHtml(welcome.greetingName)},</p>

    ${welcome.opening.map((line) => `<p>${inline(line)}</p>`).join("")}

    <p style="margin:0 0 20px;">
      <a href="${welcome.pageUrl}" style="display:inline-block;background:#1081b8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;">See your page</a>
    </p>
    <p style="font-size:14px;color:#4b5563;margin:0 0 24px;">
      <a href="${welcome.pageUrl}" style="color:#1081b8;">${welcome.pageUrl.replace(/^https?:\/\//, "")}</a>
    </p>

    ${
      welcome.headsUp
        ? `<div style="border-left:4px solid #1081b8;background:#f2f8fb;padding:14px 16px;border-radius:0 12px 12px 0;margin:0 0 24px;">
             <p style="margin:0 0 8px;font-weight:700;">${escapeHtml(welcome.headsUp.title)}</p>
             ${welcome.headsUp.body
               .map((line) => `<p style="margin:0 0 8px;font-size:15px;">${inline(line)}</p>`)
               .join("")}
           </div>`
        : ""
    }

    <h2 style="font-size:17px;margin:0 0 10px;">What is live now</h2>
    ${list(welcome.liveNow)}

    <h2 style="font-size:17px;margin:24px 0 12px;">What you can do yourself</h2>
    <p style="margin:0 0 16px;">
      Everything below is yours to change whenever you like, as often as you like, without asking us.
      Log in at <a href="${SITE_URL}/login" style="color:#1081b8;">${SITE_URL.replace(/^https?:\/\//, "")}/login</a>
      with <strong>${escapeHtml(welcome.loginEmail)}</strong>. If you cannot remember your password, use
      <em>Forgot password</em> on that screen and it will email you a new one.
    </p>
    ${steps}

    <h2 style="font-size:17px;margin:24px 0 10px;">To finish your setup, we still need this</h2>
    <p style="margin:0 0 12px;">
      This is the same list as above, seen from the other side. <strong>Do it yourself with the steps above, or
      reply to this email and we will put it on for you.</strong> Same result either way, so pick whichever
      suits you, and you do not have to do it all at once.
    </p>
    ${list(welcome.weNeed)}

    ${welcome.closing ? `<p>${inline(welcome.closing)}</p>` : ""}

    <h2 style="font-size:17px;margin:24px 0 10px;">What it costs</h2>
    <p style="margin:0 0 10px;">
      Your setup is on us for the first month. Everything above is live and free to use until
      <strong>${escapeHtml(welcome.pricing.freeUntil)}</strong>.
    </p>
    <p style="margin:0 0 10px;">
      After that, if you would like to carry on, the Growth package is
      <strong>${escapeHtml(welcome.pricing.monthly)} a month</strong>, or
      <strong>${escapeHtml(welcome.pricing.annual)} for the year</strong> if you would rather pay once and forget about it.
      There is no contract and you can stop whenever you want.
    </p>
    <p style="margin:0 0 10px;">
      If it is not for you, just say so and nothing happens. No invoice, no awkwardness.
    </p>
  `;

  return {
    subject: `${welcome.businessName} is live, and here is how to finish it`,
    html,
  };
}
