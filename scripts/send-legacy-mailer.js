#!/usr/bin/env node
// The legacy mailer, to former DigitalFlyer registrations (2018-2019).
//
// docs/New Builds/cold-outreach-plan.md and mailer-legacy-final.md. Same
// structural shape as send-reactivation-batch.js and for the same reason:
// a script that must be deliberately invoked, defaults to a dry run, and
// requires an explicit --live flag is a safer shape than a button.
//
// The rules this enforces, from the plan:
//   - nothing sends to an address on marketing_suppressions, checked at
//     send time, not at list-build time
//   - only contacts with status 'cold' are sent to, and each becomes
//     'contacted' the moment its send succeeds, so nobody is emailed twice
//   - every email carries a one-click unsubscribe link and a
//     List-Unsubscribe header
//   - --live refuses to run without MARKETING_FROM_EMAIL, so the legacy
//     mailer cannot accidentally ride the transactional domain
//
// Usage:
//   node scripts/send-legacy-mailer.js                       (dry run)
//   node scripts/send-legacy-mailer.js --live                (sends, batch of 500)
//   node scripts/send-legacy-mailer.js --live --batch-size=50 --pause=2
//
// Watch the Resend dashboard between batches. Above 3% bounces, stop and
// verify the rest of the list. Above 0.1% complaints, stop entirely.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";
// The dedicated marketing identity, e.g. "Dewald from DigitalFlyer SA
// <dewald@mail.digitalflyersa.co.za>". Deliberately has no fallback: the
// whole point of the separate domain is that a marketing campaign can never
// touch the domain that carries invoices and password resets.
const MARKETING_FROM_EMAIL = process.env.MARKETING_FROM_EMAIL;

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const BATCH_SIZE = Number(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ?? 500);
const PAUSE_SECONDS = Number(args.find((a) => a.startsWith("--pause="))?.split("=")[1] ?? 1.2);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unsubscribeToken(email) {
  return crypto.createHmac("sha256", APP_ENCRYPTION_KEY).update(email).digest("hex");
}

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// The corrected legacy mailer, byte-faithful to
// docs/New Builds/mailer-legacy-final.md. Greeting falls back through
// first name, business name, and finally none, so nobody is called
// "Good day ," with a hole in it.
function greeting(contact) {
  const first = (contact.contact_name ?? "").trim().split(/\s+/)[0];
  if (first) return `Good day ${first},`;
  if (contact.business_name) return `Good day ${contact.business_name.trim()},`;
  return "Good day,";
}

const SUBJECT = "You signed up with DigitalFlyer once. We rebuilt the whole thing.";

function emailHtml(contact) {
  const token = unsubscribeToken(contact.email);
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(contact.email)}&token=${token}`;
  const cta = `${SITE_URL}/pricing?utm_source=legacy-mailer&utm_medium=email&utm_campaign=legacy-2026-08`;

  const p = (text) => `<p style="font-size:15px;line-height:1.65;color:#1f2937;margin:0 0 16px;">${text}</p>`;
  const h = (text) => `<p style="font-size:16px;line-height:1.5;color:#111827;font-weight:700;margin:24px 0 8px;">${text}</p>`;

  return `
