#!/usr/bin/env node
// Reactivation campaign, 2026-07-25 (Dewald). Re-engages the paused
// businesses whose trial lapsed: sets them active + Growth for 30 days free,
// republishes their page, and sends one subtle "come back and see how we're
// growing" nudge. Mirrors scripts/send-reactivation-batch.js's safety shape
// (dry run by default, explicit flags to do anything real, staged sending,
// bounce auto-stop, unsubscribe tokens) but is a separate, self-contained
// script for this distinct campaign.
//
// Recipients: status = paused, not unsubscribed / bounced / complained, and
// NOT the "digitalflyer-agents" internal test account. The unsubscribed
// Kangeroo Plumbing is excluded by the suppression filter (retention policy:
// never email an unsubscribed business).
//
// Usage:
//   node scripts/reactivate-paused-batch.js                 (DRY RUN: lists recipients, writes email preview, changes nothing)
//   node scripts/reactivate-paused-batch.js --reactivate    (DB only: set active + Growth + 30-day access + publish page)
//   node scripts/reactivate-paused-batch.js --test          (send ONE email to info@digitalflyer.co.za, no DB change, no mass send)
//   node scripts/reactivate-paused-batch.js --live          (staged mass send to all recipients; run --reactivate first)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY;
const FROM_EMAIL = process.env.RESEND_REACTIVATION_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;
// Email links must ALWAYS be production, never whatever NEXT_PUBLIC_SITE_URL
// happens to be locally (http://localhost:3002).
const PROD_URL = "https://growth.digitalflyersa.co.za";
const TEST_TO = "info@digitalflyer.co.za";
// The send step targets the exact set that was reactivated (captured here at
// --reactivate time), because reactivation flips status paused -> active, so
// the status=paused selector can no longer find them afterwards.
const COHORT_FILE = "scripts/.reactivation-cohort.json";

const args = process.argv.slice(2);
const REACTIVATE = args.includes("--reactivate");
const TEST = args.includes("--test");
const LIVE = args.includes("--live");
const BATCH_SIZE = Number(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ?? 12);
const PAUSE_SECONDS = Number(args.find((a) => a.startsWith("--pause="))?.split("=")[1] ?? 90);
const BOUNCE_PAUSE_THRESHOLD = 0.05;

