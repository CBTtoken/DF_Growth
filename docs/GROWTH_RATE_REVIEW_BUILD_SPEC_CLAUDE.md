# GROWTH_RATE_REVIEW_BUILD_SPEC_CLAUDE.md

## 1. Project Overview

Every Growth member page gets a public star rating and review section, visible immediately, expandable to read full reviews, the same mental model as Facebook reviews so no one has to learn anything new. Business owners can publicly reply to any review. This is public facing, audience is both the visitor leaving a review and the business owner managing their reputation, brand matches Growth throughout.

## 2. Confirmed Decisions

- **Anyone can leave a review, but only through a verified account, not anonymously.** Email confirmation required before a review goes live. This is deliberately more open than "only actual leads," most real customers never touch the lead form, they call or WhatsApp directly, restricting reviews to leads would exclude most genuine reviews.
- **Businesses can publicly reply to any review**, once, from their dashboard.
- **Businesses can never delete or edit a review.** They can flag one for admin review if they believe it's fake or abusive, a human at DigitalFlyer makes the actual removal call, not the business itself.

## 3. Trust and Anti-Manipulation Design

- **Reviewer accounts required**, lightweight, email and password or magic link, no business membership needed. One review per verified account per business, editable by the reviewer themselves, not duplicable.
- **Email verification required before a review publishes.** Unverified submissions sit pending, not visible, until confirmed.
- **Cloudflare Turnstile on the review submission form**, same bot protection already live elsewhere in Growth.
- **Basic fraud signal check at submission**: flag (don't auto-block) a review if the reviewer's account shares an email domain, phone number, or clear device/session fingerprint with the business's own owner account. Surface this to admin as a flagged review, don't silently reject it, false positives are possible and a human should confirm.
- **Velocity-based flagging, not blocking.** A business receiving an unusual burst of reviews in a short window gets flagged for admin visibility, not automatically frozen. A genuine post-launch wave of happy customers should never get treated as fraud by default.
- **Admin moderation queue**, reusing the existing admin panel pattern (consistent with the Danger Zone and other admin queues already built). Every flagged review, whether flagged by the business or by the fraud signals above, lands here for a human decision: keep, remove, or dismiss the flag.

## 4. Data Model

New table, `reviews`: `id`, `business_id` (references `growth_clients`), `reviewer_account_id`, `rating` (1 to 5), `review_text`, `status` (`pending_verification`, `published`, `flagged`, `removed`), `business_reply` (nullable text), `business_reply_at` (nullable), `flagged_reason` (nullable), `created_at`, `verified_at` (nullable).

Store a hashed fraud-signal fingerprint, not raw IP addresses in plain form, consistent with the ecosystem's existing POPIA-conscious data handling.

## 5. Public Display

- Star rating and total review count visible immediately on the business's public page, no click required.
- "Read reviews" expands the full list, most recent first.
- Each review shows the reviewer's first name (not full name, not email), star rating, review text, date, and the business's public reply if one exists.
- No rating shown at all (not a zero-star display) for a business with no reviews yet, avoid implying a bad score where there's simply no data.

## 6. Business Dashboard

- List of all reviews on their page, including flagged ones with status visible.
- One public reply per review, editable after posting.
- "Flag for review" action per review, requires a short reason, routes to the admin queue from Section 3.

## 7. SEO

Feed the aggregate rating and count into each business page's existing JSON-LD structured data as `AggregateRating`. This is what lets Google show star ratings directly in search results, a real, concrete way this ties into "pop on every search where applicable," not just a nice-to-have.

## 8. Build Order

**Sprint 1.** Reviewer account and email verification flow, review submission with Turnstile, `reviews` table, public display on business pages including the no-reviews-yet state.

**Sprint 2.** Business dashboard reply and flag actions, admin moderation queue, fraud signal flagging (shared identity, velocity), `AggregateRating` JSON-LD integration.

## 9. Out Of Scope

- No photo uploads attached to reviews in this build.
- No review incentive or rewards system.
- No import of reviews from other platforms.
- No automatic removal of any review without a human admin decision.

## 10. Acceptance Checklist

- [ ] Review submission requires a verified account, Turnstile-protected
- [ ] Unverified reviews never appear publicly
- [ ] One review per account per business enforced
- [ ] Businesses can reply publicly but cannot delete or edit a review
- [ ] Flag action routes to admin queue, not automatic removal
- [ ] Fraud signals (shared identity, velocity) flag for admin, never auto-block
- [ ] Rating and count visible immediately on business pages, expandable to full reviews
- [ ] No-reviews-yet state doesn't display as a zero score
- [ ] AggregateRating JSON-LD live on business pages with reviews
