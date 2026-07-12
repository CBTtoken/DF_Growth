# DigitalFlyer Growth
## Combined Build Spec: Sprint 1 Fixes, then Sprint 2 and 3

Internal document for Claude Code handoff. Prepared 12 July 2026 by Dewald Rosema. This single document replaces the two previously separate specs (Sprint 1 Fixes, and Sprint 2/3) so Claude Code has one continuous, self-contained work list rather than switching between files. Work through Part 1 in full before starting Part 2, the priority order below explains why.

---

## What This Project Is

DigitalFlyer Growth is a live, self-serve SaaS platform at `https://df-growth.vercel.app`. Small business owners sign up, build a branded landing page, and generate leads through it. Sprint 1 (Founding-member mechanic, legal document publishing with active consent, gallery and onboarding corrections, core infrastructure audit) is confirmed complete. Part 1 below fixes issues found in hands-on testing after that shipped. Part 2 covers the next two sprints of new work. No other file needs to be read to execute this spec, though the existing standalone WhatsApp onboarding codebase (built separately for DigitalFlyer Core) should be referenced directly for Part 2's WhatsApp item, as instructed there.

**Confirmed tech stack, unchanged throughout:** Next.js App Router, TypeScript, Vercel Pro, Supabase (af-south-1), Paystack, Anthropic Claude API, Meta Conversions API and Pixel, GitHub. No new hosting, database, or payment provider is introduced anywhere in this spec.

---

## Priority Order, Read This First

1. **Part 1, Section 1 (account data exposure bug).** This is a data privacy issue. Build and verify this before anything else in this entire document.
2. **Part 1, Section 2 (misleading payment badge).** Small fix, high trust impact, do this next.
3. The rest of Part 1, in the order listed.
4. Part 2, in the build order given at the end of that section.

---

# PART 1: SPRINT 1 FIXES

Issues found in hands-on testing after Sprint 1 shipped. All questions raised during review are now resolved and reflected in the sections below, everything here is ready to build as written.

---

## 1. Critical: Account Data Cross-Contamination Bug

**Reported issue.** An invite link sent to `dewald@digitalflyer.co.za` (via the standard Supabase invite email) instead displayed the dashboard and profile data belonging to a different account, `info@digitalflyer.co.za`. One authenticated session showed another client's data, a serious privacy problem given real client and lead data flows through this platform.

**Investigation priorities, in order:**
1. Check whether the browser or device used to click the invite link already had an active Supabase auth session for a different user, and whether the invite verification flow (`/auth/v1/verify?...type=invite&redirect_to=.../onboard`) correctly creates a new session for the invited email rather than falling through to an existing cached session. Most likely root cause.
2. Check the `/onboard` redirect handler and dashboard data-fetching logic for any place a client ID or email is read from a stale client-side store, local state, or cookie rather than freshly from the current authenticated session on every load.
3. Check whether any Supabase Row Level Security policy on `growth_clients` or related tables is missing or misconfigured in a way that could return another row instead of the current user's own row.
4. Once the cause is identified, write a regression test: log out fully, click a fresh invite link for account A, confirm account A's data loads. Then, without logging out, click a fresh invite link for account B in the same browser, confirm account B's data loads, not account A's.

**Acceptance criteria.** A user cannot see another account's dashboard, profile, or lead data under any sequence of invite links or logins in the same browser session.

---

## 2. "Secure Payment via Paystack" Badge, Confirmed Placement

**Finding.** This badge currently appears under the Packages section on live client pages, but Package buttons only scroll to the contact form, there is no actual Paystack checkout connected to Packages on a client's page. The badge references a capability that does not exist there.

**Confirmed fix.**
1. Remove this badge from the Packages section on every client page entirely. See Section 3 below for the underlying decision.
2. Add it instead to the main DigitalFlyer site's own footer (`df-growth.vercel.app`), since real subscription billing for Foundation and Growth genuinely does run through Paystack. The badge is accurate there and belongs there, not on client pages.

