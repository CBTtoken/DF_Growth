// Rebuilds Moxie's rate card page from the real one.
//
// Dewald, 2 August 2026: "what I meant with rate card, it is in July edition
// you can get it all from there." The July PDF turned out to be image only
// and there is no OCR on this machine, but June exists as page images and
// pages 37 and 38 of it are the rate card. Every line below is read off
// those two pages rather than composed.
//
// The one thing that could not be read off them is a price, because there is
// no price on them. Each format carries "COMPLIMENTARY · EDITION 01", which
// was true of June and is a decision about August that only Dewald can make.
// It is left as a line for him rather than guessed at.
//
// Run with: node scripts/seed-ratecard.mjs

import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const pick = (key) => (env.match(new RegExp(`^${key}=(.*)$`, "m")) ?? [])[1].replace(/["\r]/g, "");
const URL_ = pick("NEXT_PUBLIC_SUPABASE_URL");
const KEY = pick("SUPABASE_SECRET_KEY");
const EDITION = "2809e093-b451-4b2c-9512-cbeb3722767b";

const p = (text) => ({ type: "p", content: { text } });
const sub = (text) => ({ type: "subhead", text });
const list = (...items) => ({ type: "list", items: items.map((text) => ({ text })) });
const rows = (...pairs) => ({ type: "rows", rows: pairs.map(([tag, title]) => ({ tag, title })) });

const blocks = [
  // The four reader figures, exactly as June's card prints them. "28 to 55"
  // rather than "28 – 55": an en dash is close enough to an em dash that the
  // house rule catches it, and a rate card that cannot be approved is worse
  // than one with a plain word in it.
  {
    type: "stats",
    cells: [
      { figure: "62 / 38", label: "Percentage female to male" },
      { figure: "28 to 55", label: "Primary age group" },
      { figure: "Mobile", label: "Primary access device" },
      { figure: "Urban SA", label: "Location profile" },
    ],
  },

  sub("Advertising formats"),

  sub("01 · Full page"),
  p("Available inside front cover, inside back cover, outside back cover, or run of magazine."),
  list(
    "Trim 210 x 297mm",
    "Supply with bleed 216 x 303mm",
    "Safe zone 200 x 287mm",
    "PDF/X-1a or JPG",
    "RGB, 300 dpi minimum"
  ),

  sub("02 · Half page"),
  p("Horizontal or vertical, run of magazine."),
  list(
    "Horizontal trim 210 x 148.5mm, with bleed 216 x 151.5mm",
    "Vertical trim 105 x 297mm, with bleed 108 x 303mm",
    "Safe zone 5mm inside the trim",
    "PDF/X-1a or JPG"
  ),

  sub("03 · Quarter page"),
  p("A shared page, run of magazine."),
  list(
    "Trim 105 x 148.5mm",
    "No bleed required",
    "Safe zone 5mm on all edges",
    "PDF/X-1a or JPG",
    "RGB, 300 dpi minimum"
  ),

  sub("Premium positions"),
  rows(
    ["OBC", "Outside back cover. Maximum visibility, the most premium position. Full page only."],
    ["IFC", "Inside front cover. Page 2, the first thing readers see after the cover. Full page only."],
    ["IBC", "Inside back cover. High dwell time as readers finish the issue. Full page only."],
    ["ROM", "Run of magazine. Between editorial sections at Moxie's discretion. All formats."]
  ),

  sub("Artwork requirements"),
  rows(
    ["COLOUR", "RGB only. CMYK files will be converted and colour shift may occur. Always supply RGB originals."],
    ["RESOLUTION", "300 dpi minimum. 150 dpi accepted for digital-only supply. Higher is always better."],
    ["FONTS", "Embed or outline all fonts in PDF. Flatten all text layers in JPG before export."],
    ["BRAND", "Supply artwork in your own colours and design. You do not need to match the Moxie palette. Your ad is your brand."],
    ["SENDING", "Email directly to the Moxie production team. Do not submit via WhatsApp. File quality is lost in compression."],
    ["NAMING", "BusinessName_Month2026_Format, for example OrmondProjects_September2026_FullPage.pdf"]
  ),

  sub("Deadlines and submission"),
  rows(
    ["DEADLINE", "The 10th of the month prior. September 2026 edition: artwork due 10 August 2026."],
    ["NEXT EDITION", "September 2026, published 1 September 2026. Booking open now."],
    ["SUBJECT LINE", "Business · Month · Format, to info@moxiemag.co.za"]
  ),

  p("We do not accept gambling, tobacco, alcohol targeting families, MLM schemes or get-rich-quick products."),

  {
    type: "tip",
    content: {
      text:
        "June's card carried COMPLIMENTARY, EDITION 01 against every format, so no rate has ever been printed. " +
        "Decide before publishing whether August is still complimentary or whether a price goes here, and either " +
        "add it above or delete this block.",
    },
  },
];

const found = await fetch(
  `${URL_}/rest/v1/emag_articles?edition_id=eq.${EDITION}&title=eq.Rate%20Card&select=id`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
).then((r) => r.json());

const body = JSON.stringify({
  pillar: "open",
  section: "Advertising Rate Card",
  title: "Rate Card",
  layout: "band-opener",
  opener: {
    kicker: "ADVERTISING RATE CARD · 2026",
    headline: "Advertise in",
    headlineTurn: "Moxie.",
    standfirst: {
      text: "South Africa's family discovery magazine. Curious minds aged 8 to 80, a monthly digital eMag, read primarily on a phone.",
    },
  },
  blocks,
  updated_at: new Date().toISOString(),
});

const res = found.length
  ? await fetch(`${URL_}/rest/v1/emag_articles?id=eq.${found[0].id}`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body,
    })
  : await fetch(`${URL_}/rest/v1/emag_articles`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ ...JSON.parse(body), edition_id: EDITION, status: "draft", tighten: 0 }),
    });

const out = await res.json();
console.log(res.ok ? `${found.length ? "Updated" : "Created"} "${out[0].title}" with ${blocks.length} blocks` : JSON.stringify(out));
