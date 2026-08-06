#!/usr/bin/env node
// Handoff: scripts/handoff-activation-nudges-and-emails.md, Job 7, Email 2.
//
// Run this only after Email 1's batch has gone out, at least a week later,
// and only after confirming Job 1 (the activation button) is live — the
// handoff is explicit that these two never overlap, and this script has no
// way to check either condition itself.
//
// Targets the one population this schema can actually answer "who is
// about to lapse" for: a Foundation trial ending soon with no payment on
// file (same fields src/app/api/cron/trial-reminders/route.ts already
// uses for its own, much terser automated reminder). This is a separate,
// one-time, fuller-copy send, not a duplicate of that cron — see the
// handoff report for why a paid-subscriber renewal case isn't trackable
// with what this schema stores today.
//
// Usage:
//   node --env-file=.env.local scripts/send-subscription-expiry-email.js            (dry run)
//   node --env-file=.env.local scripts/send-subscription-expiry-email.js --live
//   node --env-file=.env.local scripts/send-subscription-expiry-email.js --live --batch-size=10 --pause=120

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
// "About to lapse" — matches the cron's own 2-day heads-up window in
// spirit but wider, since this is a one-time send rather than a daily
// pass: catches anyone whose trial ends within the next week.
const LAPSE_WINDOW_DAYS = Number(args.find((a) => a.startsWith("--window-days="))?.split("=")[1] ?? 7);

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

function formatDateZa(iso) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

// Verbatim from the handoff, Email 2.
function buildEmailHtml({ name, dateLabel, pageUrl }) {
  const renewUrl = `${SITE_URL}/pricing`;
  return `
    <p>Good day ${name},</p>
    <p>Your subscription runs out on ${dateLabel}, and when it does your page at ${pageUrl} comes down and you drop off the marketplace.</p>
    <p>What you keep by renewing:</p>
    <ul>
      <li>Your page stays live at the same address, so anything you have shared still works</li>
      <li>You stay on the marketplace where people search by trade and area</li>
      <li>Your reviews stay where customers can see them</li>
      <li>KatisoBiz stays included</li>
    </ul>
    <p><a href="${renewUrl}"><strong>Renew now</strong></a></p>
    <p>One thing worth knowing: paying for the year works out cheaper per month than paying monthly. Both options are on the renewal page.</p>
    <p>If something is not working for you, reply to this and tell me. I would rather fix it than lose you.</p>
    <p>Regards,<br />Dewald<br />DigitalFlyer SA</p>
    ${EMAIL_FOOTER_HTML}
  `;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY or RESEND_API_KEY in the environment.");
    process.exit(1);
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + LAPSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    select: "id,business_name,contact_email,slug,trial_ends_at,email_unsubscribed_at,email_bounced_at,email_complained_at",
    plan: "eq.foundation",
    status: "eq.active",
    paystack_reference: "is.null",
    trial_ends_at: `not.is.null`,
  });
  const candidates = await sb(`/rest/v1/growth_clients?${params.toString()}`);

  const eligible = candidates.filter((c) => {
    const endsAt = new Date(c.trial_ends_at);
    return (
      endsAt > now &&
      endsAt <= windowEnd &&
      c.contact_email &&
      !c.email_unsubscribed_at &&
      !c.email_bounced_at &&
      !c.email_complained_at
    );
  });

  console.log(
    `${eligible.length} eligible recipients (Foundation trial lapsing within ${LAPSE_WINDOW_DAYS} days, no payment on file, not suppressed).`
  );
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
      const dateLabel = formatDateZa(client.trial_ends_at);
      const pageUrl = `${SITE_URL}/${client.slug}`;
      const html = buildEmailHtml({ name: client.business_name, dateLabel, pageUrl });
      const subject = `${client.business_name}, your DigitalFlyer page comes down on ${dateLabel}`;

      if (!LIVE) {
        console.log(`  [dry run] would send to ${client.business_name} <${client.contact_email}>, lapses ${dateLabel}`);
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
