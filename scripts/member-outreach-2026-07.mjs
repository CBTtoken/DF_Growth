// Member outreach, 31 July 2026. Dewald's clear-out ahead of the new release.
//
//   node scripts/member-outreach-2026-07.mjs            <- dry run, sends nothing
//   node scripts/member-outreach-2026-07.mjs --send     <- sends for real
//
// Dry run by default on purpose: this sends to real businesses and sets the
// date their accounts close.
//
// Three groups:
//   KEEP        never contacted, never at risk
//   EXEMPT      Mikey's, gets help but no deadline, and never closes
//   CAMPAIGN    7 days to reply or the account closes
//
// The 7 days is Dewald's call, 31 July. trial_ends_at is moved to match, so a
// member who logs in sees the same date the email gave them. Without that the
// email and the dashboard would disagree, which is the whole reason the
// original wording was rejected.

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

const KEEP = new Set([
  "buffelskop",
  "helplift",
  "katisobiz-nomads",
  "standing365",
  "werkbewys",
  "jozymee-marketing-creative-solutions",
]);
const EXEMPT = new Set(["mikeys-handyman"]);

const CLOSES_ON = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const CLOSES_LABEL = CLOSES_ON.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

const FOOTER_NOTE = ""; // sendEmail appends the standard footer itself

// ---------------------------------------------------------------------------

function shell(bodyHtml) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#111827;max-width:560px;">${bodyHtml}${FOOTER_NOTE}</div>`;
}

function campaignEmail(name, gaps) {
  const list = gaps.map((g) => `<li style="margin-bottom:6px;">${g}</li>`).join("");
  return shell(`
    <p>Good day ${name},</p>
    <p>We are about to release the new version of our platform, and we are going through
    every member page before it goes out. Yours is live, but it is not pulling its weight yet.</p>
    <p><strong>What is missing from your page right now:</strong></p>
    <ol style="padding-left:20px;margin:0 0 16px;">${list}</ol>
    <p>That is not a complaint. It is the difference between a page people land on and a page
    people phone.</p>
    <p><strong>The three that matter most, in order:</strong></p>
    <ul style="padding-left:20px;margin:0 0 16px;">
      <li style="margin-bottom:6px;"><strong>Photographs.</strong> Five or six of your actual work,
      taken on your phone in daylight. Yours, not stock images. This is the biggest single lift and
      it costs nothing but ten minutes.</li>
      <li style="margin-bottom:6px;"><strong>Prices or packages.</strong> Even a starting price.
      People do not phone when they cannot guess what something costs.</li>
      <li style="margin-bottom:6px;"><strong>One review.</strong> Send your review link to the last
      customer who was happy. One real review beats a page with none by a wide margin.</li>
    </ul>
    <p><strong>We need to hear from you by ${CLOSES_LABEL}.</strong> Reply to
    <a href="mailto:info@digitalflyer.co.za">info@digitalflyer.co.za</a> and tell us one of two
    things: that you want to keep your page and will be adding to it, or that you would rather we
    close the account. Either answer is completely fine and there is no charge for saying no.</p>
    <p>If we do not hear from you at all, we will close the account on that date and remove the
    page. We would rather work with a smaller group of members who actually want this.</p>
    <p>If you want to keep going and would like help getting the page right, say so and we will
    help you do it.</p>
  `);
}

function mushroomEmail() {
  return shell(`
    <p>Good day Mushroom Guru,</p>
    <p>We are about to release the new version of our platform and we are reviewing every member
    page before it goes out. Yours needs a change before we can publish it.</p>
    <p><strong>Your page currently carries claims we cannot publish:</strong></p>
    <ol style="padding-left:20px;margin:0 0 16px;">
      <li style="margin-bottom:6px;">A stated 43% improvement in immune function</li>
      <li style="margin-bottom:6px;">A claim that the product is 348 times more potent</li>
      <li style="margin-bottom:6px;">References to pre-clinical trial results</li>
      <li style="margin-bottom:6px;">Review counts and star ratings we have no record of</li>
    </ol>
    <p>Your own educational notice on the same page says the products are not evaluated by SAHPRA
    and are not intended to diagnose, treat or cure anything. Those two things cannot sit on the
    same page. Published together they put your business at risk, not ours, and that is why we are
    raising it with you rather than quietly editing it.</p>
    <p><strong>What we suggest instead, which we think sells better anyway:</strong></p>
    <ul style="padding-left:20px;margin:0 0 16px;">
      <li style="margin-bottom:6px;"><strong>Lead with your process.</strong> Dual-phase extraction
      and the chitin cell wall problem are genuinely interesting and almost nobody explains them
      properly.</li>
      <li style="margin-bottom:6px;"><strong>Name your facility and registration details.</strong>
      Those are verifiable and they do the trust work the percentages were trying to do.</li>
      <li style="margin-bottom:6px;"><strong>Show the facility.</strong> Two or three photographs of
      the lab would carry more weight than any number on the page.</li>
      <li style="margin-bottom:6px;"><strong>Keep the SAHPRA notice visible</strong> rather than in
      fine print. It reads as confidence, not as a disclaimer.</li>
    </ul>
    <p><strong>Please reply by ${CLOSES_LABEL}</strong> to
    <a href="mailto:info@digitalflyer.co.za">info@digitalflyer.co.za</a> and tell us whether you
    would like to make these changes yourself, or whether you would like us to draft the replacement
    wording for your approval. We are happy to do the writing.</p>
    <p>If we do not hear from you by then we will close the account and remove the page.</p>
  `);
}

