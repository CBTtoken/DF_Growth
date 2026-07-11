# DigitalFlyer Growth — Platform Overview

Prepared 2026-07-11 for internal use (business documentation and next-phase planning). Reflects what is actually built and live in production at `https://df-growth.vercel.app`, not aspirational scope.

---

## 1. What DigitalFlyer Growth is

A growth-as-a-service platform for South African small businesses. A business owner signs up, answers a short guided wizard about their business, and within minutes has:

- A professional, branded landing page live on the web, built from their own words, colours, logo and photos, not a generic template they have to fill in themselves
- A lead capture form on that page that reaches them by email/phone the moment a customer enquires
- Auto-generated social media graphics pulling from their real testimonials
- A place in the DigitalFlyer SA Marketplace and wider ecosystem
- On the Growth tier, connected Meta (Facebook/Instagram) ad tracking so their ad spend can actually be measured

The pitch, in one line: *"Build Your Presence. Grow Your Business."* — DigitalFlyer does the technical and design work a small business owner doesn't have time to learn.

---

## 2. Who uses it, and what they can do

### 2.1 Prospective client (not yet signed up)
Lands on the marketing page (`/pricing` — the site's actual homepage, `/` redirects here), reads the pitch, sees three real live-rendered example page styles, compares three pricing tiers, and signs up.

### 2.2 Business owner — during signup (the onboarding wizard)
A one-question-per-screen wizard, resumable at any point (a client who closes the tab picks up exactly where they left off):

1. **Business info** — business name, contact email, contact phone
2. **Business profile** — province, industry, business address, business description, tagline, products/services, additional notes, Facebook/Instagram links
3. **Brand kit** — primary/secondary brand colour (with contrast safety built in — a colour that would be unreadable as text is automatically adjusted), logo upload
4. **Template picker** — choose 1 of 10 real, live-previewed landing page layouts (see Section 4)
5. **Landing page copy** — headline, subheadline, CTA button label, about text, services text; an AI-generated first draft is offered using everything captured so far, which the owner can accept as-is or edit
6. **Packages** — optional list of service packages/pricing to display on the page
7. **Meta ad connection** *(Growth tier only, skipped for Foundation)* — Meta Pixel ID and Ad Account ID, or "I don't know / need help" (routes to a follow-up from DigitalFlyer's team, visible on the internal admin view)

At the end: account is active, landing page is live immediately, and the owner lands on their dashboard.

### 2.3 Business owner — after signup (the dashboard)
Everything below lives at `/dashboard`, one continuous page:

- **View/Edit your page** — one-click link to the live public page, and a full "Edit your page" screen (`/dashboard/edit`) reusing every onboarding field so any detail (business info, brand colours, logo, landing copy, packages) can be corrected or updated any time, changes go live immediately, no re-onboarding needed
- **Change template** — switch between the 10 landing page layouts at any time without losing any content
- **Photo gallery** — upload up to 10 real business photos (multi-file upload in one go), used in templates that showcase imagery (e.g. Left-Heavy Split), first uploaded photo is the "primary" shown everywhere; falls back to a relevant stock photo by industry if none uploaded yet
- **Leads** — every enquiry from the page's lead form, with clickable email/phone
- **Testimonials** — add customer testimonials (author, quote, star rating); each one automatically generates a downloadable branded social media graphic
- **Digital asset style** — pick from 4 visual styles (Clean, Bold Quote, Star Card, Mono Badge) for future auto-generated testimonial graphics
- **Generated social assets** — gallery of every auto-generated graphic, downloadable
- **Meta ad tracking** *(Growth tier)* — connect/update Pixel ID and Ad Account ID, paste a Meta Conversions API access token (encrypted at rest, never stored in plaintext), see delivery status of the last 10 conversion events sent to Meta
- **Search & ad platform verification** *(new)* — paste a Google Search Console or Meta Business domain verification code; DigitalFlyer automatically adds the required tag to the live page's `<head>` — no code, no waiting on us
- **Client-side Meta Pixel** *(new, automatic)* — once a Pixel ID is connected, the public page also fires the Pixel's base tracking code (page views), building the retargeting/lookalike audience data Meta ads need. This is separate from and in addition to the existing server-side Conversions API, which remains the source of truth for actual lead conversions (deliberately not duplicated client-side, to avoid double-counting)
- **Account** — plan/status, self-serve cancel (no contract, cancel any time), self-serve upgrade
- **Also available to you** — DigitalFlyer SA Marketplace listing request, RE:Biz Nomads community invite (shared ecosystem benefits, not exclusive to Growth)

### 2.4 Customer (visitor to a client's page)
Sees a branded, mobile-responsive landing page at `df-growth.vercel.app/g/[business-slug]` — business name, logo, hero message, about/story/services/packages/testimonials/location sections (only the ones with real content show, numbered cleanly with no gaps), and a lead form to get in touch. Page is cached and revalidated every 60 seconds for fast load times.

### 2.5 DigitalFlyer team (Dewald) — admin view
`/admin`, gated by an email allowlist (no separate admin login system): read-only list of every client (business, email, plan, status, signup date), with a highlighted queue of clients waiting on manual Meta ad-connection help.

---

## 3. Business model

| Tier | Price | What's included |
|---|---|---|
| **Foundation** ("Founding Foundation") | Free 7-day trial, no card required, then R100/month | Professional business page, Marketplace listing, lead generation page, business profile, monthly digital asset |
| **Growth** | R180/month or R1,199/year | Everything in Foundation, plus campaign landing pages, performance tracking, marketing assets, monthly optimisation, growth reporting, Meta ad tracking (Pixel + Conversions API) |
| **Enterprise** | Coming soon | Advanced campaign management, priority support, custom solutions |

No long-term contracts on any tier — cancellation is genuinely self-serve from the dashboard, not an email-in process.

**Launch positioning:** first 10 signups are marketed as "Founding Businesses" with launch recognition and early-access framing. The real mechanic behind it, confirmed 2026-07-11:
- **Price lock** — a Founding Business keeps their signup-time price permanently, even if pricing changes later. Automatic by construction (a Paystack subscriber simply isn't migrated to a new plan), nothing to build.
- **Founding + annual Growth (R1,199/yr) only:** when Enterprise launches, these specific members get Enterprise-tier access while still paying the Growth price, for 2 years, with the 2-year clock starting from Enterprise's actual launch date (not their original signup date) so every qualifying member gets the same window. After 2 years, keeping Enterprise means paying the price difference.
- Founding-member status and monthly-vs-annual billing aren't tracked in the database yet — see Section 8.

---

## 4. The 10 landing page templates

Every template is a real, data-driven page built from the client's own captured content — not a static mockup — so switching templates never loses any data. Each also has a live-rendered preview (`/preview/[templateId]`) used both in the onboarding picker and on the marketing page's "See It In Action" section.

1. **Single-Action Minimalist** — centred, ultra-clean, one CTA, zero distractions
2. **Left-Heavy Split** — 50/50 layout, text left, large photo showcase right
3. **Content-Dense Feature Grid** — leads with services and packages, for businesses with a lot to offer
4. **Storyteller Vertical** — editorial, long-scroll, founder's-story feel
5. **High-Impact Dark Mode** — dark theme with a glow in the client's own brand colour
6. **Social Proof & Trust First** — testimonials appear immediately below the hero
7. **Interactive Step-by-Step** — simple 3-step "how it works" process up top
8. **Bold & Vibrant Geometric** — asymmetrical overlapping colour blocks, playful
9. **Multi-Product Showcase** — packages/pricing take the spotlight right after the hero
10. **App-Style Checklist** — "what's included" checklist framed like a product screenshot

Plus **Classic Conversion**, the original hand-built layout every client had before templates existed — kept as the default for any client who hasn't picked one, so nothing changed for existing clients when this system launched.

---

## 5. Current homepage — section-by-section content breakdown

The homepage is `/pricing` (the actual root `/` is a redirect to it). Current structure, top to bottom:

1. **Hero** — brand-blue background, soft glow accents. "Only 10 Founding Business spots" urgency badge, headline "Build Your Presence. Grow Your Business.", one-sentence pitch, a 5-item trust-indicator chip grid (Professional Business Page, Marketplace, Lead Generation Page, No Hidden Fees, Built in South Africa), CTA "Become a Founding Business"
2. **Why DigitalFlyer?** — narrative intro paragraph + 4 pain-point cards (can't be found online, marketing feels complicated, agencies too expensive too soon, no way to prove legitimacy), closing "Enable & Connect" statement
3. **Everything Starts Here** — 4 starter-feature cards (Professional Business Page, DigitalFlyer Marketplace, Lead Generation Page, Built To Grow)
4. **See It In Action** — 3 live-rendered template previews (Dark Mode, Vibrant Geometric, Storyteller), note that 10 styles exist total
5. **Pricing** — plain-language intro + the 3 tier cards
6. **Why Businesses Choose DigitalFlyer** — 4 differentiator items (Built For South Africa, Transparent Pricing, Start Small, More Than Software)
7. **FAQ** — 10-question accordion covering what DigitalFlyer is, whether a website is needed already, Marketplace inclusion, what a Founding Business is, cancellation, discoverability, whether ads are required, setup time, hidden costs, urgency to join
8. **What you also get access to** — Marketplace listing request + RE:Biz Nomads community, same component shown post-signup in the dashboard
9. **Final CTA** — bookends the hero with the same brand-blue treatment, repeats "Become a Founding Business"

**Room to improve, worth a fresh look:**
- No dedicated proof/credibility section (real client examples, numbers, a founder story) — the page currently argues by feature list and pain points, not by evidence
- Two full-width brand-blue sections (hero + final CTA) with nothing but text/badges between them and 7 other sections — worth checking whether the page reads as long before reaching pricing
- "Founding Business" urgency (only 10 spots) appears 4 times (hero badge, hero subtext, FAQ answer, final CTA) with no live counter — currently a claim, not a visibly ticking-down mechanic
- The template showcase shows 3 of 10 styles picked for visual contrast, not necessarily the 3 most persuasive to a first-time visitor
- No customer/client testimonials or logos anywhere on the page itself — ironic, since testimonials are a core product feature offered to clients

---

## 6. SEO — built and live as of 2026-07-11

Every page now has real, individual search/social metadata instead of one generic site-wide title:

- **Per-page titles/descriptions** — every client's own landing page shows their real business name and description, not "DigitalFlyer Growth," in the browser tab and in Google search results
- **Open Graph / Twitter card tags** — sharing a client's page link in WhatsApp, Facebook, or LinkedIn now shows their logo and description as a real preview card
- **Structured data (JSON-LD `LocalBusiness`)** on every client page — the schema Google uses for local pack / Maps results, built from the client's own name, address, phone, email, and logo
- **`/sitemap.xml`** — lists the marketing homepage and every active client page, auto-updating as new clients sign up
- **`/robots.txt`** — points crawlers at the sitemap, keeps private pages (dashboard, onboarding, admin) out
- Private pages are explicitly marked `noindex` so they can never show up in search results

Verified live on production, not just locally — see `/robots.txt`, `/sitemap.xml`, and any `/g/[slug]` page's browser tab on `df-growth.vercel.app`.

---

## 7. Technical foundation (brief, for context)

- **Frontend/backend:** Next.js (App Router), deployed on Vercel
- **Database/auth/storage:** Supabase (Postgres, magic-link auth, file storage for logos/photos/generated assets)
- **Payments:** Paystack (subscriptions, self-serve cancel/upgrade, webhook-driven status updates)
- **AI:** Anthropic Claude, used once during onboarding to draft landing page copy from the business profile captured in steps 1-3
- **Ad tracking:** Meta Conversions API (server-side, encrypted token) plus, as of this session, client-side Meta Pixel
- **Images:** Pexels API as an industry-matched stock photo fallback when a client hasn't uploaded their own
- **Automation:** daily cron job for trial-expiry reminders; weekly automated database backup (GitHub Action, confirmed working end-to-end 2026-07-11 — real dump file verified, not just "runs without erroring")
- **Identity groundwork:** a nullable `digitalflyer_member_ref` column exists on `growth_clients`, unused today, reserved for a future cross-product identity reconciliation once other DigitalFlyer products (Core, BizUp) are further along — matches email/phone, not populated yet

---

## 8. Known open items (not yet built, surfaced honestly for next-phase planning)

- **Founding-member tracking** — the real mechanic is now confirmed (Section 3), but nothing in the database yet records which signups are Founding Businesses, the 10-spot cap isn't enforced (an 11th signup wouldn't be blocked or flagged), and monthly-vs-annual Growth billing isn't stored anywhere. Needs two new fields plus a webhook update. The actual Enterprise-upgrade mechanism itself is correctly deferred until Enterprise has a live checkout — nothing to build there yet.
- A dedicated subdomain per business (e.g. `businessname.digitalflyer.co.za`) — raised by Dewald, not yet scoped
- Homepage credibility/proof section, as noted in Section 5
- Enterprise tier has no live checkout yet ("Coming soon")
