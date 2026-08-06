#!/usr/bin/env node
// Handoff: scripts/handoff-activation-nudges-and-emails.md, Job 3.
//
// Read-only. Scans every growth_clients row pairwise for a shared cell
// number (same normalization as scripts/link-growth-bizup-accounts.js) or
// a near-identical business name (aggressively normalized: lowercased,
// punctuation stripped, common suffixes like "pty ltd" / "cc" dropped).
// Prints candidates for Dewald to review — nothing is written or
// redirected here, that only happens after he picks which page in each
// pair to keep.
//
// Usage: node --env-file=.env.local scripts/find-duplicate-growth-pages.js

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in the environment.");
  process.exit(1);
}

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} ${path}: ${await res.text()}`);
  return res.json();
}

function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  if (!digits.startsWith("27")) return null;
  if (digits.length !== 11) return null;
  return digits;
}

const SUFFIXES = /\b(pty|ltd|cc|inc|co)\b/g;

function normalizeName(raw) {
  return (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(SUFFIXES, "")
    .replace(/\s+/g, "")
    .trim();
}

async function main() {
  const clients = await sb(
    "/rest/v1/growth_clients?select=id,business_name,slug,status,call_phone,whatsapp_phone,created_at&order=created_at.asc"
  );

  const phoneMatches = [];
  const nameMatches = [];

  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const a = clients[i];
      const b = clients[j];

      const aPhones = [normalizePhone(a.call_phone), normalizePhone(a.whatsapp_phone)].filter(Boolean);
      const bPhones = [normalizePhone(b.call_phone), normalizePhone(b.whatsapp_phone)].filter(Boolean);
      const sharedPhone = aPhones.find((p) => bPhones.includes(p));
      if (sharedPhone) {
        phoneMatches.push({ a, b, sharedPhone });
      }

      const aName = normalizeName(a.business_name);
      const bName = normalizeName(b.business_name);
      if (aName && bName && aName === bName) {
        nameMatches.push({ a, b });
      }
    }
  }

  console.log(`${clients.length} growth_clients scanned.\n`);

  console.log("== Shared cell number ==");
  if (phoneMatches.length === 0) console.log("None.");
  for (const m of phoneMatches) {
    console.log(
      `${m.a.business_name} (${m.a.slug}, ${m.a.status}) <-> ${m.b.business_name} (${m.b.slug}, ${m.b.status}) on ${m.sharedPhone}`
    );
  }

  console.log("\n== Near-identical business name ==");
  if (nameMatches.length === 0) console.log("None.");
  for (const m of nameMatches) {
    console.log(
      `${m.a.business_name} (${m.a.slug}, ${m.a.status}) <-> ${m.b.business_name} (${m.b.slug}, ${m.b.status})`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
