# DigitalFlyer Growth
## Sprint 1 Launch Readiness Build Spec

Internal document for Claude Code handoff. Prepared 11 July 2026 by Dewald Rosema.

---

## 1. What This Project Is

DigitalFlyer Growth is a live, self-serve SaaS platform at `https://df-growth.vercel.app`. South African small business owners sign up through a guided onboarding wizard, build a branded landing page, and generate leads through it. The platform is already in production with paying customers.

This spec covers Sprint 1 of a 90-day growth push aimed at moving from realistic to optimistic customer growth targets. Two categories of work are covered here: making the "Founding Business" pricing mechanic real and enforced, and closing infrastructure and churn-reduction gaps before signup volume increases materially.

This document is self-contained. No other file needs to be read to execute this sprint.

---

## 2. Confirmed Tech Stack

- Next.js App Router, TypeScript, deployed on Vercel Pro
- Supabase (Postgres, auth, storage) hosted in the af-south-1 (Cape Town) region
- Paystack for subscriptions, webhooks, and self-serve cancel/upgrade
- Anthropic Claude API, used in the onboarding wizard to draft landing page copy
- Meta Conversions API (server-side, encrypted token) and client-side Meta Pixel, Growth tier only

Do not introduce a new database, hosting provider, or payment processor for anything in this sprint.

---

## 3. Roles and User Types

- **Prospect**: visits `/pricing`, has not signed up
- **Trial or paying business owner**: completed the onboarding wizard, has a dashboard account
- **Admin (Dewald)**: uses `/admin`, gated by email allowlist, read-only client list plus Meta help queue

No new roles are introduced in this sprint.

---

## 4. Build Item 1: Founding-Member Tracking and Cap Enforcement

### 4.1 Data model changes

Add to the existing client/subscriber table (name it consistently with whatever the current signup record is called, likely `growth_clients` per existing schema):

| Field | Type | Notes |
|---|---|---|
| `is_founding_member` | boolean, default false | Set true only if signup completes while founding count is under 10 |
| `founding_signup_number` | integer, nullable | Sequential 1 to 10, set only for founding members, used for the live counter and for audit |
| `billing_cycle` | enum: `monthly`, `annual` | Captured from the Paystack plan selected at signup, not currently stored anywhere |

### 4.2 Webhook logic

On the Paystack subscription webhook that confirms a successful first payment (or trial start, whichever currently triggers account activation):

1. Count existing rows where `is_founding_member = true`.
2. If count is less than 10, set `is_founding_member = true` and `founding_signup_number = count + 1` on this new record.
3. If count is 10 or more, leave `is_founding_member = false` and `founding_signup_number = null`. This client is charged standard pricing, no special handling needed beyond this.
4. Set `billing_cycle` based on the Paystack plan code used (monthly Growth, annual Growth, or Foundation, which is monthly only today).

This logic must be idempotent. If Paystack redelivers the same webhook event (which it can legitimately do), the same client record must not be counted twice or reprocessed. Use the Paystack event ID as an idempotency key, either by storing processed event IDs or by making the founding-count check itself safe against duplicate execution (for example, checking `is_founding_member` is still unset before writing).

### 4.3 Cap enforcement at signup

Before a prospect reaches the payment step of the onboarding wizard, check the current founding count.

- If under 10: the wizard shows Founding pricing and messaging as it does today.
- If 10 or more: the wizard automatically shows standard Foundation and Growth pricing instead. No error, no blocked signup, no special messaging needed beyond simply not showing founding-specific copy. This must happen automatically and correctly the moment the tenth spot is taken, with no manual intervention from Dewald required.

### 4.4 Live counter on pricing page

Add a simple, accurate counter to the `/pricing` page: "X of 10 Founding spots remaining," where X is calculated from the live `is_founding_member` count, not hardcoded or manually updated. Cache this with a short revalidation window (60 seconds is consistent with the existing pattern used for client pages) rather than querying on every page load.

### 4.5 Acceptance criteria

- A test signup completed while founding count is under 10 correctly sets `is_founding_member` and `founding_signup_number`.
- A test signup completed after 10 founding members exist shows standard pricing automatically and does not set the founding fields.
- The pricing page counter matches the actual database count at all times.
- Duplicate Paystack webhook delivery for the same event does not double-count a founding slot or corrupt `founding_signup_number` sequencing.

---

## 5. Build Item 2: Staging QA for the Founding-to-Standard Transition

Before any real acquisition push toward the tenth founding spot, this transition must be tested end to end in a staging environment, not verified for the first time in production.

