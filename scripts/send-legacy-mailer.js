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

// Dewald's revised copy, 4 August 2026, verbatim. The subject correction
// ("DigitalFlyer SA", not "DigitalFlyer") came in the same message.
const SUBJECT = "We rebuilt DigitalFlyer SA from the ground up";
const PREHEADER = "A page built to be found, and a quote book in your pocket. Seven days free, no card.";

function emailHtml(contact) {
  const token = unsubscribeToken(contact.email);
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(contact.email)}&token=${token}`;
  const cta = `${SITE_URL}/pricing?utm_source=legacy-mailer&utm_medium=email&utm_campaign=legacy-2026-08`;

  const p = (text) => `<p style="font-size:15px;line-height:1.65;color:#1f2937;margin:0 0 16px;">${text}</p>`;
  const h = (text) => `<p style="font-size:16px;line-height:1.5;color:#111827;font-weight:700;margin:24px 0 8px;">${text}</p>`;

  return `
<div style="max-width:600px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${PREHEADER}</span>
  ${p(greeting(contact))}
  ${p("You registered with DigitalFlyer SA at some point, and then life got busy. Happens to all of us.")}
  ${p("Here is why it is worth two minutes of your time now: we took the whole thing apart and rebuilt it. Not a new coat of paint. New everything, and every single decision came down to one question. Does it get you found, or does it get you paid?")}
  ${h("1. A page built to be found")}
  ${p("Your own page, on your own address. Fast, clean, and built properly for Google, so when somebody types “plumber in Edenvale” at nine on a Sunday night there is something of yours to find. It carries the Meta tracking too, so if you ever run a Facebook campaign you can see exactly which ads brought people in.")}
  ${p("Ten designs to choose from. Your colours, your logo, your photos, your own work on show. WhatsApp and Call buttons right at the top where the thumb already is.")}
  ${p("An agency charges thousands and then charges you again to change a phone number. This is <strong>R100 a month</strong>, and you change it yourself from your phone in a minute.")}
  ${h("2. Quote before you pull out of the driveway")}
  ${p("KatisoBiz is your quote and invoice book, on your phone.")}
  ${p("Build a quote in under a minute off your saved prices. Send it on WhatsApp from your own number with your own business name on it. Job done, one tap, it becomes an invoice. See exactly who owes you and send them a proper statement instead of an awkward message on a Friday.")}
  ${p("<strong>Ten documents a month, free, forever, no card.</strong> R49 adds your logo, your customer list, reports and statements.")}
  ${h("Selling as well as servicing?")}
  ${p("The <strong>R180 plan</strong> adds bookings and a full shop. Customers pay you by card through Paystack, straight into your own account, and Bob Go handles the courier on your own account too. Both are yours, not ours, and we will help you set them up and connect them.")}
  ${p("And The Board, opening shortly. Our community notice board. Your specials and your finished work in front of people who are looking. Costs nothing.")}
  ${p("<strong>Seven days free. No card, no catch.</strong> Five minutes on your phone and you are going.")}
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
  // --preview writes the exact email a real contact would receive to a
  // file, for copy approval. It needs no database and sends nothing.
  if (args.includes("--preview")) {
    if (!APP_ENCRYPTION_KEY) throw new Error("--preview needs APP_ENCRYPTION_KEY for the unsubscribe token.");
    const sample = { id: "preview", email: "preview@example.invalid", contact_name: "Adri", business_name: "Kids in Action" };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { writeFileSync } = require("fs");
    const out = args.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "legacy-mailer-preview.html";
    writeFileSync(out, `<p style="background:#fdf5e6;padding:10px 14px;font-family:Arial;font-size:13px;">Subject: ${SUBJECT}<br/>From: ${MARKETING_FROM_EMAIL ?? "(MARKETING_FROM_EMAIL not set yet)"}</p>` + emailHtml(sample));
    console.log("Preview written to", out, "- nothing sent.");
    return;
  }

  // --test=<address> sends exactly one real email through the exact live
  // path (same payload, same headers, same from) to the address given,
  // touching no contact records. The truthful smoke test before a batch,
  // and the cheapest proof the sending domain is actually verified: Resend
  // refuses an unverified from-domain outright.
  const testTo = args.find((a) => a.startsWith("--test="))?.split("=")[1];
  if (testTo) {
    if (!RESEND_API_KEY || !MARKETING_FROM_EMAIL || !APP_ENCRYPTION_KEY) {
      throw new Error("--test needs RESEND_API_KEY, MARKETING_FROM_EMAIL and APP_ENCRYPTION_KEY.");
    }
    const sample = { id: "test", email: testTo, contact_name: "Test", business_name: "Smoke Test" };
    const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(testTo)}&token=${unsubscribeToken(testTo)}`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: MARKETING_FROM_EMAIL,
        to: testTo,
        subject: `[TEST] ${SUBJECT}`,
        html: emailHtml(sample),
        reply_to: "info@digitalflyer.co.za",
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    console.log(res.ok ? `Test sent to ${testTo} from ${MARKETING_FROM_EMAIL}.` : `Test FAILED: ${res.status} ${await res.text()}`);
    return;
  }

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
          // Replies land in the inbox Dewald actually reads, not on the
          // machine domain.
          reply_to: "info@digitalflyer.co.za",
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