const EMAIL_FOOTER_HTML = `
  <hr style="margin-top:32px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:13px;line-height:1.6;color:#4b5563;margin:0 0 12px;">
    Warm regards<br />
    The DigitalFlyer SA Team<br />
    Visibility and Accessibility<br />
    WhatsApp: +27(0)72 311 0570<br />
    Our Marketplace: <a href="${PROD_URL}/marketplace" style="color:#4b5563;">growth.digitalflyersa.co.za/marketplace</a>
  </p>
  <p style="font-size:11px;line-height:1.5;color:#9ca3af;margin:0;">
    This email is confidential and may also be privileged. The recipient is responsible for virus
    checking this email and any attachments. If you are not the intended recipient please
    immediately notify us and delete this email, you must not use, disclose, distribute, copy,
    print or rely on this email. DigitalFlyer SA does not accept any liability for any loss or
    damage from your receipt or use of this email.
  </p>
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateUnsubscribeToken(clientId) {
  return crypto.createHmac("sha256", APP_ENCRYPTION_KEY).update(clientId).digest("hex");
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
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

const SUBJECT = "Good news, your DigitalFlyer profile is active again";

// New approved copy: no em dashes, never the word "listing"/"directory",
// 30 days free Growth, direct page link + login/forgot-password nudge, POPIA
// 60-day deletion notice.
function buildEmailHtml({ businessName, publicPageUrl, loginUrl, unsubscribeLink }) {
  return `
    <p>Good day ${businessName} team,</p>
    <p>We have been working hard on DigitalFlyer, and things keep getting better.</p>
    <p>We have kept your business profile active for another 30 days and placed you on our Growth package for that time, at no cost, so you can experience the full service: your professional page, the marketplace, bookings, a shop, and more.</p>
    <p><strong>View your live page:</strong><br /><a href="${publicPageUrl}">${publicPageUrl}</a></p>
    <p><strong>Forgot your password?</strong> No problem. Go to our login page, enter your email, and click "Forgot password" to set a new one:<br /><a href="${loginUrl}">${loginUrl}</a></p>
    <p>There is nothing to pay right now. If it is working for you, simply renew whenever you are ready.</p>
    <p>Please note, in line with the POPIA act, if you decide not to continue, we will permanently remove your data after 60 days.</p>
    <hr style="margin-top:24px;margin-bottom:12px;border:none;border-top:1px solid #e5e7eb;" />
    <p style="font-size:12px;color:#6b7280;">You are receiving this because you registered a business with DigitalFlyer SA. If you would rather not hear from us, <a href="${unsubscribeLink}">unsubscribe</a>.</p>
    ${EMAIL_FOOTER_HTML}
  `;
}

function linksFor(client) {
  return {
    publicPageUrl: `${PROD_URL}/${client.slug}`,
    loginUrl: `${PROD_URL}/login`,
    unsubscribeLink: `${PROD_URL}/unsubscribe?client=${client.id}&token=${generateUnsubscribeToken(client.id)}`,
  };
}

async function sendViaResend({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
  return { ok: true };
}

async function reactivateClient(client) {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await sb(`/rest/v1/growth_clients?id=eq.${client.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "active",
      plan: "growth_engine",
      trial_starts_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    }),
  });
  await sb(`/rest/v1/landing_pages?growth_client_id=eq.${client.id}`, {
    method: "PATCH",
    body: JSON.stringify({ published: true }),
  });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getRecipients() {
  const params = new URLSearchParams({
    select: "id,business_name,contact_email,slug",
    status: "eq.paused",
    email_unsubscribed_at: "is.null",
    email_bounced_at: "is.null",
    email_complained_at: "is.null",
    slug: "neq.digitalflyer-agents",
  });
  return sb(`/rest/v1/growth_clients?${params.toString()}`);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !APP_ENCRYPTION_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, or APP_ENCRYPTION_KEY.");
    process.exit(1);
  }
  if ((TEST || LIVE) && (!RESEND_API_KEY || !FROM_EMAIL)) {
    console.error("Sending requires RESEND_API_KEY and a from-address (RESEND_REACTIVATION_FROM_EMAIL / RESEND_FROM_EMAIL).");
    process.exit(1);
  }

  // Default/reactivate work off the live paused query; test/live send to the
  // captured cohort (post-reactivation those rows are no longer paused).
  let recipients;
  if (TEST || LIVE) {
    if (!fs.existsSync(COHORT_FILE)) {
      console.error(`No cohort file at ${COHORT_FILE}. Run --reactivate first.`);
      process.exit(1);
    }
    recipients = JSON.parse(fs.readFileSync(COHORT_FILE, "utf8"));
  } else {
    recipients = await getRecipients();
  }
  console.log(`${recipients.length} recipients${TEST || LIVE ? " (from captured cohort)" : " (paused, not suppressed, excluding the internal test account)"}:`);
  for (const r of recipients) console.log(`  - ${r.business_name} <${r.contact_email}>  /${r.slug}`);
  console.log("");

  // DRY RUN: write an email preview and change nothing.
  if (!REACTIVATE && !TEST && !LIVE) {
    const sample = recipients[0];
    if (sample) {
      const links = linksFor(sample);
      const html = buildEmailHtml({ businessName: sample.business_name, ...links });
      const out = "scripts/.reactivation-email-preview.html";
      fs.writeFileSync(out, `<h4>Subject: ${SUBJECT}</h4>\n${html}`);
      console.log(`DRY RUN. Wrote email preview (rendered for "${sample.business_name}") to ${out}. Nothing was changed or sent.`);
    }
    return;
  }

  if (REACTIVATE) {
    console.log("Reactivating (status=active, plan=growth_engine, 30-day access, page published)...");
    let ok = 0;
    for (const client of recipients) {
      try {
        await reactivateClient(client);
        ok++;
        console.log(`  reactivated ${client.business_name}`);
      } catch (err) {
        console.error(`  FAILED ${client.business_name}: ${err.message}`);
      }
    }
    fs.writeFileSync(COHORT_FILE, JSON.stringify(recipients, null, 2));
    console.log(`\nReactivated ${ok}/${recipients.length}. Captured cohort to ${COHORT_FILE} for the send step.`);
    return;
  }

  if (TEST) {
    const sample = recipients[0];
    if (!sample) return console.log("No recipients to build a test from.");
    const links = linksFor(sample);
    const html = buildEmailHtml({ businessName: sample.business_name, ...links });
    const result = await sendViaResend({ to: TEST_TO, subject: `[TEST] ${SUBJECT}`, html });
    console.log(result.ok ? `Test email sent to ${TEST_TO} (rendered for "${sample.business_name}").` : `Test send FAILED: ${result.error}`);
    return;
  }

  // LIVE mass send (staged, bounce auto-stop). Assumes --reactivate already ran.
  console.log(`LIVE send to ${recipients.length}. Batch size ${BATCH_SIZE}, pause ${PAUSE_SECONDS}s.\n`);
  const batches = chunk(recipients, BATCH_SIZE);
  let sent = 0;
  let failed = 0;
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(`--- Batch ${b + 1}/${batches.length} (${batch.length}) ---`);
    const sentIds = [];
    for (const client of batch) {
      try {
        const links = linksFor(client);
        const html = buildEmailHtml({ businessName: client.business_name, ...links });
        const result = await sendViaResend({ to: client.contact_email, subject: SUBJECT, html });
        if (!result.ok) {
          console.error(`  FAILED ${client.business_name}: ${result.error}`);
          failed++;
          continue;
        }
        console.log(`  sent to ${client.business_name} <${client.contact_email}>`);
        sentIds.push(client.id);
        sent++;
      } catch (err) {
        console.error(`  FAILED ${client.business_name}: ${err.message}`);
        failed++;
      }
    }
    const isLast = b === batches.length - 1;
    if (sentIds.length > 0 && !isLast) {
      console.log(`Pausing ${PAUSE_SECONDS}s before checking bounce rate...`);
      await sleep(PAUSE_SECONDS * 1000);
      const check = await sb(
        `/rest/v1/growth_clients?select=id,email_bounced_at,email_complained_at&id=in.(${sentIds.join(",")})`
      );
      const bounced = check.filter((c) => c.email_bounced_at || c.email_complained_at).length;
      const rate = bounced / sentIds.length;
      console.log(`Batch bounce/complaint rate: ${(rate * 100).toFixed(1)}% (${bounced}/${sentIds.length})`);
      if (rate >= BOUNCE_PAUSE_THRESHOLD) {
        console.error(`\nSTOPPING: bounce/complaint rate crossed ${BOUNCE_PAUSE_THRESHOLD * 100}%. Remaining batches not sent.`);
        break;
      }
    }
    console.log("");
  }
  console.log(`\n=== DONE: ${sent} sent, ${failed} failed ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