**Test plan:**

1. In staging, seed the database with 9 existing founding members.
2. Complete a real signup flow (10th signup). Confirm it correctly becomes founding member number 10, and the counter shows "0 of 10 remaining."
3. Complete another signup flow (11th signup) immediately after. Confirm this account:
   - Is shown standard Foundation or Growth pricing during the wizard, not founding pricing
   - Is billed at the standard rate via Paystack
   - Has `is_founding_member = false` and `founding_signup_number = null` in the database
4. Confirm the pricing page counter does not go negative or display incorrectly once the cap is reached.

Do not proceed with any coordinated push toward the founding cap in production until this test plan passes cleanly in staging.

---

## 6. Build Item 3: Homepage Credibility Section

Build the structure for a homepage credibility section, positioned between the current "See It In Action" and "Pricing" sections (or wherever fits best without disrupting the existing page flow). This ships in Sprint 1 even before content fully exists, since it needs to be ready to populate as testimonials come in through Sprint 1 and 2.

**Structure:**

- A short founder story block (static content, Dewald will supply the copy)
- A client examples grid pulling from the existing testimonials feature already live in the dashboard. Query testimonials marked as suitable for homepage display (add a boolean field `featured_on_homepage` to the existing testimonials table if one does not already exist, defaulting to false, manually flipped to true by Dewald via a simple admin toggle or direct database update as testimonials come in)
- Display up to 6 featured testimonials in a responsive grid, using the same star rating and quote format already used in the dashboard testimonial feature, so no new visual design system is needed here

This section should render gracefully with zero featured testimonials (show only the founder story block) so it can ship immediately rather than waiting for content.

---

## 7. Build Item 4: Day 0 Automated Welcome Sequence

Trigger immediately when a trial account is created (the same moment the onboarding wizard completes and the dashboard becomes accessible).

**Send:**
- An email confirming the page is live, with a direct link to the dashboard
- If a phone number was captured and WhatsApp contact is feasible with current infrastructure, a WhatsApp message with the same core message
- A link to or embed of the "5 to 10 Minute Rule" client education asset (content supplied separately by Dewald; if the asset is not ready when this ships, build the sequence with a placeholder slot so it can be dropped in without a redeploy of the whole sequence)

Use whatever email sending mechanism is already in place for other transactional emails (trial-expiry reminders are mentioned as already running via cron, check for an existing email service integration before adding a new one).

---

## 8. Build Item 5: Day 3 to 4 Incomplete-Onboarding Nudge

A scheduled check (daily cron job, consistent with the existing trial-expiry reminder pattern) that finds any trial account:

- Created 3 to 4 days ago
- That has not yet published a live page (or has published with a clearly incomplete profile, for example missing business description or no photos)

Send one nudge (email, and WhatsApp if number is on file) encouraging completion, with a direct link back to the relevant onboarding step. Do not send this more than once per account.

---

## 9. Build Item 6: Dashboard Completeness Nudge

Within the existing dashboard, add a lightweight visual indicator (a banner or checklist widget, not a blocking modal) when a client's business profile is thin: missing business description, missing address, or fewer than 2 photos uploaded. This supports the SEO acceleration goal, since JSON-LD LocalBusiness schema quality depends on this data being present.

This is a nudge, not an enforcement mechanism. It should not block any other dashboard functionality.

---

## 10. Build Item 7: Supabase Connection Pooling Audit

Audit every serverless code path (onboarding wizard, dashboard, all API routes, all webhook handlers) for the following, and fix any that fail:

1. Confirm the Supavisor pooler connection string in transaction mode is used for all application queries, not the direct database connection (the direct connection is for migrations and admin tasks only).
2. Confirm each serverless function reuses a single Supabase client instance rather than creating a new client on every invocation.
3. Confirm session persistence is disabled on server-side Supabase clients, since serverless functions do not maintain state between invocations.
4. Confirm the Supabase project's connection pool size and Max Database Connections settings are sized reasonably for expected concurrent load, not left at an unconsidered default.
5. Confirm indexes exist on any column used in a Row Level Security policy filter or join, since RLS is re-evaluated on every query and missing indexes here are a common cause of slowdowns under load that do not show up in low-traffic testing.

This is an audit-and-fix task, not a rebuild. Document any changes made.

---

## 11. Build Item 8: Paystack Webhook Idempotency Check

Audit all Paystack webhook handlers (subscription activation, cancellation, the new founding-member logic in Build Item 1, any others currently in place) for idempotency:

