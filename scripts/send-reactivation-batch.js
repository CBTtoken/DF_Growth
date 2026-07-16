#!/usr/bin/env node
// Legacy Reactivation Sprint 2, Section 9: staged batch sending, manually
// triggered only — "no automatic sending, ever, without an explicit
// manual trigger per batch." This lives as a real, checked-in script
// rather than an admin-panel button on purpose: a button is one accidental
// click away from looking automatic; a script that must be deliberately
// invoked in a terminal, defaults to a dry run, and requires an explicit
// --live flag to send anything real is a structurally safer shape for an
// action this consequential.
//
// Plain CommonJS + raw fetch, matching the established pattern for this
// project's operational batch scripts (no new dependency just to run one
// script) — mirrors src/lib/email/resend.ts's footer HTML and
// src/lib/email/unsubscribe-token.ts's HMAC scheme by hand rather than
// importing compiled TS, since this runs standalone via `node`.
//
// Usage:
//   node scripts/send-reactivation-batch.js            (dry run, sends nothing)
//   node scripts/send-reactivation-batch.js --live      (sends for real)
//   node scripts/send-reactivation-batch.js --live --batch-size=10 --pause=120

// Plain CommonJS by design, runs standalone via `node`, not part of the Next build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
// Section 9: "use a separate sending subdomain for this campaign." Falls
// back to the existing transactional from-address with a loud warning if
// the dedicated one isn't configured yet — dry runs still work either way,
// but --live should not proceed on the fallback without deliberate intent.
const REACTIVATION_FROM_EMAIL = process.env.RESEND_REACTIVATION_FROM_EMAIL;
const FALLBACK_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "DigitalFlyer Growth <onboarding@resend.dev>";

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const BATCH_SIZE = Number(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ?? 12);
const PAUSE_SECONDS = Number(args.find((a) => a.startsWith("--pause="))?.split("=")[1] ?? 90);
const BOUNCE_PAUSE_THRESHOLD = 0.05; // 5%, per spec's "roughly 3 to 5%"

const EMAIL_FOOTER_HTML = `
  <hr style="margin-top:32px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:13px;line-height:1.6;color:#4b5563;margin:0 0 12px;">
    Kind Regards<br />
    Your DigitalFlyer SA Team<br />
    Visibility and Accessibility<br />
    WhatsApp: +27(0)72 311 0570<br />
    Our Marketplace: <a href="https://www.digitalflyer.co.za" style="color:#4b5563;">www.digitalflyer.co.za</a>
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

async function generateLoginLink(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "recovery",
      email,
      options: { redirect_to: `${SITE_URL}/auth/callback` },
    }),
  });
  if (!res.ok) throw new Error(`generate_link ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.action_link) throw new Error("generate_link returned no action_link");
  return data.action_link;
}

// Mirrors the approved copy in docs/GROWTH_REACTIVATION_EMAIL_COPY.md —
// keep these in sync if the copy doc changes.
function buildEmailHtml({ businessName, publicPageUrl, loginLink, unsubscribeLink }) {
  return `
    <p>Hi ${businessName} team,</p>
    <p>We spent the last few months completely rebuilding DigitalFlyer SA from the ground up, and your business was one of the ones we didn't want to lose in the process.</p>
    <p><strong>What we've done:</strong> your old listing has been migrated onto our brand new platform, and we didn't just move it over as is. We rewrote your page content and picked a fresh design for ${businessName}, so it's ready to go without you having to do any of that work yourself.</p>
    <p><strong>Your new page is already live, right now, here:</strong><br /><a href="${publicPageUrl}">${publicPageUrl}</a></p>
    <p><strong>Why this actually matters for your business:</strong></p>
    <ul>
      <li><strong>Built to be found.</strong> Your new page is built the way Google actually needs it to be, so local customers searching for what you offer have a real chance of finding you, not just people who already know your name.</li>
      <li><strong>Built to capture leads.</strong> There's a direct enquiry form right on your page, so a customer can reach out and it lands straight in your dashboard, not lost in a comment or a message you might not see for days.</li>
      <li><strong>Already done for you.</strong> No setup, no writing, no design decisions. It's built, it's live, it's yours.</li>
    </ul>
    <p><strong>Your next step, and this matters: you have 7 days of full access starting today.</strong></p>
    <p>To get into your dashboard, manage your page, and see your enquiries, click below to securely log in and set your password:</p>
    <p><a href="${loginLink}"><strong>Log in and set your password</strong></a></p>
    <p>Once you're in, you can stay on our flat-rate Foundation plan, or upgrade to Growth to unlock things like on-demand branded social media graphics and deeper tracking on how your page is performing.</p>
    <p>Let's get your business found again.</p>
    <p>The DigitalFlyer SA Team</p>
    <hr style="margin-top:24px;margin-bottom:12px;border:none;border-top:1px solid #e5e7eb;" />
    <p style="font-size:12px;color:#6b7280;">You're receiving this because you were previously a registered DigitalFlyer SA member. If you'd rather not hear from us, <a href="${unsubscribeLink}">unsubscribe</a>.</p>
    ${EMAIL_FOOTER_HTML}
  `;
}

