// KatisoBiz announcement, 31 July 2026.
//
//   node scripts/katisobiz-announcement-2026-07.mjs           <- dry run
//   node scripts/katisobiz-announcement-2026-07.mjs --send    <- sends
//
// Facts in this email were taken from the code, not the specs, after the
// specs under BizUp/docs/ turned out to still use the pre-rename name:
//
//   - Entitlement is by TIER, not billing cycle (lib/bizup/entitlements.ts).
//     Growth Engine and Enterprise include the R49 tier. Foundation includes
//     KatisoBiz Free. Monthly and annual make no difference, which matters
//     because 33 of 34 members are Growth Engine and only 1 is annual.
//   - The R89 tier is described as unlimited documents ONLY. Multi-user and
//     recurring invoices are Sprint 2 and are not built. The landing page
//     deliberately removed them from its own pricing card for exactly this
//     reason and this email must not put them back.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SEND = process.argv.includes("--send");

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// Our own pages, not members. Seven Passes added 31 July on Dewald's call:
// origin of the account unknown and it is closing with the campaign anyway.
const NOT_MEMBERS = new Set(["helplift", "katisobiz-nomads", "seven-passes-initiative"]);

const FOOTER = `
  <hr style="margin-top:32px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:13px;line-height:1.6;color:#4b5563;margin:0 0 12px;">
    Kind Regards<br />Your DigitalFlyer SA Team<br />Visibility and Accessibility<br />
    <a href="mailto:info@digitalflyer.co.za" style="color:#4b5563;">info@digitalflyer.co.za</a><br />
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

function inclusionLine(plan) {
  if (plan === "foundation") {
    return `<p style="margin:0;font-size:15px;line-height:1.6;"><strong>You already have KatisoBiz Free.</strong>
      Ten documents a month, at no cost, for as long as you want it. If your business grows past that,
      the R49 plan is one tap away in your dashboard.</p>`;
  }
  return `<p style="margin:0;font-size:15px;line-height:1.6;"><strong>KatisoBiz is already included in your
    DigitalFlyer SA Growth membership, at no extra cost.</strong> The R49 plan, with 75 documents a
    month, is yours as part of what you already pay. Nothing to buy and nothing to activate beyond
    signing in.</p>`;
}

function email(name, plan) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#111827;max-width:580px;">
    <p>Good day ${name},</p>

    <p>We want to tell you about <strong>KatisoBiz</strong>, our quoting and invoicing tool. It has
    been running quietly for a while now and the feedback from the businesses using it has been
    genuinely good, so it is time we told everyone properly.</p>

    <h2 style="font-size:18px;margin:26px 0 8px;">What it does</h2>
    <p>You build a quote on your phone in under a minute, send it straight to the customer on
    WhatsApp, and when the job is done you turn that same quote into an invoice with one tap. It
    tracks who has paid and who has not, so you know who to chase.</p>
    <p>It handles VAT correctly on its own, based on whether you are a registered VAT vendor, and it
    handles corrections properly so your paperwork stays clean without you needing to know any
    accounting words.</p>
    <p><strong>It is not an accounting package, on purpose.</strong> No ledgers, no payroll, no VAT
    returns. It makes the documents and tracks the money. That is the whole job.</p>

    <h2 style="font-size:18px;margin:26px 0 8px;">Why members like it</h2>
    <ul style="padding-left:20px;margin:0 0 16px;">
      <li style="margin-bottom:8px;"><strong>You quote while you are still standing there.</strong>
      Most work is lost to the person who quoted first, not the person who quoted cheapest.</li>
      <li style="margin-bottom:8px;"><strong>It goes out on WhatsApp</strong>, which is where your
      customers already are, instead of an email they will not open.</li>
      <li style="margin-bottom:8px;"><strong>It looks like a real business.</strong> Your logo, your
      details, a proper document instead of a number typed into a chat.</li>
      <li style="margin-bottom:8px;"><strong>You can see who owes you.</strong> Statements are built
      in, so chasing money stops being a memory exercise.</li>
      <li style="margin-bottom:8px;"><strong>It works on any phone.</strong> No app to install.</li>
    </ul>

    <h2 style="font-size:18px;margin:26px 0 8px;">The plans</h2>
    <table style="border-collapse:collapse;width:100%;margin-bottom:16px;font-size:14px;">
      <tr style="background:#f3f4f6;">
        <th align="left" style="padding:8px 10px;">Plan</th>
        <th align="left" style="padding:8px 10px;">Price</th>
        <th align="left" style="padding:8px 10px;">What you get</th>
      </tr>
      <tr>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;"><strong>Free</strong></td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;">R0 forever</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;">10 documents a month, 1 template, WhatsApp sending, VAT handling</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;"><strong>KatisoBiz</strong></td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;">R49 a month</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;">75 documents a month, all 5 templates, your own logo, customer list, reports and statements, export for your accountant</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;"><strong>Unlimited</strong></td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;">R89 a month</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb;">Everything above, with no monthly document limit</td>
      </tr>
    </table>

    <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px;padding:16px;margin:20px 0;">
      ${inclusionLine(plan)}
    </div>

    <p style="margin:26px 0;">
      <a href="https://katisobiz.co.za" style="background:#1d4ed8;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:700;display:inline-block;">Have a look at KatisoBiz</a>
    </p>
    <p style="font-size:14px;color:#4b5563;">Or go straight to <a href="https://katisobiz.co.za">katisobiz.co.za</a>.</p>

    <p>If you would like us to walk you through it, reply to this email and we will.</p>
  </div>${FOOTER}`;
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to, cc: "info@digitalflyer.co.za", subject, html }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  return { ok: true };
}

const { data: clients } = await admin
  .from("growth_clients")
  .select("slug, business_name, contact_email, plan, email_unsubscribed_at, email_bounced_at")
  .eq("status", "active");

const recipients = clients.filter((c) => {
  if (NOT_MEMBERS.has(c.slug)) return false;
  if (c.email_unsubscribed_at || c.email_bounced_at) {
    console.log(`SKIP (unsubscribed/bounced) ${c.slug}`);
    return false;
  }
  return true;
});

console.log(SEND ? "=== SENDING FOR REAL ===" : "=== DRY RUN, nothing sent ===");
console.log(`recipients: ${recipients.length}\n`);

let sent = 0;
const failures = [];
for (const c of recipients) {
  console.log(`${SEND ? "SEND" : "would send"}  ${c.contact_email.padEnd(38)} ${c.business_name.padEnd(42)} ${c.plan}`);
  if (!SEND) continue;
  const r = await sendEmail({
    to: c.contact_email,
    subject: "KatisoBiz: quote and invoice from your phone, already included in your membership",
    html: email(c.business_name, c.plan),
  });
  if (r.ok) sent++;
  else failures.push(`${c.slug}: ${r.error}`);
  await new Promise((res) => setTimeout(res, 600));
}

console.log(`\nsent: ${sent}`);
if (failures.length) console.log("failures:\n " + failures.join("\n "));
