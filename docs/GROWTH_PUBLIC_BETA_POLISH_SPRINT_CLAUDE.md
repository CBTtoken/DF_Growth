# DigitalFlyer Growth
## Public Beta Polish Sprint (July 2026)

Internal document for Claude Code handoff. Prepared 14 July 2026 by Dewald Rosema. This is the full, consolidated technical spec, replacing the earlier Go-Live Sprint document. It merges: the confirmed corrections from the 14 July addendum, the full "Public Beta Polish Sprint" prompt (both phases), and two new decisions made this session (WhatsApp trial parity, the Day One rename). Cross-checked against PLATFORM_OVERVIEW.md (12 July 2026) for what's actually already live.

**Note on document lineage.** PLATFORM_OVERVIEW.md is the last confirmed snapshot of what's actually built. Everything in this spec is new or corrected work on top of that snapshot. Where an item below turns out to already be built differently than described, stop and report back before proceeding, don't silently redo working functionality.

---

## Priority Order

1. **Section 1 (authentication shift, full scope).** Public-launch blocker.
2. **Section 2 (WhatsApp Foundation trial parity).** Fixes a real gap between the product and the marketing copy that's about to go out.
3. **Section 4 (Foundation trial page / Marketplace gating).** Live customer-facing correctness issue.
4. **Section 11 (Marketplace link split).** Architectural fix, the current single-field approach is papering over a real gap.
5. **Section 9 (image generation bug fix).** A live feature is silently broken.
6. **Section 13 (security hardening).** Launch-blocking hardening.
7. Everything else in the order listed, all worth doing before or shortly after public launch, none individually blocking.

---

## 1. Authentication Shift, Full Scope (Public Launch Blocker)

**Confirmed magic-link auth is still live as of 12 July 2026.** If Claude Code finds `/set-password` and `/login` already built when starting this section, stop and report back before proceeding.

**Build.**
- `/set-password` page, shown immediately after Paystack payment confirmation (Growth) or trial activation (Foundation, both web and WhatsApp), replacing the current magic-link invite flow. User must set a secure password before account activation completes.
- `/login` page, traditional email and password, replacing the current magic sign-in link as the returning-user path.
- `/forgot-password` page, user enters email, receives a reset link via Supabase Auth's built-in reset flow.
- `/reset-password` page, landed on via the emailed reset link, sets a new password, redirects to `/login`.
- "Forgot your password?" link on `/login`.
- Retire the magic-link sign-in email entirely.

**Migration for existing accounts.** Every account created before this ships has no password set. On next login attempt, route through a forced `/set-password` step rather than `/forgot-password`, since they don't know they never set one. Applies to every current client, web and WhatsApp alike.

**Acceptance criteria.**
- New signups (web or WhatsApp, any tier) are prompted to set a password at the right point in their flow and can subsequently log in at `/login`.
- Existing pre-migration accounts are forced through `/set-password` on next login.
- Reset requests rate-limited, 5 per 10 minutes per email.
- Reset links expire and are single-use.
- Reset email follows house style and the new footer (Section 12).
- Successful password set or reset invalidates existing session tokens for that account.
- Failed or expired reset links show a friendly, actionable error, never a raw Supabase error.
- No remaining code path issues a magic sign-in link once this ships.

---

## 2. WhatsApp Foundation Trial Parity

**Confirmed decision.** WhatsApp should never have been a Growth-only channel. It's an easier way to onboard into any tier, including the free Foundation trial, not a separate, paid-only product. Right now every WhatsApp signup goes straight to paid Growth, this needs to change before any marketing copy promising a free WhatsApp trial goes out.

**Build.** Add a tier-selection step to the WhatsApp conversation, placed right after business name and email capture, before the current billing-cycle question (which currently assumes Growth by default).

**Suggested copy, adjust freely:**