<div style="max-width:600px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;">
  ${p(greeting(contact))}
  ${p("You signed up with DigitalFlyer SA once and then life happened. Fair enough.")}
  ${p("On our side, we took the whole thing apart and built it again. Not a new coat of paint. New everything, and every decision came down to one question: does it get you found, or does it get you paid?")}
  ${h("A page that goes looking for work")}
  ${p("Your own page on your own address, built so Google can read it properly and put you in front of somebody typing “plumber in Boksburg” at nine on a Sunday night. Ten designs, your colours, your photos, your own work on show. WhatsApp and Call buttons right at the top where the customer’s thumb already is.")}
  ${p("An agency will build you a website for thousands and then charge you again every time you want to change a phone number. This is <strong>R100 a month</strong> and you change it yourself, from your phone, in a minute.")}
  ${p("Ready to sell off the page as well? <strong>R180 a month</strong> adds bookings and a shop, with delivery through Bob Go.")}
  ${h("KatisoBiz: quote before you leave the driveway")}
  ${p("Build a quote on your phone in under a minute. Send it on WhatsApp from your own number with your own name on it. Job done, one tap, it is an invoice.")}
  ${p("<strong>Ten documents a month, free, forever. No card.</strong> For R49 you get your own logo on them, your saved price list, your customer list, and statements so you can chase what you are owed properly instead of an awkward WhatsApp on a Friday afternoon.")}
  ${p("If you are on a DigitalFlyer plan, that R49 is already included. You do not pay twice.")}
  ${h("The Board")}
  ${p("Our community notice board, opening shortly. Your specials, your finished work, your business in front of people who are actually looking. Costs nothing.")}
  ${p("<strong>Seven days free. No card, no catch.</strong> Five minutes on your phone and you are up.")}
  <p style="margin:28px 0;">
    <a href="${cta}" style="display:inline-block;background:#1081b8;color:#ffffff;font-size:15px;font-weight:700;padding:14px 28px;text-decoration:none;border-radius:8px;">Start your seven days</a>
  </p>
  ${p("Dewald<br />DigitalFlyer SA")}
  <hr style="margin:28px 0 16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px;">
    You are receiving this because you registered ${contact.business_name ? `${escapeHtml(contact.business_name)} ` : ""}with DigitalFlyer between 2018 and 2019. That is the only reason, and one click ends it:
  </p>
  <p style="font-size:14px;line-height:1.6;margin:0;">
    <a href="${unsubscribeUrl}" style="color:#1081b8;font-weight:700;">Not for you? Unsubscribe here</a> and we will not email you again.
  </p>
</div>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !APP_ENCRYPTION_KEY) {
    throw new Error("Missing Supabase or encryption environment. Run from the project root with .env.local loaded.");
  }
  if (LIVE && !RESEND_API_KEY) throw new Error("--live needs RESEND_API_KEY.");
  if (LIVE && !MARKETING_FROM_EMAIL) {
    throw new Error(
      "--live refused: MARKETING_FROM_EMAIL is not set. The legacy mailer only ever sends from the dedicated marketing domain, never the transactional one."
    );
  }

  // Suppressions first, checked at send time as the plan requires.
  const suppressions = await sb("/rest/v1/marketing_suppressions?select=email");
  const suppressed = new Set(suppressions.map((s) => s.email));

  const contacts = await sb(
    `/rest/v1/marketing_contacts?select=id,email,contact_name,business_name&status=eq.cold&source=like.*DigitalFlyer*&order=created_at.asc&limit=${BATCH_SIZE}`
  );
  const sendable = contacts.filter((c) => !suppressed.has(c.email));

  console.log(`${LIVE ? "LIVE" : "Dry run"}: ${contacts.length} cold legacy contacts in this batch, ${contacts.length - sendable.length} suppressed, ${sendable.length} to send.`);
  if (!LIVE) {
    for (const c of sendable.slice(0, 5)) console.log("  would send to:", c.email, "|", greeting(c));
    console.log(`  subject: ${SUBJECT}`);
    console.log("  from:", MARKETING_FROM_EMAIL ?? "(MARKETING_FROM_EMAIL not set yet)");
    console.log("Dry run complete. Nothing sent. Add --live to send this batch.");
    return;
  }

  let sent = 0, failed = 0;
  for (const contact of sendable) {
    const token = unsubscribeToken(contact.email);
    const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(contact.email)}&token=${token}`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: MARKETING_FROM_EMAIL,
          to: contact.email,
          subject: SUBJECT,
          html: emailHtml(contact),
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);

      await sb(`/rest/v1/marketing_contacts?id=eq.${contact.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "contacted",
          contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      sent++;
      if (sent % 50 === 0) console.log(`  ${sent} sent...`);
    } catch (err) {
      failed++;
      console.error("  failed:", contact.email, err.message);
      if (failed >= 10) throw new Error("Ten consecutive-ish failures, stopping rather than burning the list.");
    }
    await sleep(PAUSE_SECONDS * 1000);
  }

  console.log(`Done. Sent ${sent}, failed ${failed}. Contacts marked 'contacted' will never be sent this mailer again.`);
  console.log("Now watch the Resend dashboard: above 3% bounces, stop and verify the rest; above 0.1% complaints, stop entirely.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
