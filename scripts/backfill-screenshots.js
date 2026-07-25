#!/usr/bin/env node
// One-time backfill: capture a real screenshot of each active client's page
// (the hero/top viewport) and store it, so the Marketplace shows the actual
// page instead of a flat colour block. Reuses the same ScreenshotOne call as
// src/lib/screenshot/capture.ts (HMAC-signed) and the client-screenshots
// bucket. Targets active clients that have neither an uploaded hero photo nor
// a screenshot yet, to spend the least API quota. Ongoing refresh is handled
// by the weekly refresh-screenshots cron and the admin button.
//
// Usage: node scripts/backfill-screenshots.js            (dry run: lists targets)
//        node scripts/backfill-screenshots.js --capture  (actually captures)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
const ACCESS = process.env.SCREENSHOTONE_ACCESS_KEY;
const SECRET = process.env.SCREENSHOTONE_SECRET_KEY;
const PROD_URL = "https://growth.digitalflyersa.co.za";
const CAPTURE = process.argv.includes("--capture");

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function screenshot(url) {
  const params = new URLSearchParams({
    access_key: ACCESS,
    url,
    viewport_width: "1280",
    viewport_height: "800",
    device_scale_factor: "1",
    format: "jpg",
    image_quality: "80",
    block_cookie_banners: "true",
    block_banners_by_heuristics: "true",
    block_ads: "true",
    cache: "false",
  });
  if (SECRET) params.set("signature", crypto.createHmac("sha256", SECRET).update(params.toString()).digest("hex"));
  const res = await fetch(`https://api.screenshotone.com/take?${params.toString()}`);
  if (!res.ok) return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 120)}` };
  return { ok: true, buf: Buffer.from(await res.arrayBuffer()) };
}

async function upload(id, buf) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/client-screenshots/${id}.jpg`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

(async () => {
  if (!SUPABASE_URL || !KEY) { console.error("Missing Supabase env."); process.exit(1); }
  if (CAPTURE && !ACCESS) { console.error("Missing SCREENSHOTONE_ACCESS_KEY."); process.exit(1); }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/growth_clients?select=id,business_name,slug&status=eq.active&screenshot_path=is.null&hero_photo_id=is.null&slug=not.is.null&order=business_name`,
    { headers: H }
  );
  const targets = await res.json();
  console.log(`${targets.length} targets (active, no photo, no screenshot):`);
  targets.forEach((t) => console.log(`  - ${t.business_name} /${t.slug}`));
  if (!CAPTURE) { console.log("\nDRY RUN. Re-run with --capture to capture."); return; }

  let ok = 0, fail = 0;
  for (const t of targets) {
    try {
      const shot = await screenshot(`${PROD_URL}/${t.slug}`);
      if (!shot.ok) { console.error(`  FAIL ${t.slug}: ${shot.error}`); fail++; continue; }
      await upload(t.id, shot.buf);
      await fetch(`${SUPABASE_URL}/rest/v1/growth_clients?id=eq.${t.id}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({ screenshot_path: `${t.id}.jpg`, screenshot_captured_at: new Date().toISOString() }),
      });
      ok++;
      console.log(`  captured ${t.business_name} (${(shot.buf.length / 1024).toFixed(0)}kb)`);
      await sleep(1500);
    } catch (err) {
      console.error(`  FAIL ${t.slug}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\n=== ${ok} captured, ${fail} failed ===`);
})().catch((e) => { console.error(e); process.exit(1); });