**Acceptance criteria.** No "Secure payment via Paystack" text or icon appears near Packages on any client page. The badge does appear in the main site's footer.

---

## 3. Confirmed Decision: No In-Platform Client Payment Collection, For Now

Client-side payment collection (a member accepting payment from their own customers through their DigitalFlyer page, via Paystack subaccounts on DigitalFlyer's account) was never built, and there is no logic anywhere in the current codebase for it.

**Confirmed direction: explicit future scope, not built now.** The product today is lead generation. A client's Packages section displays pricing and drives an enquiry through the contact form, it does not process a transaction. Do not build Paystack subaccount logic, split payments, or any connected-account KYC flow as part of this spec. This is also why Section 2's badge removal is correct rather than a workaround.

If this changes in a future sprint, it will be scoped as its own initiative given the compliance overhead (connected account KYC, split payment logic) involved.

---

## 4. Package Price Display Bug

**Finding.** Package prices currently render as a bare number ("550") with no currency symbol.

**Fix.** Display package amounts with the "R" prefix (for example "R550"), consistent with pricing shown elsewhere on the site.

---

## 5. Package Types

**Request.** Not every business has a fixed price list. Add a package type selector during onboarding and in the dashboard edit screen, with three options:
- **Package** (a fixed offering with a price, as it works today)
- **Special** (a limited-time offer, still supports a price)
- **Discount** (a percentage off, for example "15% off standard callout fee," supports a percentage value instead of or alongside a price)

**Display logic.** The section header on the public client page should reflect what the client actually chose, not always say "Packages." A client using only Specials should see a section titled "Specials." If a client mixes types, use a neutral header such as "What we offer." If a client has none of these set up, the section should not render at all.

---

## 6. Live Page Preview, Missing Feature

**Finding.** A preview of the page-in-progress before the final "You're all set" step was part of the original build intent and does not currently exist. Also missing when a client changes template or edits content afterward.

**Fix.** Add a preview capability in two places:
1. Inside the onboarding wizard, before the final step, showing the page as it will actually render using the data entered so far.
2. On the "Edit your page" dashboard screen and the template picker, so a client can see the effect of a change before committing to it.

A live, real-time preview panel is ideal if feasible within reasonable scope. If too large for this sprint, a "Preview" button that opens the actual rendered page in a new tab using currently saved data is an acceptable first version, confirm scope with Dewald before building.

---

## 7. Gallery Photos Being Used as Hero Image Without Consent

**Finding, confirmed against a live client page.** An uploaded gallery photo was automatically used as the page's hero background image, cropped and cut off incorrectly, with no client control over this.

**Fix.**
1. The hero image and the gallery are separate concerns. Uploading a photo to the gallery must not automatically assign it as the hero background.
2. If a client has not explicitly selected a hero image, the page should use the existing Pexels-based industry-matched stock fallback, exactly as it does today when there are zero gallery photos, not the first uploaded gallery photo.
3. Give the client an explicit "Use as hero image" action on any uploaded photo, separate from simply uploading it to the gallery.
4. Once a photo is selected as the hero image, handle sizing correctly, either crop intelligently to the hero banner's aspect ratio without cutting off key content, or let the client adjust the crop or focal point.

---

## 8. Template Picker Button Alignment

**Finding.** The button text in the template picker ("Choose your page style") is misaligned, bottom-aligned and off-center rather than centred.

**Fix.** Centre the button text properly within the button. Verify across the picker's full button set, not just one.

---

## 9. Template Picker Visual Clarity, Larger Initiative Flagged Honestly

**Finding.** The template picker does not currently give a client enough visual information to understand what they are choosing between. This connects to a deeper issue: today, the 10 templates differ mainly in their hero section treatment, the rest of each page renders largely the same regardless of template.

**Recommendation, sized honestly, two separate pieces of work:**
1. **Quick win for this sprint.** Improve the template picker to show a clearer, larger live preview per option (using the existing `/preview/[templateId]` pages already built) rather than a small, ambiguous thumbnail or label-only choice.
2. **Larger initiative, not this sprint.** Making all 10 templates genuinely visually distinct beyond the hero section (layout order, section styling, typography treatment) is a real design and build project in its own right. Recommend scoping this separately once this spec is through.

---

## 10. Payment Moved to End of Onboarding, Confirmed Scope and Standing Principle

**Confirmed.** Applies to Growth's signup flow. Foundation remains, permanently, a genuine no-card 7-day trial with no payment step at signup at all, this section does not touch Foundation's flow.

**Confirmed as a standing principle, not a one-off fix.** Capture the prospect's information first, take payment last, on any flow where payment is applicable, present and future. If someone drops off before paying, DigitalFlyer still has a way to reach them. Apply this same ordering to any future payment-applicable flow, including a future Enterprise checkout when that ships. The WhatsApp onboarding redirect in Part 2 already follows this same principle, payment is the final step there, no change needed, just noting the consistency.

**Fix (Growth's web wizard).**
1. Reorder the Growth onboarding sequence so payment (Paystack Initialize Transaction, plan selection) is the final step, after business info, business profile, brand kit, template, copy, packages, and Meta ad connection (if applicable) are all captured and saved.
2. If a prospect abandons before reaching payment, their data should already be saved (the wizard is resumable), recoverable, and shows up in the admin panel (Section 11) as an incomplete signup for follow-up.

---

## 11. Admin Panel, Missing Capability

**Finding.** The existing `/admin` view is a read-only summary list. Dewald needs full visibility into every signup's supplied data and status (including incomplete signups once Section 10 ships), and the ability to export that data, since he needs it directly to build clients' Stoep Marketplace pages.

**Fix.**
1. Extend `/admin` to show, per client: full onboarding-supplied data, current status (trial, active, cancelled, or incomplete/in-progress with the last completed onboarding step), and signup channel once Part 2's WhatsApp item ships.
2. Add a CSV (or similar) export capability, single client or full list.
3. Remains gated by the existing email allowlist, no new authentication system needed.

**Acceptance criteria.** Dewald can see every client's full supplied data from `/admin`, including incomplete signups, and export it.

---

## 12. Email Double-Entry Verification at Signup

**Request.** Add a second "confirm your email" field that must match the first before signup can proceed. No autofill or paste allowed into the confirmation field if feasible, to actually catch typos rather than a pasted duplicate.

**Also required.** Visible to Dewald in the admin panel (Section 11), alongside the client's status, so incomplete or unreachable signups can be identified and followed up.

---

## 13. Home Page: Founding Business Banner Styling

**Request.** The "Only 10 Founding Business spots left" banner should stand out more. Build it as a solid block, orange background, white text, positioned as it is today at the top of the hero.

---

## 14. Home Page: Hero Trust Chips, Redesign

**Confirmed finding.** There are 5 chips today (Professional Business Page, Included in the DigitalFlyer Marketplace, Lead Generation Page, No Hidden Fees, Built in South Africa), an odd number that leaves the grid visually unbalanced.

**Fix.**
1. Add a 6th chip: "Built for Google & Meta" (or similar), calling out the SEO, schema, and Pixel/Conversions API foundation as a genuine differentiator.
2. Thicken the chip borders and centre-align the chip content within each box.
3. Six items should resolve the visual gap regardless of grid layout.

---

## 15. Home Page: Hero Subheading Copy, Confirmed

**Confirmed replacement** for "Help us launch DigitalFlyer and shape the future of a platform built specifically for South African businesses":

> "We built DigitalFlyer to help South African businesses get found, get trusted, and grow. Join as a Founding Business and lock in your price, for good."

Slightly larger text size than current.

---

## 16. Home Page: Restructure Ecosystem Value, Fold Into Packages, Simplify the Rest

**Finding.** The "What you also get access to" section near the bottom currently mentions only the DigitalFlyer Marketplace and RE:Biz Nomads. BizUp is not mentioned anywhere on the page, despite being bundled into every tier at no extra cost.

**Confirmed restructure.**
1. Add Marketplace, RE:Biz Nomads, and BizUp as line items directly inside the Foundation and Growth pricing card feature lists, so a prospect sees the full value while looking at the plan they'd sign up for.
2. Replace the current "What you also get access to" section with something shorter and factual, a quick-reference "what does this actually do?" answer in one line apiece, not a sales pitch:
   - **DigitalFlyer Marketplace**: a shared directory where customers can discover your business alongside other DigitalFlyer members.
   - **RE:Biz Nomads**: a private community of South African business owners, deals, support, and real conversations.
   - **BizUp**: in-chat messaging and payments, so you can talk to and get paid by customers in one place.
3. This section can stay in its current position near the footer, its job changes from persuasion (now handled by the pricing card line items) to quick clarification.
4. Update "Request your listing" (currently a plain mailto link) once Marketplace auto-provisioning is addressed (see Part 2, RE:Biz Nomads and Marketplace items), it should not read as a manual request process long term.

---

## 17. Consent Checkbox, Split Into Two, Confirmed

**Fix.** Replace the single combined checkbox with two:
1. **Required.** "I have read and agree to the [Privacy Policy] and [Terms & Conditions]." Both links clickable. Cannot complete signup without checking this one.
2. **Optional, unticked by default.** "Yes, send me occasional updates via email or WhatsApp." Not required to complete signup.

Shorter, as requested, and a stronger position under POPIA than bundling marketing consent into a single required checkbox.

---

## 18. Client Page: Section Title Sizing

**Finding, confirmed against a live client page.** Numbered section titles ("01 — Our story," "02 — About," and so on) render too small and get visually lost.

**Fix.** Increase the size and visual weight of these section title labels across all client page sections and all templates.

---

## 19. Client Page: Contact Section Priority

**Confirmed: leaving direct contact details off the page is deliberate, not an oversight.** The page is built to capture a lead's details first, contact information is revealed only after someone submits the form or enquires about a package, not shown upfront. See Section 20.

**Request.** For a client with no packages set up, the contact form is effectively the entire point of the page, but it currently sits last (section 07 of 7), after Our Story, About, What We Offer, Packages, Testimonials, and Gallery.

**Fix.** When a client has no packages configured, either move the contact section earlier in the page order (directly after the hero and About, ahead of Gallery and Testimonials), or add a second, earlier call-to-action (a "Get in touch" button in the hero or right after About that scrolls to the contact form). This is about surfacing the form sooner, not about revealing contact details early, those still only appear after submission per Section 20.

---

## 20. Client Page: Call and WhatsApp Numbers, Revealed After Submission Only

**Confirmed: no direct call or WhatsApp buttons should be visible on the page before someone submits.** Intentional lead-gen design, capture the enquirer's details first, reveal the business's contact details as the reward after they've submitted the form or enquired about a package. This matches Section 21 below, which already reveals call and WhatsApp only in the post-submission confirmation state, no change needed there.

**Still needed.** The "Edit your page" dashboard section currently uses one phone number for both calling and WhatsApp, when a business may want these to be different numbers.

**Fix.**
1. Add two separate number fields, "Call number" and "WhatsApp number," to both the onboarding wizard and the "Edit your page" dashboard screen, replacing the single shared number field.
2. Do not add any visible click-to-call or click-to-WhatsApp option anywhere on the page before form submission. These numbers are only ever surfaced in the post-submission confirmation state (Section 21) and, if applicable, in a package enquiry confirmation.
3. If a visitor clicks a package's enquiry button, consider tagging that enquiry with which package they clicked before showing the form, so the business owner knows what the lead is interested in. Confirm this level of detail is worth building now versus a later pass.

---

## 21. Client Page: Package Button Labels and Post-Submission Copy

**Finding.** Package buttons currently say "Get Started," misleading since they scroll to a contact form, not a checkout (consistent with Section 3). The lead form's current thank-you state is also generic.

**Fix.**
1. Change package button labels from "Get Started" to something that matches what actually happens, for example "Enquire Now" or "Contact Me About This."
2. On successful form submission, replace the current confirmation state with a warmer, specific message, and display the business's call number and WhatsApp number (Section 20) as clickable links, the first and only point these numbers are shown:

   > "Thank you for reaching out! [Business Name] will be in touch shortly. In the meantime, feel free to call or WhatsApp directly."

---

## 22. Dashboard: "Edit Your Page" Clarity

**Finding.** The "Edit your page" screen has two sections, "Tell us about your business" and "Your landing page," and it is not clear what each does or that changes go live immediately.

**Fix.**
1. Add a clear explanatory line at the top: changes made and saved here are immediately visible on the client's live public page.
2. Rename or reframe the section holding landing page copy so it reads as "Your current content on your landing page," making clear this shows what is live today.

---

## 23. Dashboard: "Your Package" Placement and Content

**Request.** Move the package/plan display further down the dashboard, and show what is actually included in the client's current plan, not just the plan name.

**Fix.** Reposition below the more actionable items (leads, page management), expand to list the specific features included in the client's current tier.

---

## 24. Dashboard: Pexels Image Picker, Missing Feature

**Finding.** Pexels is currently used only as an automatic industry-matched stock fallback when a client has zero photos. No way for a client to actively browse and choose one.

**Fix.** Add a Pexels image browsing and selection interface, available during onboarding (Brand Kit or Gallery step) and in the dashboard, industry-matched search suggestions where feasible.

---

## 25. Dashboard: Social Asset Generator, Expand Beyond Testimonials Only

**Request.** Expand the testimonial-only graphic generator into a broader social content generator.

**Fix.**
1. Offer at least 5 distinct template options: a testimonial card, a special offer announcement, a general announcement, a before-and-after showcase, and one further distinct style.
2. Let the client upload their own image or select one from the Pexels picker (Section 24), industry-matched where feasible.
3. Move the existing "Digital asset style" picker (Clean, Bold Quote, Star Card, Mono Badge) so it sits above the content input section.
4. Rename this overall section to "Create your image ready for Facebook and Instagram posts."

---

## 26. Dashboard: "Search & Ad Platform Verification" Section, Needs Explanation and Cross-Reference

**Finding.** Most clients won't understand what this does without context. The Meta Pixel connection already exists as a feature (Pixel ID, Ad Account ID, Conversions API token), but it's Growth-tier only, a client testing on Foundation wouldn't see it at all.

**Fix.**
1. Add a short, plain-language explanation, for example: "This helps your page show up correctly in Google Search Console and Facebook Business tools you may already have."
2. Ensure this section and the Meta ad tracking section (Growth tier) are clearly cross-referenced in the dashboard.

---

## 27. Dashboard: Marketplace Listing, Should Not Be a Manual Request

**Finding.** The current "Request your listing" flow is a plain mailto link. Direction: this should happen automatically, and instead of a "request," the client should be able to add their own Marketplace listing URL (once auto-provisioned) or an existing external website URL, to display as their website link.

**Scope note.** Depends on Marketplace listings being automatically provisioned, Stoep Marketplace or Core-side work outside this repo under the federated architecture. For this spec, on Growth's side only:
1. Add a "Website URL" field to the client profile, optional, defaulting to blank.
2. Display this URL on the public client page as the business's website link, if provided.
3. Remove the "Request your listing" mailto framing, replace with copy stating Marketplace inclusion is automatic and coming.
4. Flag actual auto-provisioning as a cross-product coordination item, not built in this repo.

---

## 28. Dashboard: No Logout Option

**Fix.** Add a visible logout option to the dashboard, standard placement.

---

## 29. Transactional Email and Auto-Message Copy, Needs a Full Pass

**Finding.** The current account invite email uses Supabase's unbranded default template:

> "You've been invited. You've been invited to create an account. Follow the link below to accept. [Accept invitation]"

**Fix.** Replace default Supabase Auth email templates (invite, magic link, password reset, and others in use) with branded, warm copy. Example replacement:

> Subject: You're invited to build your DigitalFlyer page
>
> Hi there,
>
> You've been invited to set up your DigitalFlyer business page. It takes just a few minutes, no design or coding needed.
>
> [Accept Invitation]
>
> Questions? Just reply to this email or WhatsApp us, we're happy to help.

Apply the same review to any other automated lifecycle emails already in place (trial reminders, Day 0 welcome, Day 3 to 4 nudge), confirming consistent, branded tone.

---

# PART 2: SPRINT 2 AND 3

New build work, covering days 31 to 90 of the 90-day growth push. Sequence after Part 1 is complete.

---

## 30. Sprint 1 Recap, Assumed Already Live Before Starting Part 2

- Founding-member database fields (`is_founding_member`, `founding_signup_number`, `billing_cycle`), webhook logic, cap enforcement, live pricing-page counter
- Privacy Policy and Terms & Conditions published, linked from footer and signup flow, with active consent
- Day 0 automated welcome sequence, Day 3 to 4 incomplete-onboarding nudge, dashboard completeness nudge
- Gallery section as its own clickable page section, photo upload moved into onboarding
- Supabase connection pooling audit and Paystack webhook idempotency audit
- Homepage credibility section structure

If any of these did not actually ship, flag it back before starting Part 2, since several items depend on them.

---

## 31. Standing Instruction Before Any Meta-Related Work

Section 32 touches the Meta WhatsApp Cloud API. Before writing or modifying any Meta integration code, check the current Meta developer changelog for the WhatsApp Cloud API, since this surface changes frequently and has previously broken integrations without notice. Confirm webhook payload structures, media handling, and rate limits against current documentation rather than assuming the existing standalone WhatsApp onboarding codebase's patterns are still exactly current.

---

## 32. WhatsApp Onboarding Redirect Into Growth

The largest item in this spec. Redirects the existing DigitalFlyer WhatsApp onboarding system, previously built to sign people up for DigitalFlyer Core and RE:Biz Nomads, so that it instead signs people up for Growth directly.

### 32.1 Architecture, confirmed direction

Build this into Growth's existing repo, Vercel project, and Supabase project. Do not stand up a separate project. This is a second entry channel into Growth, not a separate product, so it writes to the same `growth_clients` table, uses the same Paystack plan codes, and reuses the same environment variables and Supabase connection already configured.

Treat the existing standalone WhatsApp onboarding codebase as a reference implementation for:
- Meta Cloud API webhook handling and signature validation (`X-Hub-Signature-256` on every incoming POST)
- The async processing pattern (respond 200 within 5 seconds, process afterward)
- Media handling (fetching uploaded images via authenticated Graph API call using the media ID)
- The general conversational flow and message copy style

What changes is the destination of every write and every payment trigger.

### 32.2 New field

Add `signup_channel` to `growth_clients`, enum of `web` or `whatsapp`, set at account creation, so completion rates can be compared across channels.

### 32.3 Conversation flow

1. Business info: business name, contact email, contact phone
2. Business profile: province, industry, business address, business description, tagline, products or services, additional notes, Facebook or Instagram links
3. Brand kit: primary and secondary brand colour, logo upload via WhatsApp media message
4. Template: **recommended simplification, confirm before building.** A visual template picker does not translate well to a WhatsApp conversation. Recommend assigning a sensible default template automatically (Classic Conversion, or whichever of the 10 has shown the strongest early conversion once that data exists). The person can change templates any time from the dashboard after signup. Confirm this with Dewald before building this specific step, it's a real product decision.
5. Landing page copy: offer the AI-generated first draft as text, let the person accept or request changes
6. Packages: optional, captured as simple text if offered
7. Payment: send a Paystack payment link (Paystack Initialize Transaction) directly in the conversation. No payment fields collected directly in the WhatsApp conversation itself, consistent with the data-first, payment-last principle confirmed in Section 10.

No fork question anywhere in this flow. Every WhatsApp signup goes to Growth. RE:Biz Nomads access is offered as a free, bundled next step after signup, not a decision point during onboarding.

### 32.4 Resumability

Match the web wizard's resumable behaviour: if a conversation goes idle and the person messages again later, resume from the last completed step, using the phone number as the resumption key.

### 32.5 Acceptance criteria

- A WhatsApp signup writes a row to `growth_clients` with `signup_channel = 'whatsapp'` and all the same required fields the web wizard captures.
- Founding-member cap logic and pricing behave identically regardless of channel.
- A logo or photo sent as a WhatsApp media message is correctly fetched and stored the same way the dashboard upload does.
- Resuming an idle conversation continues from the last completed step.

---

## 33. RE:Biz Nomads Bundled Access

RE:Biz Nomads private group access is bundled into all DigitalFlyer membership tiers at no extra cost, rather than sold separately.

1. Audit the "Also available to you" dashboard component and confirm no payment step, price reference, or paywall exists anywhere in that flow on Growth's side. Remove any that do. Note: the current live "Join the group" link points directly to a public Facebook group with no payment gate already, so this is likely mostly a copy and framing confirmation rather than a logic change, verify and confirm.
2. Update the copy to explicitly state the access is free and included.
3. RE:Biz Nomads itself lives on Core's separate Supabase project per the federated architecture, this item is limited to Growth's side: capturing the request cleanly (business email and phone, for cross-product matching) and presenting it as a free benefit.
4. Applies to both web and WhatsApp signup channels.

**Acceptance criteria.** No price, checkout, or payment reference appears anywhere in the RE:Biz Nomads flow within Growth.

---

## 34. Cookie and Tracking Consent for Meta Pixel

1. Add an accessible, equally weighted accept and reject option for the Meta Pixel base tracking code, shown to visitors on public client pages before the Pixel fires.
2. If rejected, the Pixel does not fire for that visitor. The Conversions API (server-side) is unaffected either way.
3. Respect the choice for a reasonable period (6 to 12 months) rather than re-prompting every visit.

**Acceptance criteria.** A visitor who rejects sees no Pixel network activity. A visitor who accepts sees normal Pixel activity. The choice persists within the consent duration.

---

## 35. Rate Limiting on Public Endpoints

Add basic rate limiting to the signup wizard's submission endpoints, all lead capture forms on public client pages, and specifically the AI copy drafting step, since it calls the Claude API and has a real per-call cost that scales with abuse.

**Acceptance criteria.** Repeated rapid submissions from the same source are throttled rather than processed indefinitely.

---

## 36. Real Client Pages in "See It In Action"

Once Dewald has identified two or three of the strongest early client pages and confirmed permission, replace one or two of the three current template previews with links to or embeds of the real, live client pages.

**Acceptance criteria.** The section displays at least one real, permission-granted client page, correctly linked.

---

## 37. Build Order for Part 2

1. Section 34 (Pixel consent), compliance item, small scope, ship early
2. Section 35 (rate limiting), independent, can run in parallel
3. Section 33 (RE:Biz Nomads audit), mostly an audit and copy fix
4. Section 32 (WhatsApp onboarding redirect), the largest item, sequenced after the smaller items ship. Confirm the template-picker simplification (32.3, step 4) with Dewald before building that step.
5. Section 36 (real client pages), whenever Dewald has permissions ready, not blocking on the above

---

## 38. Out of Scope, Do Not Build (Whole Document)

- Paystack subaccounts or any in-platform client payment collection (Section 3, confirmed future scope)
- Full 10-template visual redesign (Section 9, flagged as its own future initiative)
- Automatic Marketplace listing provisioning itself (Section 27, cross-product, outside this repo)
- Any change to DigitalFlyer Core's own codebase or Supabase project
- Enterprise tier checkout, still not live
- Dedicated subdomain per business, not yet scoped
- Any change to the Privacy Policy or Terms content itself, that remains a Dewald and attorney task
- Rebuilding the AI copy drafting feature or template system, both unchanged beyond the WhatsApp channel's use of the existing AI draft feature

---

*This document replaces the two previously separate specs. Once Part 1 and Part 2 ship and are tested, bring the results back for Sprint 4 to 6 planning, which has not yet been scoped.*