function mikeyEmail() {
  return shell(`
    <p>Good day Mikey's Handyman,</p>
    <p>We are reviewing every member page ahead of our new release, and yours is in good shape.
    Three things would make a real difference to how much work it brings in.</p>
    <ul style="padding-left:20px;margin:0 0 16px;">
      <li style="margin-bottom:6px;"><strong>Photographs of finished jobs.</strong> You have none at
      the moment, and for a handyman this is the big one. Six photographs of real work, taken on your
      phone in daylight, will do more than anything else on this list. A before and after of one
      repair is worth ten stock images.</li>
      <li style="margin-bottom:6px;"><strong>A callout fee or rough prices.</strong> People hesitate
      to phone when they have no idea what something costs. Even "callout from R350, quoted on site"
      removes that hesitation.</li>
      <li style="margin-bottom:6px;"><strong>One review.</strong> Ask the last customer you did a
      good job for. Your page has a review link you can send them directly.</li>
    </ul>
    <p>No deadline on any of this. If you would like a hand, reply to
    <a href="mailto:info@digitalflyer.co.za">info@digitalflyer.co.za</a> and we will help.</p>
  `);
}

// ---------------------------------------------------------------------------

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to,
      cc: "info@digitalflyer.co.za",
      subject,
      html: html + FOOTER,
    }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  return { ok: true };
}

// Mirrors src/lib/email/footer.ts. Duplicated rather than imported because a
// plain node script cannot resolve the "@/" alias, and this runs once.
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

// ---------------------------------------------------------------------------

const { data: clients } = await admin
  .from("growth_clients")
  .select("id, slug, business_name, contact_email, logo_path, packages, business_address, city, call_phone, whatsapp_phone, email_unsubscribed_at, email_bounced_at")
  .eq("status", "active");

const { data: photoRows } = await admin.from("client_photos").select("growth_client_id");
const { data: reviewRows } = await admin.from("reviews").select("business_id").eq("status", "published");
const photoCount = {};
const reviewCount = {};
for (const p of photoRows ?? []) photoCount[p.growth_client_id] = (photoCount[p.growth_client_id] ?? 0) + 1;
for (const r of reviewRows ?? []) reviewCount[r.business_id] = (reviewCount[r.business_id] ?? 0) + 1;

function gapsFor(c) {
  const gaps = [];
  const n = photoCount[c.id] ?? 0;
  if (n === 0) gaps.push("No photographs of your work");
  else if (n < 3) gaps.push(`Only ${n} photograph${n === 1 ? "" : "s"}`);
  if (!c.logo_path) gaps.push("No logo");
  if (!(Array.isArray(c.packages) && c.packages.length)) gaps.push("No prices or packages");
  if (!(reviewCount[c.id] ?? 0)) gaps.push("No customer reviews yet");
  const addr = (c.business_address ?? "").trim();
  if (!addr) gaps.push("No address, so no map and weaker local search");
  else if (addr.toLowerCase() === (c.city ?? "").toLowerCase()) gaps.push("Only a town in the address, so no map");
  if (!c.call_phone && !c.whatsapp_phone) gaps.push("No phone number, so no call or WhatsApp button");
  return gaps;
}

const campaign = [];
let skipped = 0;

for (const c of clients) {
  if (KEEP.has(c.slug) || EXEMPT.has(c.slug)) continue;
  // The standing rule: never email an unsubscribed or bounced address.
  if (c.email_unsubscribed_at || c.email_bounced_at) {
    console.log(`SKIP (unsubscribed/bounced) ${c.slug}`);
    skipped++;
    continue;
  }
  campaign.push(c);
}

console.log(SEND ? "=== SENDING FOR REAL ===" : "=== DRY RUN, nothing sent ===");
console.log(`closes on: ${CLOSES_LABEL}`);
console.log(`campaign: ${campaign.length} | exempt: ${EXEMPT.size} | keep: ${KEEP.size} | skipped: ${skipped}\n`);

let sent = 0;
const failures = [];

for (const c of campaign) {
  const isMushroom = c.slug === "mushroom-guru-pty-ltd";
  const subject = isMushroom
    ? "Action needed on your DigitalFlyer page before we go live"
    : "Your DigitalFlyer page is missing a few things, and it is costing you enquiries";
  const html = isMushroom ? mushroomEmail() : campaignEmail(c.business_name, gapsFor(c));

  console.log(`${SEND ? "SEND" : "would send"}  ${c.contact_email.padEnd(38)} ${c.business_name}`);
  if (!SEND) continue;

  const result = await sendEmail({ to: c.contact_email, subject, html });
  if (result.ok) sent++;
  else failures.push(`${c.slug}: ${result.error}`);
  await new Promise((r) => setTimeout(r, 600)); // stay well inside Resend's rate limit
}

// Mikey's, exempt from closure, gets help with no deadline.
const mikey = clients.find((c) => c.slug === "mikeys-handyman");
if (mikey) {
  console.log(`${SEND ? "SEND" : "would send"}  ${mikey.contact_email.padEnd(38)} ${mikey.business_name} (no deadline)`);
  if (SEND) {
    const r = await sendEmail({
      to: mikey.contact_email,
      subject: "Three things that would get your DigitalFlyer page more work",
      html: mikeyEmail(),
    });
    if (r.ok) sent++;
    else failures.push(`mikeys-handyman: ${r.error}`);
  }
}

if (SEND) {
  // Move the trial date so the dashboard agrees with the email.
  const { error } = await admin
    .from("growth_clients")
    .update({ trial_ends_at: CLOSES_ON.toISOString() })
    .in("id", campaign.map((c) => c.id));
  console.log(`\ntrial_ends_at moved to ${CLOSES_LABEL} for ${campaign.length} members`, error ? `FAILED ${error.message}` : "ok");
}

console.log(`\nsent: ${sent}`);
if (failures.length) console.log("failures:\n " + failures.join("\n "));