> Which sounds right for you?
> 1️⃝ Foundation, free for 7 days, then R100/month. A professional page, leads, and our full ecosystem.
> 2️⃝ Growth, R180/month or R1,199/year. Everything in Foundation, plus ad tracking and campaign pages.
> Reply 1 or 2.

**Branching logic.**
- If Foundation is selected: skip the billing-cycle question entirely (Foundation has no monthly/annual choice), skip the payment-link step entirely (no card required for the trial), proceed straight into profile capture. Account activates immediately on completing onboarding, trial clock starts the same as a web Foundation signup.
- If Growth is selected: continue exactly as today, billing-cycle question, then the Paystack payment link as the final step.

**Acceptance criteria.**
- A WhatsApp Foundation signup completes with zero payment step and a live 7-day trial, matching the web experience exactly.
- A WhatsApp Growth signup behaves exactly as it does today, unchanged.
- Trial-expiry reminder and trial-ended emails fire for WhatsApp-originated Foundation trials the same as web ones, confirm this already works channel-agnostically off the `growth_clients` table rather than assuming web-only, it should, but verify.

---

## 3. Rebrand: Founding Business to Day One Business

**Confirmed decision.** Replace "Founding Business" and "Founding Member" with **"Day One Business"** and **"Day One Member"** everywhere user-facing. This is a direct swap-in, not a restructure, most existing sentences barely need rewriting: "Only 10 Day One Business spots remaining" instead of "Only 10 Founding Business spots remaining."

**Confirmed technical decision.** The underlying database fields (`is_founding_member`, `founding_signup_number`) stay as they are. This is a copy-layer rename only, renaming the schema itself carries real migration risk for zero user-facing benefit.

**Scope.** Every user-facing instance across: the pricing page badge and banner, the live spots-remaining counter, the dashboard status label, the admin panel status column, FAQ copy, all WhatsApp broadcast and onboarding copy, and the launch marketing content in the companion content package. Search the whole codebase for "Founding" in user-facing strings and replace consistently, nothing should visibly reference the old term once this ships.

**Acceptance criteria.** No user-facing surface anywhere in the product or its emails still says "Founding Business" or "Founding Member." Database fields and internal variable names are unchanged.

---

## 4. Foundation Trial: Full Live Page, Marketplace Listing Gated to Paid Only

**Confirmed behaviour.** A Foundation trial signup gets a full live landing page (`/g/[slug]`) immediately, identical to Growth. What's not included during the 7-day trial is the DigitalFlyer Marketplace listing specifically, that activates only once the client is a continuing paid member past the trial.

**Acceptance criteria.**
- Foundation trial signups get a fully live, publicly accessible page at the end of onboarding.
- Day-0 "your page is live" email fires normally for trial signups.
- The "Also available to you" Marketplace section shows a locked/upcoming state for trial users, for example "Included once you continue past your trial."
- Trial-to-paid conversion, Foundation or Growth, triggers Marketplace listing activation at that moment.
- If a trial expires without payment, the never-activated listing stays inactive, no cleanup needed.
- Admin panel reflects Marketplace-listing status distinctly from page-live status.
- A trial user who upgrades mid-trial gets Marketplace activation immediately on payment, not held until the original trial-end date.

---

## 5. Get in Touch Blocks, Universal Deployment

**Build.**
- A "Get in Touch" lead capture component with a dedicated message textarea (not just the existing name/email/phone lead form), deployed on the main marketing homepage.
- The same block, same layout, on every generated member/client landing page, alongside the existing lead form, not replacing it, unless it makes more sense to merge them into one richer form, confirm which before building.
- Submissions route to the business owner's lead dashboard (for member-page submissions) and separately log a copy to the admin panel for any homepage submission, since a homepage enquiry is about DigitalFlyer itself, not routed to any specific client. This is the same admin Support tab pattern already planned in the earlier Launch Hardening spec, if that shipped, extend it rather than building a second one.

**Acceptance criteria.** A homepage submission appears in the admin panel. A member-page submission with a message reaches the business owner's leads list with the message included.

