#!/usr/bin/env node
// One-off "your page is live" email to Buffelskop's real contacts (Jaco/
// Adri at TCAC), following provision-buffelskop.js. Plain CommonJS + raw
// fetch against Resend's HTTP API, matching src/lib/email/resend.ts's exact
// pattern and footer (src/lib/email/footer.ts) by hand, since this is a
// standalone script (same reasoning as scripts/send-reactivation-batch.js).
//
// Usage:
//   node scripts/send-buffelskop-client-email.js          (dry run, prints the email, sends nothing)
//   node scripts/send-buffelskop-client-email.js --live    (sends for real)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "DigitalFlyer SA <onboarding@resend.dev>";
const SITE_URL = "https://growth.digitalflyersa.co.za";

const LIVE = process.argv.includes("--live");

const TO = "adri@tcac.co.za";
const PAGE_URL = `${SITE_URL}/buffelskop`;
// growth_client id from the 2026-07-18 provisioning run (provision-buffelskop.js).
const CLIENT_ID = "8d506323-eb64-457c-b0a3-f39b6207e33e";
const PAYMENT_LINK = `${SITE_URL}/api/trial/convert?client=${CLIENT_ID}&interval=annual`;

const EMAIL_FOOTER_HTML = `
  <hr style="margin-top:32px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:13px;line-height:1.6;color:#4b5563;margin:0 0 12px;">
    Kind Regards<br />
    Your DigitalFlyer SA Team<br />
    Visibility and Accessibility<br />
    WhatsApp: +27(0)72 311 0570<br />
    Our Marketplace: <a href="https://growth.digitalflyersa.co.za/marketplace" style="color:#4b5563;">growth.digitalflyersa.co.za/marketplace</a>
  </p>
  <p style="font-size:11px;line-height:1.5;color:#9ca3af;margin:0;">
    This email is confidential and may also be privileged. The recipient is responsible for virus
    checking this email and any attachments. If you are not the intended recipient please
    immediately notify us and delete this email, you must not use, disclose, distribute, copy,
    print or rely on this email. DigitalFlyer SA does not accept any liability for any loss or
    damage from your receipt or use of this email.
  </p>
`;

const SUBJECT = "Your Buffelskop Page Is Live 🌶️";

const HTML = `
  <p>Good day Jaco and Adri,</p>
  <p><strong>Your Buffelskop page is live, right now:</strong></p>
  <p><a href="${PAGE_URL}">${PAGE_URL}</a></p>
  <p>We built this one properly. It's not a generic template with your logo dropped in, it's a full premium build around your own photography: a full-screen hero, a "Choose Your Grind" section for Fine and Coarse, your bulk-supply story, clear pricing, and a direct enquiry form that lands straight in your inbox, no middleman.</p>
  <p><strong>Why this actually matters for Buffelskop:</strong></p>
  <ul>
    <li><strong>Built to be found.</strong> Every page on DigitalFlyer is structured the way Google actually needs it to be, so someone searching "chilli powder supplier South Africa" or "sundried cayenne chilli powder" has a real chance of finding you, not just people who already know your name.</li>
    <li><strong>Built to convert.</strong> Real product photography, a clear price, and a low-friction way to get in touch. Nothing standing between a buyer and reaching you.</li>
    <li><strong>Built for bulk.</strong> Your page speaks directly to restaurants, butcheries, retailers, and spice manufacturers, not just home cooks. That's where the real volume is.</li>
  </ul>
  <p><strong>Your first two weeks are on us.</strong> Full access, completely free, no card needed, starting today. Explore your page, share the link, see the enquiries come in.</p>
  <p>After that, keeping your page live is R1,199 for the full year, and Natasha will be your agent throughout, she'll earn 40% of your subscription for bringing Buffelskop on board, so you'll always have someone in your corner who wants to see this work for you.</p>
  <p><a href="${PAYMENT_LINK}"><strong>Keep your page live, R1,199/year &rarr;</strong></a></p>
  <p>Any questions at all, just reply to this email or reach out to Natasha directly.</p>
`;

async function main() {
  console.log(LIVE ? "LIVE run — this will send a real email to " + TO + "\n" : "DRY RUN — printing the email, sending nothing.\n");
  console.log("To:", TO);
  console.log("Subject:", SUBJECT);
  console.log("\n--- HTML body ---\n");
  console.log(HTML);

  if (!LIVE) {
    console.log("\nDry run complete. Re-run with --live to actually send.");
    return;
  }

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY env var.");
    process.exit(1);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: TO, subject: SUBJECT, html: `${HTML}${EMAIL_FOOTER_HTML}` }),
  });

  if (!res.ok) {
    console.error(`Resend ${res.status}:`, await res.text());
    process.exit(1);
  }

  console.log("\nSent.");
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