async function sendViaResend({ to, subject, html, from }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
  return { ok: true };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY || !APP_ENCRYPTION_KEY || !SITE_URL) {
    console.error("Missing one or more required env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY, APP_ENCRYPTION_KEY, NEXT_PUBLIC_SITE_URL).");
    process.exit(1);
  }

  const fromAddress = REACTIVATION_FROM_EMAIL ?? FALLBACK_FROM_EMAIL;
  if (!REACTIVATION_FROM_EMAIL) {
    console.warn(
      "WARNING: RESEND_REACTIVATION_FROM_EMAIL not set — falling back to the shared transactional sender. Section 9 recommends a separate sending subdomain for this campaign so a bad bounce rate here can't damage deliverability for real password-reset/lead emails. Fine for a dry run; reconsider before --live."
    );
  }

  const params = new URLSearchParams({
    select: "id,business_name,contact_email,slug",
    signup_channel: "eq.legacy_reactivation",
    trial_starts_at: "is.null",
    email_verification_status: "eq.valid",
    email_unsubscribed_at: "is.null",
    email_bounced_at: "is.null",
    email_complained_at: "is.null",
  });
  const eligible = await sb(`/rest/v1/growth_clients?${params.toString()}`);

  console.log(`${eligible.length} eligible recipients (unsent, verified, not suppressed).`);
  console.log(`Mode: ${LIVE ? "LIVE — will actually send" : "DRY RUN — sends nothing"}. Batch size: ${BATCH_SIZE}. Pause: ${PAUSE_SECONDS}s.\n`);

  const batches = chunk(eligible, BATCH_SIZE);
  let totalSent = 0;
  let totalFailed = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(`--- Batch ${b + 1}/${batches.length} (${batch.length} recipients) ---`);
    const sentIds = [];

    for (const client of batch) {
      try {
        const loginLink = await generateLoginLink(client.contact_email);
        const unsubscribeLink = `${SITE_URL}/unsubscribe?client=${client.id}&token=${generateUnsubscribeToken(client.id)}`;
        const publicPageUrl = `${SITE_URL}/${client.slug}`;
        const html = buildEmailHtml({ businessName: client.business_name, publicPageUrl, loginLink, unsubscribeLink });

        if (!LIVE) {
          console.log(`  [dry run] would send to ${client.business_name} <${client.contact_email}>`);
          continue;
        }

        const result = await sendViaResend({
          to: client.contact_email,
          subject: `${client.business_name}, your DigitalFlyer page has been rebuilt`,
          html,
          from: fromAddress,
        });

        if (!result.ok) {
          console.error(`  FAILED to send to ${client.business_name}: ${result.error}`);
          totalFailed++;
          continue;
        }

        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await sb(`/rest/v1/growth_clients?id=eq.${client.id}`, {
          method: "PATCH",
          body: JSON.stringify({ trial_starts_at: now.toISOString(), trial_ends_at: trialEndsAt.toISOString() }),
        });

        console.log(`  sent to ${client.business_name} <${client.contact_email}>`);
        sentIds.push(client.id);
        totalSent++;
      } catch (err) {
        console.error(`  FAILED to process ${client.business_name}: ${err.message}`);
        totalFailed++;
      }
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
        console.error(`\nSTOPPING: bounce/complaint rate crossed the ${BOUNCE_PAUSE_THRESHOLD * 100}% threshold. Remaining batches were not sent — review before continuing manually.`);
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
