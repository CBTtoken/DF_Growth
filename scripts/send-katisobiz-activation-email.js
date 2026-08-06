#!/usr/bin/env node
// Handoff: scripts/handoff-activation-nudges-and-emails.md, Job 7, Email 1.
//
// "Does not start until the activation button is live" (Job 1) — this
// script itself has no way to check that, so it's on whoever runs --live to
// have confirmed it first, per the handoff's own instruction.
//
// Plain CommonJS + raw fetch, same shape as scripts/send-reactivation-batch.js
// (dry run by default, --live to actually send, batched with a pause and a
// bounce-rate guard between batches). Copy is pre-approved in the handoff —
// sent as written, no wording changes here.
//
// Usage:
//   node --env-file=.env.local scripts/send-katisobiz-activation-email.js            (dry run)
//   node --env-file=.env.local scripts/send-katisobiz-activation-email.js --live
//   node --env-file=.env.local scripts/send-katisobiz-activation-email.js --live --batch-size=10 --pause=120

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "DigitalFlyer Growth <onboarding@resend.dev>";

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const BATCH_SIZE = Number(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ?? 12);
const PAUSE_SECONDS = Number(args.find((a) => a.startsWith("--pause="))?.split("=")[1] ?? 90);
const BOUNCE_PAUSE_THRESHOLD = 0.05;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
  if (!res.ok) throw new Error(`Supabase ${res.status} ${path}: ${await res.text()}`);
  return res.json();
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

// Verbatim from the handoff, Email 1.
function buildEmailHtml(name) {
  const activateUrl = `${SITE_URL}/dashboard`;
  return `
    <p>Good day ${name},</p>
    <p>Quick one. Your Growth plan includes KatisoBiz, and you have not switched it on yet.</p>
    <p>It is a quoting and invoicing tool built for a phone:</p>
    <ul>
      <li>Build a quote in under a minute and send it on WhatsApp</li>
      <li>Turn an accepted quote into an invoice with one tap</li>
      <li>See who has paid and who still owes you</li>
      <li>Add a Pay Now button so the money lands in your own account</li>
    </ul>
    <p>It is included in what you already pay. Nothing extra, no card needed.</p>
    <p><a href="${activateUrl}"><strong>Switch on KatisoBiz</strong></a></p>
    <p>Takes about thirty seconds.</p>
    <p>Regards,<br />Dewald<br />DigitalFlyer SA</p>
    ${EMAIL_FOOTER_HTML}
  `;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY or RESEND_API_KEY in the environment.");
    process.exit(1);
  }

  // Every active Growth member, then filtered down to the ones with no
  // linked bizup_accounts row — a plain anti-join, done in memory rather
  // than a single Postgrest query, since Postgrest's embedded-resource
  // filters don't express "no matching row" cleanly.
  const clients = await sb(
    "/rest/v1/growth_clients?select=id,business_name,contact_email,status,email_unsubscribed_at,email_bounced_at,email_complained_at&status=eq.active"
  );
  const linkedIds = new Set(
    (await sb("/rest/v1/bizup_accounts?select=growth_client_id&growth_client_id=not.is.null")).map(
      (a) => a.growth_client_id
    )
  );

  const eligible = clients.filter(
    (c) =>
      !linkedIds.has(c.id) &&
      c.contact_email &&
      !c.email_unsubscribed_at &&
      !c.email_bounced_at &&
      !c.email_complained_at
  );

  console.log(`${eligible.length} eligible recipients (active, no linked KatisoBiz account, not suppressed).`);
  console.log(
    `Mode: ${LIVE ? "LIVE — will actually send" : "DRY RUN — sends nothing"}. Batch size: ${BATCH_SIZE}. Pause: ${PAUSE_SECONDS}s.\n`
  );

  const batches = chunk(eligible, BATCH_SIZE);
  let totalSent = 0;
  let totalFailed = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(`--- Batch ${b + 1}/${batches.length} (${batch.length} recipients) ---`);
    const sentIds = [];

    for (const client of batch) {
      const html = buildEmailHtml(client.business_name);
      const subject = `${client.business_name}, you are already paying for this one`;

      if (!LIVE) {
        console.log(`  [dry run] would send to ${client.business_name} <${client.contact_email}>`);
        continue;
      }

      const result = await sendViaResend({ to: client.contact_email, subject, html });
      if (!result.ok) {
        console.error(`  FAILED to send to ${client.business_name}: ${result.error}`);
        totalFailed++;
        continue;
      }

      console.log(`  sent to ${client.business_name} <${client.contact_email}>`);
      sentIds.push(client.id);
      totalSent++;
    }

    const isLastBatch = b === batches.length - 1;
    if (LIVE && sentIds.length > 0 && !isLastBatch) {
      console.log(`Pausing ${PAUSE_SECONDS}s before checking bounce rate...`);
      await sleep(PAUSE_SECONDS * 1000);

      const check = await sb(
        `/rest/v1/growth_clients?select=id,email_bounced_at,email_complained_at&id=in.(${sentIds.join(",")})`
      );
      const bounced = check.filter((c) => c.email_bounced_at || c.email_complained_at).length;
      const rate = bounced / sentIds.length;
      console.log(`Batch bounce/complaint rate: ${(rate * 100).toFixed(1)}% (${bounced}/${sentIds.length})`);

      if (rate >= BOUNCE_PAUSE_THRESHOLD) {
        console.error(
          `\nSTOPPING: bounce/complaint rate crossed the ${BOUNCE_PAUSE_THRESHOLD * 100}% threshold. Remaining batches were not sent, review before continuing manually.`
        );
        break;
      }
    }

    console.log("");
  }

  console.log(`\n=== DONE: ${totalSent} sent, ${totalFailed} failed, ${eligible.length - totalSent - totalFailed} not attempted (stopped early or dry run) ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
