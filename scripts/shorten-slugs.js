#!/usr/bin/env node
// One-time cleanup: strip the random suffix from auto-provisioned member
// slugs (e.g. "simply-water-boksburg-q3kf" -> "simply-water-boksburg") so
// member URLs are shorter. The old slug is preserved in previous_slugs, and
// the [clientSlug] route 301s any former slug to the current one, so existing
// shares and the reactivation emails already sent keep working.
//
// Only renames when the current slug is exactly slugify(business_name) plus a
// short trailing suffix. Deliberately-short custom slugs (helplift,
// standing365, buffelskop) don't match that shape and are left alone.
//
// Usage: node scripts/shorten-slugs.js            (dry run, changes nothing)
//        node scripts/shorten-slugs.js --apply     (rename for real)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
const APPLY = process.argv.includes("--apply");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };

function slugify(input) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// RESERVED_SLUGS (src/lib/slugify.ts) plus every real top-level route folder,
// so a cleaned slug can never collide with an app route.
const RESERVED = new Set([
  "growth", "stoep", "beta", "app", "www", "admin", "api", "privacy", "terms",
  "pricing", "preview", "sample", "login", "logout", "dashboard", "onboard",
  "auth", "set-password", "forgot-password", "reset-password", "sitemap",
  "robots", "g", "marketplace", "shop", "events", "faq", "how-it-works",
  "agents", "agent-link", "r", "unsubscribe", "home",
]);

(async () => {
  if (!SUPABASE_URL || !KEY) { console.error("Missing Supabase env."); process.exit(1); }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/growth_clients?select=id,slug,business_name,previous_slugs&status=eq.active&order=business_name`,
    { headers: H }
  );
  const clients = await res.json();

  // Everything already taken: current slugs + reserved. New bases get added
  // as we go so two businesses can't both claim the same clean slug.
  const taken = new Set([...RESERVED, ...clients.map((c) => c.slug)]);

  const plan = [];
  for (const c of clients) {
    const base = slugify(c.business_name || "");
    if (!base || base === c.slug) continue; // empty or already clean
    // must be exactly base + "-" + a short suffix (the auto code)
    if (!c.slug.startsWith(`${base}-`)) continue;
    const suffix = c.slug.slice(base.length + 1);
    if (!/^[a-z0-9]{3,8}$/.test(suffix)) continue; // not a plain short suffix
    if (taken.has(base)) continue; // collision, keep the suffix
    taken.delete(c.slug); // the old slug is freed (becomes a redirect)
    taken.add(base);
    plan.push({ id: c.id, from: c.slug, to: base, previous_slugs: c.previous_slugs || [] });
  }

  console.log(`${plan.length} slug(s) to shorten:`);
  plan.forEach((p) => console.log(`  ${p.from}  ->  ${p.to}`));
  if (!APPLY) { console.log("\nDRY RUN. Re-run with --apply to rename."); return; }

  let ok = 0;
  for (const p of plan) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/growth_clients?id=eq.${p.id}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({ slug: p.to, previous_slugs: [...new Set([...p.previous_slugs, p.from])] }),
      });
      ok++;
      console.log(`  renamed ${p.from} -> ${p.to}`);
    } catch (err) {
      console.error(`  FAILED ${p.from}: ${err.message}`);
    }
  }
  console.log(`\n=== ${ok}/${plan.length} renamed ===`);
})().catch((e) => { console.error(e); process.exit(1); });