---

## 6. Industry Dropdown, Fixed Taxonomy

**Build.** Replace the current open-text or incomplete industry input during onboarding (web and WhatsApp) with a categorized dropdown. If "Other / Not Listed" is selected, show an inline plain-text input for the specific niche.

**Mandatory category matrix:**

- **Beauty & Wellness**: Hair Styling & Barbering; Nails & Makeup; Skincare & Esthetics; Massage & Bodywork; Fitness & Personal Training; General Beauty & Wellness
- **Clothing & Fashion**: Apparel & Streetwear; Jewelry & Accessories; Shoes & Footwear; Tailoring & Alterations; Vintage & Thrift Reselling; General Clothing & Fashion
- **Food & Beverage**: Baked Goods & Desserts; Catering & Private Chef; Meal Prep & Specialty Diets; Food Trucks & Pop-up Stalls; Homemade Sauces & Packaged Goods; General Food & Beverage
- **Skilled Trades & Repairs**: Plumbing; Electrical; Carpentry & Woodworking; Painting & Drywall; General Construction & Small Renovation; Appliance & HVAC Repair; General Trades & Repairs
- **Home, Garden & Care**: Residential Cleaning; Gardening & Landscaping; Interior Decor & Home Organizing; Moving, Hauling & Delivery; House Sitting & Property Maintenance; Babysitting & Childcare; Dog Walking & Pet Care; General Home & Care Services
- **Arts, Crafts & Makers**: Handmade Jewelry & Crafts; Painting, Illustration & Prints; Pottery & Ceramics; Woodworking & Custom Furniture; Candles, Soaps & Wellness Products; General Arts & Crafts
- **Professional & Digital Services**: Graphic Design & Branding; Social Media, Marketing & Copywriting; Photography & Videography; Bookkeeping & Admin Support; Business Consulting & Coaching; General Digital Services
- **Education & Lessons**: Academic Tutoring; Music & Arts Lessons; Language Teaching; Sports & Hobby Coaching; General Education
- **Automotive & Transport**: Car Washing & Detailing; Ridesharing & Private Driving; Local Delivery & Courier Services; Mechanical Repairs; General Automotive
- **Events & Entertainment**: DJing & Live Music; Party Planning & Decorating; Event Photography & Video; Equipment Rental; General Events
- **Other / Not Listed**: triggers the inline text input

**For WhatsApp**, adapt this into a numbered menu at the top-category level, with sub-category as a follow-up numbered message, consistent with the existing WhatsApp pattern of numbered lists (brand colour picker already works this way).

**Acceptance criteria.** Every new signup selects from this exact taxonomy. Selecting "Other" reveals a free-text field and that value is stored and displayed correctly on the client's page.

---

## 7. Remove Business Description Character Cap

**Build.** Remove any character, word, or string-length limit on "What does your business do?" in onboarding. Allow full-length descriptions.

**Acceptance criteria.** A very long description (test with 2,000+ characters) saves and displays correctly without truncation anywhere it's used, onboarding, dashboard edit, public page, and AI copy drafting input.

---

## 8. Expandable Stock Image Gallery

**Build.** Add a "Show More" / "Load More" button at the bottom of the initial Pexels image grid in the gallery/photo selection screen. Clicking loads the next page of relevant images without a full page refresh.

**Acceptance criteria.** Clicking "Show More" appends new industry-matched results below the existing grid, no page reload, no loss of already-viewed images.

---

## 9. Image Generation Pipeline Bug Fix

**Confirmed real bug in a shipped feature.** "Create your image ready for Facebook and Instagram posts" currently fails, images don't render properly, URLs come back invalid, and failures happen silently with no error shown to the user.

**Build.** Debug and fix the generation pipeline end to end. Images must render correctly, return valid, accessible URLs, and display properly in the dashboard. Any failure that does occur must surface a clear, friendly error to the user, not fail silently.

