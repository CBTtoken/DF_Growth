# HANDOFF: THE PLATFORM QUEUE

**Agreed with Dewald, 4 August 2026, at the end of the Molotsi/Copperline session. This is the build order and the decisions behind it. Read `docs/Theme_Library.md`, `docs/Report_Molotsi_Plumbers.md` and `DigitalFlyer/Clients/DigitalFlyer_Market_Thesis.md` first; they are the context this queue grew out of.**

---

## STANDING DECISIONS (apply to every item below)

- **The market thesis governs.** The customer is the informal-market operator; we think for them. The test: could Henry Molotsi use it without anyone explaining it?
- **Light-first design.** Dewald, 4 Aug: dark sites read difficult and need exceptional imagery this market does not have. Dark is allowed as an accent (a hero field, a band), never the page.
- **No invented facts, no invented numbers, no fake social proof.** House rule, absolute. The reference sites' broken "0 projects" counters are the cautionary tale.
- **AI or stock images must never pose as the member's own work.** Ambient and decorative only; credibility photos are always the member's real ones.
- **URL permanence.** Member URLs never change or break. New pages may be added; existing ones never move. `previous_slugs` handles any renames.
- **Every done-for-you build follows the Growth Build Kit** and adds or reuses a Theme Library entry with its "what no other theme does" sentence.
- **Anti-sameness rule:** no two members in the same industry and area on the same theme.

## 1. THE TEN REDOS + THE MEDIA LIBRARY (one sprint, they feed each other)

Pick the ten blandest live member pages (generic templates, weak imagery). Produce a before-board of screenshots and a proposed refit list (member, current template, proposed theme, what changes). **Dewald thumbs-up the list before anything flips live** — they are free members but they are real businesses.

Each redo: refit to the best-fitting theme (or grow a new one per the Build Kit), plain-language copy pass in the member's own register, real photos where they exist, curated imagery where they do not. This is also how the **section variants programme** ships: about, story, lead form and closing CTA currently have one to two structural shapes across all thirteen themes; every redo that needs a new shape adds it to the axis system in `src/lib/templates/anchors.ts`. New section TYPES approved to build as needed: call-back-request strip ("leave your number, we call you"), audience chips, what's-included list, working-hours block.

The media library: a curated, tagged set of real stock images per trade in storage, replacing the raw Pexels-by-keyword fallback (which once gave a butler service a photo of a child). Claude checks any candidate image against the business description before it lands. Free, and it feeds the redos.

**Image SEO rides along:** descriptive alt text everywhere, sensible file names, a proper share image per member page.

## 2. AI IMAGE GENERATION TEST (small, parallel)

Dewald funds ~$10 on **fal.ai** and puts the key in `.env.local` and Vercel as `FAL_KEY` (he creates the account; the key never appears in chat). Then: run a fixed prompt set (plumber ambient, salon, food, construction, retail) through FLUX dev and schnell, build a comparison board, and decide with Dewald whether and where generated ambient imagery enters the media library. Respect the standing decision: never posed as the member's work.

## 3. THE BLOG (after the redos; quick and self-contained)

Admin-only blog creator on the Growth marketing site, for Dewald's own writing (fortnightly commitment, his voice, the informal-market subject matter nobody else writes).

- Works like LinkedIn articles: cover image at a fixed size (**1600×900**, Dewald designs them), title, clean typographic body.
- Reuse Kwaai Press's typography/rendering discipline so every post is professionally set with zero per-post styling.
- Proper metadata, OG image per post, in the sitemap, at /blog on the Growth marketing site. House style: no em dashes, South African English.
- Ticks the existing "blogging option" capture in Dewald's Desk (Growth venture) when it ships.

## 4. THE SHOP (a fresh, dedicated session — this is a product mission)

Dewald's framing: Shopify is expensive and difficult in SA; members' shops must feel genuinely slick, a real alternative. Big addressable market.

Order of work: first a full **audit** of the member shop experience end to end, as a buyer on a phone and as a member in the dashboard, scored against a Shopify-grade checklist (product pages, search, cart, checkout feel, order emails, discounts, stock, delivery). Produce the gap list with honest worth-it/not-yet calls. Then **Sprint 2 of `Handoff_Growth_Shop_and_Payments.md`** (documented, not started: gateway connection, Bob Go) plus the polish layer the audit surfaces. Hard rule from memory: member payments NEVER route through DigitalFlyer's own account.

## 5. THEN: THEME-FITTER, SITE MODE

- **Theme-fitter:** Claude proposes theme + palette from industry, the member's own words, assets, and neighbouring members; admin accepts; automate once corrections stop. Retires the member-facing picker (it becomes an admin/agent tool). Propose-accept-automate, the Desk Sort pattern.
- **Site mode:** multipage-lite as a theme property (Home / Services & Gallery / About / Contact from the same records, member's own nav, DigitalFlyer as a quiet footer line). Needs its own handoff: routing, SEO, dashboard. URL permanence rule is non-negotiable. The multiple-landing-pages infrastructure half-exists already.

## OPERATIONAL NOTES FOR THE NEXT SESSION

- Repo house rules in CLAUDE.md 0.0 apply: never force push, main deploys to production, add only your own paths, verify live with real page strings.
- Build with `--webpack` on this machine (Turbopack blocked).
- More done-for-you member folders are expected in `DigitalFlyer/Clients/`; the Build Kit flow starts with filled-in Part A and Dewald's four answers, always.
- Molotsi follow-ups pending Dewald/client: CIPC number, a photo of Henry, verified facts, reachable towns list.