1. Confirm duplicate delivery of the same webhook event does not result in double billing records, double provisioning, or, specifically, double-counting a founding member slot.
2. Use the Paystack event ID as the basis for deduplication, either by storing processed event IDs or by ensuring each handler's logic is naturally safe to run twice on the same event.
3. Confirm webhook processing failures are logged in a way that is actually visible (not silently swallowed), so a missed webhook is discoverable within hours, not discovered days later as a billing discrepancy.

---

## 11a. Build Item 9: Legal and Compliance Publishing (Highest Priority This Sprint)

This is now the top priority in Sprint 1 and should be completed before any other item in this spec if there is a conflict for time.

**Content is final and provided separately by Dewald.** Do not write or edit the Privacy Policy or Terms & Conditions content. Treat both as fixed text to publish, not draft.

1. Add the Privacy Policy and Terms & Conditions as pages on the site (for example `/privacy` and `/terms`), rendered from the provided content.
2. Link both from the footer on every page of the site, including the marketing homepage, the onboarding wizard, the dashboard, and every public client page.
3. Link both specifically from the registration and signup flow, adjacent to the consent checkbox described below.
4. Add an active, unticked consent checkbox at the point of registration (before payment or account activation completes). The checkbox must not be pre-checked. Use this exact copy, with "Privacy Policy" and "Terms & Conditions" as clickable links to the respective pages:

   *"I agree to the Privacy Policy and Terms & Conditions. I understand that DigitalFlyer will process my personal and business information to provide the service, and that I remain the owner of any leads generated through my page. I also agree to receive occasional updates and news from DigitalFlyer via email or WhatsApp (I can unsubscribe at any time)."*

5. Signup cannot complete unless this checkbox is checked. Store the fact that consent was given, with a timestamp, on the client record, since this is the evidence of active consent if it is ever needed.

**Acceptance criteria.** A prospect cannot complete signup without checking the box. Both linked documents render correctly and are reachable from the footer on every page type. Consent timestamp is recorded on the client record.

---

## 11b. Build Item 10: Gallery Section Correction

The current gallery implementation is a dashboard upload feature whose photos are used as background or supporting imagery within existing templates (for example, Left-Heavy Split). This is not what was intended.

**Correction:** the gallery needs to be its own dedicated, clearly labelled section on the public client page (`/g/[business-slug]`), independent of which of the 10 templates or Classic Conversion the client has chosen. This section:

1. Displays a grid of thumbnail images from the client's uploaded photos (up to 10, per the existing upload limit).
2. Renders only if the client has uploaded 2 or more photos. If fewer than 2, the section does not render at all (do not show a section with 0 or 1 image).
3. Allows a visitor to click any thumbnail to view it enlarged (a simple lightbox or modal view is sufficient, no need for a complex carousel library).
4. Should work consistently across all 10 templates and Classic Conversion, as a shared component, not a template-specific feature.

This section is separate from and in addition to any existing use of the "primary" photo elsewhere on the page (hero image, template-specific imagery). The primary photo can continue to be used as it currently is; this gallery section is a new, additional section.

---

## 11c. Build Item 11: Move Photo Upload Into Onboarding

Photo gallery upload currently happens in the dashboard after signup is complete. This means a client's page can go live with zero real photos and fall back entirely to stock imagery, requiring a second visit to add real photos later.

**Correction:** add photo upload (the same multi-file, up to 10 photo upload already built for the dashboard) as a step in the onboarding wizard itself, so photos are captured before the page first goes live. The most natural placement is alongside or immediately after the existing "Brand kit" step (logo upload), since both are visual asset collection steps.

This step should remain skippable, consistent with the wizard's existing resumable, low-friction design. A client who skips it still gets the stock photo fallback as they do today, but is now given the opportunity to add real photos before launch rather than only being prompted to do so after the fact.

The existing dashboard photo upload feature should remain in place unchanged, so photos can still be added or changed at any time after launch.

---

## 11d. Build Item 12: Full Onboarding Wizard Flow and Layout Audit

Dewald has flagged general confusion in the onboarding flow and layout and alignment issues that do not make logical sense in places, without yet providing specific screenshots or step references.

**Immediate action:** conduct a systematic pass through all 7 onboarding wizard steps (and the "Edit your page" screen, which reuses the same fields) checking for:

