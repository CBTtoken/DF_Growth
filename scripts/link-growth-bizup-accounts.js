#!/usr/bin/env node
// Handoff: scripts/handoff-unified-account-and-reviews.md, Job 1 Phase A.
//
// bizup_accounts.growth_client_id is null on every account. This links the
// two products' accounts for real people who already exist on both,
// matched on cell number, never on name or email (email is unreliable
// here: members change it, share it, or used a different one per product).
//
// Cell number is read from growth_clients.call_phone and .whatsapp_phone
// (contact_phone is a dead, already-backfilled column) against
// bizup_accounts.phone and .whatsapp. A match is any normalized value on
// one side equal to any normalized value on the other. Normalization only
// ever happens in memory here — it never rewrites the stored value on
// either table.
//
// Dry run (default): reads both tables, writes a markdown report to
// docs/, applies nothing.
//   node --env-file=.env.local scripts/link-growth-bizup-accounts.js
//
// Apply (only after Dewald approves the report's confident-match list):
//   node --env-file=.env.local scripts/link-growth-bizup-accounts.js --apply

/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS script, same pattern as scripts/send-reactivation-batch.js */
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const APPLY = process.argv.includes("--apply");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in the environment.");
  process.exit(1);
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

// Leading 0 -> 27..., +27 -> 27..., 27... unchanged, spaces/brackets/dashes
// stripped. Returns null for anything that doesn't reduce to a plausible SA
// number, so junk data never accidentally "matches" junk data.
function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  if (!digits.startsWith("27")) return null;
  if (digits.length !== 11) return null;
  return digits;
}

function growthPhoneCandidates(client) {
  const out = [];
  for (const field of ["call_phone", "whatsapp_phone", "contact_phone"]) {
    const n = normalizePhone(client[field]);
    if (n) out.push({ field, raw: client[field], normalized: n });
  }
  return out;
}

function bizupPhoneCandidates(account) {
  const out = [];
  for (const field of ["phone", "whatsapp"]) {
    const n = normalizePhone(account[field]);
    if (n) out.push({ field, raw: account[field], normalized: n });
  }
  return out;
}

