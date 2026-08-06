#!/usr/bin/env node
// One-off welcome/instructions email to BidWeb's Samantha, following
// scripts/send-buffelskop-client-email.js's exact pattern (plain CommonJS +
// raw fetch against Resend, same footer).
//
// Usage:
//   node scripts/send-samantha-partner-welcome.js          (dry run, prints the email, sends nothing)
//   node scripts/send-samantha-partner-welcome.js --live    (sends for real)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "DigitalFlyer SA <onboarding@resend.dev>";
const SITE_URL = "https://growth.digitalflyersa.co.za";

const LIVE = process.argv.includes("--live");

const TO = "sammie@smartvalueclub.co.za";

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

const SUBJECT = "Your DigitalFlyer Growth access, BidWeb";

const HTML = `
  <p>Good day Samantha,</p>
  <p>Welcome to your own partner portal. Your login for DigitalFlyer Growth is set up, here is everything you need to get started.</p>
  <p><strong>1. Set your password</strong></p>
  <p>Go to <a href="${SITE_URL}/forgot-password">${SITE_URL}/forgot-password</a> and enter this email address, sammie@smartvalueclub.co.za. You will get a link by email to set your password, then you can log in as normal at <a href="${SITE_URL}/login">${SITE_URL}/login</a>.</p>
  <p><strong>2. Your businesses</strong></p>
  <p>Once logged in, your dashboard already has four businesses linked to it: The Falling Feather Inn, Cape Town Butler, Greeff Kitchens and Cottonball. Near the top of the dashboard you will see the name of the business you are currently managing, with buttons to switch to any of the others.</p>
  <p><strong>3. Editing a page</strong></p>
  <p>Whichever business you are switched to, the dashboard lets you edit everything on that page: the words, the photos, the brand colours, and which template it uses. Changes go live as soon as you save them.</p>
  <p><strong>4. Adding another business</strong></p>
  <p>When a new referral comes in, click "+ Add another business" near the top of the dashboard. Enter the business name and its contact email, and you will go straight into the same setup wizard every business goes through, where you fill in the rest yourself.</p>
  <p>Any questions at all, just reply to this email.</p>
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