- Consistent spacing, margins, and alignment across every step, since inconsistency here is the most likely source of what has been flagged as "layout issues that make no logical sense."
- A logical, consistent order of fields within each step.
- Consistent button placement, labelling, and behaviour (Next, Back, Skip) across all steps.
- Consistent progress indicator behaviour (the resumable, one-question-per-screen pattern should clearly show the client where they are in the flow at every step).
- Mobile responsiveness at common breakpoints for every step, not just desktop.

Document any issues found and fixed as part of this pass.

**Follow-up needed from Dewald.** This general audit is a reasonable first pass, but the most efficient path to a correct fix is Dewald sending specific screenshots, a screen recording, or exact step names for the issues he has personally noticed, so those specific problems can be confirmed fixed rather than relying on a general sweep alone.

---

## 12. Build Order for This Sprint

1. Build Item 9 (legal and compliance publishing), highest priority, since it is the gate for any larger acquisition push
2. Build Item 1 (Founding-member tracking and cap enforcement), since the live counter and cap logic are the next-highest-priority credibility fix
3. Build Item 8 (webhook idempotency), since it directly protects the correctness of Build Item 1
4. Build Item 2 (staging QA), executed once Items 1 and 8 are complete
5. Build Item 11 (move photo upload into onboarding) and Build Item 10 (gallery section correction), naturally sequenced together since both touch the same photo-handling code paths
6. Build Item 7 (Supabase pooling audit), independent of the above, can run in parallel
7. Build Items 4, 5, 6 (Day 0 sequence, Day 3-4 nudge, dashboard completeness nudge), can run in parallel with each other
8. Build Item 3 (homepage credibility section), ships with zero testimonials initially, populated progressively as content arrives from Dewald
9. Build Item 12 (onboarding flow and layout audit), ongoing throughout the sprint, refined further once Dewald provides specific screenshots or step references

---

## 13a. Explicitly Not This Sprint: WhatsApp Onboarding Redirect

The existing DigitalFlyer WhatsApp onboarding system (which currently signs people up for Core and RE:Biz Nomads via a WhatsApp conversation) has been decided this session to be redirected toward signing people up for Growth directly instead. This is explicitly out of scope for Sprint 1 and will be scoped as its own build spec in Sprint 2 or 3, once Sprint 1 ships. Do not begin this work as part of the current sprint.

**Confirmed direction for that future spec, recorded here so it is not re-litigated later.** This gets built into Growth's existing repo, Vercel project, and Supabase project, not deployed as a separate project. It is a second entry channel into Growth, not a separate product, so it should reuse Growth's existing `growth_clients` schema, environment variables, and Paystack plan codes rather than standing up parallel infrastructure. Treat the current standalone WhatsApp onboarding codebase as a reference for its Meta Cloud API webhook handling, async processing pattern, and conversational flow logic, all of which are reusable, but redirect every data write and payment trigger to Growth's existing setup. The original "fork question" between DigitalFlyer and RE:Biz Nomads is no longer needed, since RE:Biz Nomads access is now bundled into Growth membership directly rather than sold separately (see below), so the WhatsApp flow can go straight from business details to Growth signup.

**Confirmed this session: RE:Biz Nomads private group access is bundled into all DigitalFlyer membership tiers, not sold as its own paid tier.** No build work is needed on this for Sprint 1, it is noted here so it is not missed when the WhatsApp redirect spec is written, and so Claude Code does not build or preserve any separate RE:Biz Nomads paywall logic in that future work.

---

## 13. Out of Scope, Do Not Build

- Enterprise tier checkout (still "coming soon," no live checkout exists, not part of this sprint)
- Dedicated subdomain per business (raised but not yet scoped, do not start)
- Any change to the Meta Pixel or Conversions API integration itself (no changes needed this sprint, if a future sprint does touch this, check the current Meta developer changelog first before making changes)
- Any change to the Privacy Policy or Terms content (legal review is happening separately with a South African attorney, this is not a code task)
- Any managed-agency features (Partner Access, MCC links, agency-run ad campaigns) described in older planning documents. DigitalFlyer Growth is confirmed as a self-serve SaaS product, not a managed agency service. Do not build toward the older agency model under any circumstances.
- Database merges or shared foreign keys across DigitalFlyer products. The federated architecture (each product on its own Supabase project, matched by email and phone) is a confirmed Phase 1 decision and is not being changed in this sprint.

---

*This spec covers Sprint 1 build items only. Sprint 2 and 3 items (further SEO acceleration, homepage flow improvements, RE:Biz Nomads push, Enterprise scoping) will be handed to Claude Code separately once Sprint 1 is complete and reviewed.*