**Acceptance criteria.** Generating a social asset for each of the available content types (testimonial, special offer, before/after, announcement, and the others already built) produces a valid, viewable, downloadable image every time in normal testing. A deliberately induced failure (for example, an invalid source image) shows a clear error, not a silent blank state.

---

## 10. Move Ad-Platform Verification Widget

**Build.** Relocate "Search & ad platform verification" one section higher in the dashboard's main control panel, so it's more prominent and more likely to be used post-onboarding.

---

## 11. Marketplace Link Split, Admin-Managed

**Confirmed correction, resolves a real architectural gap.** Currently the "website URL" field collected at onboarding does double duty, shown as the client's own site and reused as their Marketplace listing link. Split these properly.

**Build.**
1. "Website URL," collected at onboarding, remains exactly what it says, the client's own external site, shown in their public contact details.
2. Add a new, separate, admin-only field, "Marketplace URL," not exposed to the client during onboarding or in their dashboard.
3. Add a text input in the admin panel so Dewald can manually set or update this per client once their Marketplace listing exists.
4. Only display a Marketplace link on the client's public page if this admin-set field has an explicit value. Never auto-generate or append a `digitalflyer.co.za` subdomain guess.
5. The client's own website URL is what displays after a lead form or package submission is completed, alongside the rest of their public contact details, this is the client-facing one, the admin Marketplace field is not shown to the client anywhere.

**Acceptance criteria.** A client's own website URL and the admin-set Marketplace URL are stored and displayed independently, no auto-generated subdomain link appears anywhere unless the admin has explicitly set one.

---

## 12. Transactional Email Footer

**Build.** Add this exact footer to every automated and transactional email:

> Kind Regards
> Your DigitalFlyer SA Team
> Visibility and Accessibility
> WhatsApp: +27(0)72 311 0570
> Our Marketplace: www.digitalflyer.co.za
>
> This email is confidential and may also be privileged. The recipient is responsible for virus checking this email and any attachments. If you are not the intended recipient please immediately notify us and delete this email, you must not use, disclose, distribute, copy, print or rely on this email. DigitalFlyer SA does not accept any liability for any loss or damage from your receipt or use of this email.

Apply to every email already in production (invite/set-password, trial reminders, trial-ended, onboarding nudge, new lead notification) and every new one added in this sprint (password reset).

---

## 13. Security Hardening, Extended

### 13.1 RLS Coverage, All Tables
Audit RLS on every table, not only `capi_events` and `growth_client_secrets`, confirm both of those specifically have zero public read/write access, and extend the same audit to `growth_clients`, `growth_members`, `testimonials`, `landing_pages`, `generated_assets`, `whatsapp_conversations`, and any others added this sprint.

### 13.2 Reserved Subdomains
Block registration of: `growth`, `stoep`, `beta`, `app`, `www`, `admin`, `api`.

### 13.3 Stress Testing, Concrete Target
Stress test SSR client pages under concurrent load, target under 500ms response time on Cape Town edge nodes. Simulate simultaneous registrations, spike volume from both business owners and visitors, and high overall request volume.

### 13.4 WhatsApp State Persistence
Verify the WhatsApp bot's multi-step state auto-saves and resumes correctly after poor signal or a dropped connection mid-conversation, not just after a simple idle gap.

### 13.5 Rate Limits on New Components
Confirm every new component built this sprint (Get in Touch blocks, industry dropdown, image regeneration) respects existing rate limit patterns, nothing new introduces an unthrottled endpoint.

### 13.6 Anonymous Beta Metrics
Add lightweight anonymous event tracking for key beta metrics: onboarding completion, first lead received, trial conversion. Anonymous means no personal data attached to the event itself, just counts and timing, this feeds Section F of the companion content package's success metrics.

### 13.7 Never Trust the Client for Authorization
Every sensitive check (can this user see or edit this record, is this admin-only) enforced server-side, not just hidden in the UI. Admin routes check the email allowlist server-side on every request, not just at page load.

