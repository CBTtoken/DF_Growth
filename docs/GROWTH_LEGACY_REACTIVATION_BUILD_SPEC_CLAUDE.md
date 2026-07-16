# GROWTH_LEGACY_REACTIVATION_BUILD_SPEC_CLAUDE.md

## 1. Project Overview

31 real businesses from DigitalFlyer Core's legacy database get a fresh Growth account and a real landing page, built and improved automatically, ready and waiting the moment their personalised invitation email goes out. Every one of these listings is already effectively expired and due for renewal, this is a genuine win-back, not a cold approach.

This spec covers account creation, page generation, and the sending infrastructure. **It does not cover the email content itself.** That gets written and approved separately before anything sends, per Section 8.

Source list: `DigitalFlyer_Legacy_Reactivation_Candidates.xlsx`, four tabs:
- **Reactivation Candidates**, 31 rows, this batch, process per this spec.
- **NPO, Handled Separately**, 4 rows (Cry Our Rhino, Kids Care, Bramley Children's Home, Helplift Network Vaal Triangle). These never pay and should be marked with an active status rather than a trial, but **do not include them in this batch or in the emailer**, Dewald is handling these directly. Not built in this spec, noted here so they aren't accidentally picked up later.
- **Removed by Dewald**, 13 rows, reviewed and deliberately excluded, do not process.
- **Excluded, Internal**, 3 rows (Vowie, RE:Biz, DigitalFlyer SA Agents), internal listings under Dewald's own email, not real customers, do not process.

## 2. Confirmed Decisions

- **Target platform: Growth.** Core was never actually rebuilt, per the last full ecosystem review, so these accounts are created on Growth, the only live, working platform.
- **Plan: Foundation, 7-day free trial.** Standard Foundation tier, nothing new to build on the billing side.
- **Trial timing is decoupled from account creation.** The 7-day clock starts when a business's invitation email is actually sent, not when its account and page are built. Accounts can sit fully built and ready for days or weeks before their email goes out without burning any of their trial. See Section 5.
- **Logo reuse.** Attempt to retrieve each business's existing logo from their legacy `Company Logo` URL (Cloudinary-hosted). If retrieval succeeds, re-host it in Growth's own storage rather than hotlinking the old Cloudinary URL indefinitely, that account may not exist once Core is eventually retired. If retrieval fails (dead link, 404, or the field is empty), fall back to Growth's normal photo/Pexels flow for that business automatically, same as any new signup.

## 3. Bulk Account Creation

For each of the 31 rows in the Reactivation Candidates tab:
- Create a `growth_clients` record, `plan = foundation`, trial not yet started (see Section 5).
- Map `User Email` as the account email and username.
- Map `Company Name`, `Introduction`, `Description`, `Category`, `Sub Category`, `Mobile Number`, `WhatsApp Number`, `Facebook Url`, `Website`, `City Name`, `Address` into Growth's existing onboarding data model.
- Match `Category`/`Sub Category` against Growth's existing industry taxonomy on a best-fit basis, same approach as the city taxonomy match below. Where nothing fits well, flag it rather than forcing a bad match.
- Match `City Name` against Growth's existing ~50-city taxonomy, best fit, fall back to the taxonomy's "Other" handling where no real match exists.
- Contact details (mobile, WhatsApp) stay withheld from the public page until a lead form submission, consistent with every other Growth client page, no exception for this batch.
- No payment step, no Paystack checkout, these are Foundation trial accounts created directly.

Create all 31 accounts up front, in one pass. There's no cost or trial time lost in accounts sitting built and unsent, per Section 2.

## 4. Content, Template, and Image Generation

**AI content improvement.** Reuse Growth's existing AI-drafted landing copy mechanism, the same one used in live onboarding today, feeding it this business's `Introduction`, `Description`, `Category`, and `Sub Category` as seed content instead of live wizard answers. Same no-fabrication principle already standard for this kind of content: improve clarity, structure, and professionalism, don't invent facts, credentials, years of experience, or claims the source content doesn't support.

**Template assignment.** Randomly assign one of Growth's 10 existing templates per business, with light fit-based judgement rather than pure random, and avoid assigning the same template to two similar-industry businesses back to back where reasonably avoidable. Claude Code has discretion on exactly how to weight this, the goal is visible variety across the batch, not a rigid algorithm.

**No product offerings.** Every page in this batch gets the standard lead/contact form only, nothing in the store or booking flow. This is already Growth's default page shape, not new build work, just don't wire in any product/store setup step for this batch.

**Images.** Per Section 2's logo decision. Beyond the logo, use Growth's normal Pexels stock-photo-by-industry fallback for any other imagery a page needs, same as a new signup with no photos of their own.

## 5. Trial Timing Mechanism

Add a `trial_starts_at` field (nullable) to these accounts, separate from `created_at`. The account and page exist and are fully built immediately, but Foundation's 7-day countdown, and any trial-expiry logic elsewhere in the dashboard or billing flow, reads from `trial_starts_at`, not `created_at`. This field is set at the moment this business's invitation email actually sends (Section 8), not before. Confirm existing trial-expiry logic elsewhere in Growth reads from this field for these accounts rather than assuming `created_at`, this is the one place existing logic needs to change to support this batch.

## 6. Admin Visibility

New "Reactivation Batch" view in `/admin`, listing all 31: business name, account status (built, invitation sent, trial active, trial expired, converted to paying), `trial_starts_at` once set, and email delivery status (Section 9). CSV export, consistent with existing admin patterns.

## 7. What This Spec Does Not Build

The actual copy of the invitation email is not written here, that's a separate step Dewald and Claude work through together before anything sends, per his own instruction. Build the mechanism in Section 8 with placeholder content, but the send stays gated (Section 9) until real, approved copy is in place.

## 8. Invitation Email Infrastructure

Each business's email needs, at minimum: their business name, a merge-personalised opening, their unique login/magic-link (Section 8.1), and a clear reason to log in and see their new page. Content itself, tone, structure, subject line, comes later.

### 8.1. Authentication: reuse the existing magic-link fallback, don't build new auth

Growth already has a magic-link fallback specifically for pre-existing accounts, built during the auth migration. This batch is exactly that case, don't build a new "auto-generated password plus reset email" flow, it would duplicate something that already exists and works. Generate each business's magic link server-side at send time and embed it directly in the custom invitation email template, don't rely on Supabase's own default auth email for this, see Section 9 for why that matters specifically for a batch this size.

## 9. Sending Safeguards, This Matters For The Whole Platform, Not Just This Campaign

This is the part worth getting right before anything sends, since a bad bounce rate here doesn't just waste this campaign, it can damage email deliverability for every other real transactional email Growth depends on, password resets, lead notifications, order confirmations, all of it.

- **Do not send these through Supabase's own built-in auth email system.** It's low-volume, shared infrastructure, not built for campaign-style sending, and pushing 31 emails through it at once risks getting that sending capability throttled or flagged, which would affect real password reset emails for real paying customers, not just this batch. Send through the same proper transactional provider already used for Growth's other lifecycle emails, with the magic link from Section 8.1 embedded as a normal link in a custom template, not through Supabase's default templates.
- **Use a separate sending subdomain for this campaign**, distinct from whatever subdomain handles core transactional email (password resets, order confirmations). Something like `hello.digitalflyersa.co.za`, with its own SPF and DKIM records. If this batch's bounce or complaint rate turns out higher than expected, and a legacy list this old is a real candidate for that, it damages that subdomain's reputation, not the one real operational emails depend on.
- **Verify every address before sending.** Run a syntax and MX-record check at minimum, a real-time verification API pass if one is available, and drop obviously dead addresses from the send list before they're ever attempted. Report what got dropped and why.
- **Send in small staged batches, not all 31 at once.** Something like 10 to 15 at a time, with a pause between batches to observe bounce and complaint rates before continuing.
- **Set an automatic pause threshold.** If bounce rate across a batch crosses roughly 3 to 5%, stop sending further batches and surface that to Dewald rather than continuing on autopilot.
- **Handle bounce and complaint webhooks from the sending provider.** Maintain a suppression list, never resend to an address that hard-bounced or complained, and reflect that status in the admin Reactivation Batch view (Section 6).
- **Include a real, working unsubscribe link**, even though the consent basis here is legitimate (previously subscribed, never unsubscribed). This is both good deliverability practice and consistent with the POPIA compliance workstream already flagged as open elsewhere in the platform, worth doing properly rather than skipping because consent technically already exists.

## 10. Build Order

**Sprint 1.** Bulk account creation (Section 3), content generation and template/image assignment (Section 4), trial timing field (Section 5), admin Reactivation Batch view (Section 6).

**Sprint 2.** Invitation email infrastructure and magic-link integration (Section 8), full sending safeguard stack (Section 9): separate subdomain, verification pass, staged sending with pause threshold, bounce/complaint handling, suppression list, unsubscribe link.

**Held, not part of either sprint:** actual sending of any email to any real business. That happens only once email copy is written and approved separately, and only as a manually triggered action, not an automatic one at the end of Sprint 2.

## 11. Out Of Scope

- No product, store, or booking setup for any account in this batch.
- No new password/reset flow, Section 8.1 reuses what already exists.
- No automatic sending, ever, without an explicit manual trigger per batch, per Section 10.
- No processing of Vowie, RE:Biz, or DigitalFlyer SA Agents, they're excluded per Section 1.
- No processing of the 4 NPO accounts (Cry Our Rhino, Kids Care, Bramley Children's Home, Helplift Network Vaal Triangle), Dewald is handling these separately, per Section 1.
- No processing of the 13 businesses Dewald reviewed and removed, per Section 1.

## 12. Acceptance Checklist

- [ ] All 31 accounts created on Foundation, trial not started
- [ ] Each page has AI-improved content sourced only from that business's own legacy data, no invented facts
- [ ] Templates show real variety across the batch, not a single repeated choice
- [ ] Logos successfully retrieved and re-hosted where available, Pexels fallback used cleanly where not
- [ ] Contact details withheld until lead form submission, consistent with every other Growth page
- [ ] `trial_starts_at` confirmed as the field driving trial-expiry logic for this batch, not `created_at`
- [ ] Admin Reactivation Batch view live with full status visibility
- [ ] Magic-link generation working, tested against the existing pre-existing-account flow
- [ ] Sending subdomain configured with its own SPF/DKIM, separate from core transactional email
- [ ] Email verification pass built and tested
- [ ] Staged batch sending with pause threshold built and tested
- [ ] Bounce/complaint webhook handling and suppression list built and tested
- [ ] Unsubscribe link present and functional
- [ ] Confirmed: no email has been sent to any real business, pending content approval
