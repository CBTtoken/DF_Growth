#!/usr/bin/env node
// One-off admin provisioning for a real client: Buffelskop (Sundried
// Cayenne Chilli Powder, contact Jaco/Adri at TCAC), referred by Natasha
// Rosema, who becomes both the account's login/owner and a registered
// Agent. Dewald's own instruction was to skip the normal signup/
// authorization flow entirely — this mirrors provisionGrowthClient's
// (src/lib/growth-client/provision.ts) exact insert shape by hand, plain
// CommonJS + raw fetch, matching this repo's one existing precedent script
// (scripts/send-reactivation-batch.js) rather than trying to import
// compiled TS into a standalone script.
//
// Custom 14-day trial (not the platform's standard 7 days), Growth tier,
// annual billing (so the eventual paid conversion qualifies for agent
// commission per the Agent Referral Programme's own rule: Growth/Enterprise
// annual only). Natasha's referral is being manually honored at 40% rather
// than the standard first-referral 25% tier — see the printed reminder at
// the end of a --live run, this needs a manual commission_ledger correction
// once Buffelskop's trial actually converts to a real payment in 14 days.
//
// Usage:
//   node scripts/provision-buffelskop.js            (dry run, writes nothing)
//   node scripts/provision-buffelskop.js --live      (creates the real account)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
// Deliberately NOT process.env.NEXT_PUBLIC_SITE_URL — that's localhost in
// this repo's .env.local for local dev. Every link a real person (Natasha,
// Jaco, Adri) actually receives must point at the live production site.
const SITE_URL = "https://growth.digitalflyersa.co.za";

const LIVE = process.argv.includes("--live");

const BUSINESS_NAME = "Buffelskop";
const SLUG = "buffelskop";
const CONTACT_EMAIL = "adri@tcac.co.za";
const CALL_PHONE = "082 824 8328";
const CITY = "Rustenburg";

const AGENT_NAME = "Natasha Rosema";
const AGENT_EMAIL = "natasharosema.falcon@gmail.com";

function trialEndsAtIso() {
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
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

async function inviteUser(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/invite?redirect_to=${encodeURIComponent(`${SITE_URL}/auth/callback`)}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`invite ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Mirrors generateUniqueReferralCode's exact convention (src/lib/agents/
// referral-code.ts): first name, lowercased, collision-suffixed.
async function uniqueReferralCode(fullName) {
  const base = fullName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const existing = await sb(`/rest/v1/agents?select=id&referral_code=eq.${candidate}`);
    if (existing.length === 0) return candidate;
  }
  throw new Error("Could not generate a unique referral code");
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars.");
    process.exit(1);
  }

  console.log(LIVE ? "LIVE run — this will create real records and send real emails.\n" : "DRY RUN — nothing will be written. Pass --live to actually run this.\n");

  const existingClient = await sb(`/rest/v1/growth_clients?select=id,slug&slug=eq.${SLUG}`);
  if (existingClient.length > 0) {
    console.error(`A growth_client with slug "${SLUG}" already exists (id ${existingClient[0].id}) — aborting to avoid a duplicate.`);
    process.exit(1);
  }
  const existingAgent = await sb(`/rest/v1/agents?select=id,email&email=eq.${encodeURIComponent(AGENT_EMAIL)}`);
  if (existingAgent.length > 0) {
    console.error(`An agent with email "${AGENT_EMAIL}" already exists (id ${existingAgent[0].id}) — aborting to avoid a duplicate.`);
    process.exit(1);
  }

  const referralCode = LIVE ? await uniqueReferralCode(AGENT_NAME) : "natasha";
  console.log(`Plan: invite ${AGENT_EMAIL}, create agent (referral code "${referralCode}"), create growth_client "${BUSINESS_NAME}" (slug "${SLUG}"), link growth_members, publish custom landing page.`);

  if (!LIVE) {
    console.log("\nDry run complete. Re-run with --live to execute for real.");
    return;
  }

  // 1. Invite Natasha — this IS the "set your password" email Dewald asked for.
  console.log(`\nInviting ${AGENT_EMAIL}...`);
  const invite = await inviteUser(AGENT_EMAIL);
  const natashaUserId = invite.id || invite.user?.id;
  if (!natashaUserId) throw new Error(`Invite response had no user id: ${JSON.stringify(invite)}`);
  console.log(`  -> auth user ${natashaUserId} created, invite email sent.`);

  // 2. Register Natasha as an approved Agent.
  console.log("Creating agent record...");
  const [agent] = await sb("/rest/v1/agents", {
    method: "POST",
    body: JSON.stringify({
      user_id: natashaUserId,
      full_name: AGENT_NAME,
      email: AGENT_EMAIL,
      whatsapp_number: "Not provided",
      facebook_page_url: "Not provided",
      understands_facebook_rules: "yes",
      can_generate_content: "yes",
      promotion_method: "both",
      status: "approved",
      referral_code: referralCode,
      approved_at: new Date().toISOString(),
    }),
  });
  console.log(`  -> agent ${agent.id} (referral code "${agent.referral_code}").`);

  // 3. Create the Buffelskop growth_client, already referred by Natasha.
  console.log("Creating growth_client...");
  const [client] = await sb("/rest/v1/growth_clients", {
    method: "POST",
    body: JSON.stringify({
      business_name: BUSINESS_NAME,
      slug: SLUG,
      plan: "growth_engine",
      status: "active",
      billing_cycle: "annual",
      contact_email: CONTACT_EMAIL,
      call_phone: CALL_PHONE,
      whatsapp_phone: CALL_PHONE,
      city: CITY,
      consented_at: null,
      marketing_consent: false,
      is_founding_member: false,
      founding_signup_number: null,
      referred_by_agent_id: agent.id,
      is_agent_comped: false,
      trial_ends_at: trialEndsAtIso(),
    }),
  });
  console.log(`  -> growth_client ${client.id} (/${client.slug}).`);

  // 4. Link Natasha as the account's owner login.
  console.log("Linking growth_members...");
  await sb("/rest/v1/growth_members", {
    method: "POST",
    body: JSON.stringify({ user_id: natashaUserId, growth_client_id: client.id, role: "growth_owner" }),
  });

  // 5. Publish the bespoke custom page.
  console.log("Publishing custom landing page...");
  await sb("/rest/v1/landing_pages", {
    method: "POST",
    body: JSON.stringify({
      growth_client_id: client.id,
      slug: "home",
      headline: "Premium Sundried Cayenne Chilli Powder",
      cta_label: "Order Now",
      cta_href: "#lead-form",
      published: true,
      page_type: "custom",
      custom_page_key: "buffelskop",
    }),
  });

  console.log("\nDone. Live at:", `${SITE_URL}/${SLUG}`);
  console.log("Trial ends:", trialEndsAtIso());
  console.log(
    "\nREMINDER: Natasha's referral is being honored at 40% commission rather than the standard first-referral 25%. " +
      "When Buffelskop's 14-day trial actually converts to a real payment, the webhook will write a commission_ledger " +
      "row at the standard 25% rate — that row needs a manual correction to rate_applied=40 and a recalculated " +
      "amount_due at that point, per Dewald's explicit instruction to honor 40% for this specific referral."
  );
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