### 13.8 Source Maps and Build Output
Confirm production builds don't expose source maps publicly. Confirm client-side bundles are minified in production.

### 13.9 Security Headers
Add CSP, X-Frame-Options, X-Content-Type-Options: nosniff, and HSTS. Test each against Meta Pixel, Paystack checkout, and Pexels image loading after adding CSP specifically.

### 13.10 Error Handling
No raw stack traces or database errors reach the browser in production. Detailed errors still log server-side.

### 13.11 robots.txt and Admin Discoverability
Don't list `/admin` or other sensitive paths in `robots.txt`. Confirm `/admin` and its API routes return proper 401/403s, not a leaking redirect.

### 13.12 Dependency Scanning
Add `npm audit` or equivalent to CI, flagged before deploy. Establish an owner for reviewing flagged vulnerabilities.

### 13.13 POPIA Compliance, Its Own Workstream
Real gap, not a nice-to-have, personal information is flowing through the platform now. Needs: Privacy Policy reflecting actual current practice (what's collected, retention, who it's shared with, deletion/access process), confirmation the Pixel consent banner satisfies POPIA specifically, a defined retention policy for leads, a data subject deletion/export process, and confirmation the weekly backup process can honour a deletion request on a defined schedule. This needs a legal review pass, not just engineering, run in parallel, don't let it slip indefinitely.

---

## 14. Day One Business: Permanent Enterprise, Not a 2-Year Window

**Corrected behaviour.** The earlier documented "2 years of Enterprise access once it launches" is wrong. Day One Members are upgraded to Enterprise permanently, for as long as they keep paying the fixed R1,199/year annual price, no expiry on the access itself.

**Acceptance criteria.**
- Day One status stored distinctly (existing `is_founding_member` field), Enterprise access never time-boxed in billing logic.
- Enterprise access persists indefinitely while the account stays active on the R1,199/year plan.
- Lapsed payment suspends Enterprise access along with the rest of the account, same as normal churn.
- Switching from annual to monthly billing forfeits Day One status and its Enterprise access, one-way and high-stakes, requires a clear warning and confirmation step before the switch completes, for example: "Switching to monthly will end your Day One Business benefits, this can't be undone."
- Admin panel shows Day One status distinctly from regular Enterprise once Enterprise ships.

---

## 15. Uptime Monitoring

Never set up per PLATFORM_OVERVIEW.md's own Known Limitations. Set up Better Stack or UptimeRobot against the main site and a representative client page, with alerting to Dewald.

---

## 16. Reconciliation Instruction

PLATFORM_OVERVIEW.md confirms most earlier work genuinely shipped: call/WhatsApp number split, gallery and hero fix, Pexels fallback, package types, payment-at-end for Growth, admin panel with CSV export, RE:Biz Nomads free access, BizUp in tier features, logout, branded emails, rate limiting, Pixel consent, webhook idempotency, and the WhatsApp redirect into Growth. Treat those as done.

**Confirm before or during this sprint:**
- Whether the onboarding wizard has a live preview before its final step, not just preview-on-template-switch from the dashboard.
- Whether Section 1's auth situation has changed since 12 July, stop and report back if `/set-password` and `/login` already exist.
- Current real table names and schema against everything referenced above.

Report discrepancies back rather than silently reconciling and losing them.

---

## 17. Confirmed Out of Scope This Sprint

Post-Launch Backlog (blog, nav update, development service line, events calendar, auto-push to Facebook, member shop, BoGo delivery, Paystack for member sales), the marketplace design agent instructions, Paystack subaccounts for in-platform client payment collection, full 10-template visual redesign, automatic Marketplace listing provisioning logic (this stays admin-managed per Section 11), any change to Core's own codebase, Enterprise tier checkout.

---

*Once this ships and is tested, particularly the authentication shift, WhatsApp trial parity, and the security hardening, bring results back before deciding what's next.*