async function main() {
  const growthClients = await sb(
    "/rest/v1/growth_clients?select=id,business_name,slug,contact_email,call_phone,whatsapp_phone,contact_phone&order=created_at.asc"
  );
  const bizupAccounts = await sb(
    "/rest/v1/bizup_accounts?select=id,business_name,email,phone,whatsapp,growth_client_id&order=created_at.asc"
  );

  // growth_client_id already set on a bizup_accounts row means it was
  // linked in an earlier run (or by hand) -- leave those alone entirely,
  // they are not part of this pass's matching problem.
  const unlinkedBizup = bizupAccounts.filter((a) => !a.growth_client_id);

  // normalized phone -> list of { side: 'growth'|'bizup', record, match }
  const byPhone = new Map();

  for (const client of growthClients) {
    for (const cand of growthPhoneCandidates(client)) {
      if (!byPhone.has(cand.normalized)) byPhone.set(cand.normalized, []);
      byPhone.get(cand.normalized).push({ side: "growth", client, cand });
    }
  }
  for (const account of unlinkedBizup) {
    for (const cand of bizupPhoneCandidates(account)) {
      if (!byPhone.has(cand.normalized)) byPhone.set(cand.normalized, []);
      byPhone.get(cand.normalized).push({ side: "bizup", account, cand });
    }
  }

  const confidentMatches = []; // { growthClient, bizupAccount, normalized, growthField, growthRaw, bizupField, bizupRaw }
  const ambiguous = []; // normalized number matching more than one account on either side
  const matchedGrowthIds = new Set();
  const matchedBizupIds = new Set();

  for (const [normalized, entries] of byPhone) {
    const growthSide = [...new Set(entries.filter((e) => e.side === "growth").map((e) => e.client.id))];
    const bizupSide = [...new Set(entries.filter((e) => e.side === "bizup").map((e) => e.account.id))];
    if (growthSide.length === 0 || bizupSide.length === 0) continue; // no cross-product match on this number

    if (growthSide.length > 1 || bizupSide.length > 1) {
      ambiguous.push({
        normalized,
        growthAccounts: growthSide.map((id) => growthClients.find((c) => c.id === id)),
        bizupAccounts: bizupSide.map((id) => unlinkedBizup.find((a) => a.id === id)),
      });
      continue;
    }

    const growthClient = growthClients.find((c) => c.id === growthSide[0]);
    const bizupAccount = unlinkedBizup.find((a) => a.id === bizupSide[0]);
    const growthEntry = entries.find((e) => e.side === "growth");
    const bizupEntry = entries.find((e) => e.side === "bizup");

    confidentMatches.push({
      growthClient,
      bizupAccount,
      normalized,
      growthField: growthEntry.cand.field,
      growthRaw: growthEntry.cand.raw,
      bizupField: bizupEntry.cand.field,
      bizupRaw: bizupEntry.cand.raw,
    });
    matchedGrowthIds.add(growthClient.id);
    matchedBizupIds.add(bizupAccount.id);
  }

  const growthOnly = growthClients.filter((c) => !matchedGrowthIds.has(c.id));
  const bizupOnly = unlinkedBizup.filter((a) => !matchedBizupIds.has(a.id));

  const lines = [];
  lines.push("# Job 1 Phase A: proposed account links");
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()}. ${APPLY ? "APPLY run: links below were written." : "Dry run: nothing was written."}`);
  lines.push("");
  lines.push(`- growth_clients: ${growthClients.length}`);
  lines.push(`- bizup_accounts already linked (untouched by this run): ${bizupAccounts.length - unlinkedBizup.length}`);
  lines.push(`- bizup_accounts unlinked (in scope): ${unlinkedBizup.length}`);
  lines.push(`- Confident matches: ${confidentMatches.length}`);
  lines.push(`- Growth accounts with no KatisoBiz counterpart: ${growthOnly.length}`);
  lines.push(`- KatisoBiz accounts with no Growth counterpart: ${bizupOnly.length}`);
  lines.push(`- Ambiguous (one number, more than one account on a side): ${ambiguous.length}`);
  lines.push("");

  lines.push("## Confident matches, ready to apply");
  lines.push("");
  if (confidentMatches.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Growth business | Growth id | KatisoBiz business | KatisoBiz id | Matched on | Growth field (raw) | KatisoBiz field (raw) |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const m of confidentMatches) {
      lines.push(
        `| ${m.growthClient.business_name} | ${m.growthClient.id} | ${m.bizupAccount.business_name} | ${m.bizupAccount.id} | ${m.normalized} | ${m.growthField}: ${m.growthRaw} | ${m.bizupField}: ${m.bizupRaw} |`
      );
    }
  }
  lines.push("");

  lines.push("## Growth accounts with no KatisoBiz counterpart");
  lines.push("");
  if (growthOnly.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Business | id | slug | phones on file |");
    lines.push("|---|---|---|---|");
    for (const c of growthOnly) {
      const phones = [c.call_phone, c.whatsapp_phone, c.contact_phone].filter(Boolean).join(", ") || "(none on file)";
      lines.push(`| ${c.business_name} | ${c.id} | ${c.slug} | ${phones} |`);
    }
  }
  lines.push("");

  lines.push("## KatisoBiz accounts with no Growth counterpart");
  lines.push("");
  if (bizupOnly.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Business | id | email | phones on file |");
    lines.push("|---|---|---|---|");
    for (const a of bizupOnly) {
      const phones = [a.phone, a.whatsapp].filter(Boolean).join(", ") || "(none on file)";
      lines.push(`| ${a.business_name} | ${a.id} | ${a.email} | ${phones} |`);
    }
  }
  lines.push("");

  lines.push("## Ambiguous: one number matches more than one account, not resolved");
  lines.push("");
  if (ambiguous.length === 0) {
    lines.push("None.");
  } else {
    for (const a of ambiguous) {
      lines.push(`- **${a.normalized}**`);
      lines.push(`  - Growth: ${a.growthAccounts.map((c) => `${c.business_name} (${c.id})`).join(", ")}`);
      lines.push(`  - KatisoBiz: ${a.bizupAccounts.map((c) => `${c.business_name} (${c.id})`).join(", ")}`);
    }
  }
  lines.push("");

  const outPath = path.join(__dirname, "..", "docs", "PHASE-A-ACCOUNT-LINKS.md");
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`Report written to ${outPath}`);
  console.log(`${confidentMatches.length} confident match(es), ${ambiguous.length} ambiguous, ${growthOnly.length} Growth-only, ${bizupOnly.length} KatisoBiz-only.`);

  if (!APPLY) {
    console.log("Dry run only — nothing written to bizup_accounts. Re-run with --apply once the report is approved.");
    return;
  }

  console.log("Applying confident matches to bizup_accounts...");
  for (const m of confidentMatches) {
    await sb(`/rest/v1/bizup_accounts?id=eq.${m.bizupAccount.id}`, {
      method: "PATCH",
      body: JSON.stringify({ growth_client_id: m.growthClient.id }),
    });
    console.log(`  linked ${m.bizupAccount.business_name} -> ${m.growthClient.business_name}`);
  }
  console.log(`Applied ${confidentMatches.length} link(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
