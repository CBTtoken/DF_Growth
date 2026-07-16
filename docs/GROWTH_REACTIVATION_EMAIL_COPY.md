# GROWTH_REACTIVATION_EMAIL_COPY.md

Approved copy for the 31-business legacy reactivation invitation. Merge fields in `[brackets]`, templated against each business's live `growth_clients` record (`signup_channel = 'legacy_reactivation'`) — the source of truth for what's actually live, rather than a separate spreadsheet.

## Merge fields needed
- `[Business Name]`
- `[Public Page URL]`, the live, viewable page, no login needed
- `[Login Link]`, the recovery link from the build spec's Section 8.1, this is what actually gets them into their dashboard to set a password
- `[Unsubscribe Link]`, required, see the sending safeguards already built into the build spec

---

**Subject:** [Business Name], your DigitalFlyer page has been rebuilt

**Preview text:** Your new page is already live. Here's what changed and what to do next.

---

Hi [Business Name] team,

We spent the last few months completely rebuilding DigitalFlyer SA from the ground up, and your business was one of the ones we didn't want to lose in the process.

**What we've done:** your old listing has been migrated onto our brand new platform, and we didn't just move it over as is. We rewrote your page content and picked a fresh design for [Business Name], so it's ready to go without you having to do any of that work yourself.

**Your new page is already live, right now, here:**
[Public Page URL]

**Why this actually matters for your business:**

- **Built to be found.** Your new page is built the way Google actually needs it to be, so local customers searching for what you offer have a real chance of finding you, not just people who already know your name.
- **Built to capture leads.** There's a direct enquiry form right on your page, so a customer can reach out and it lands straight in your dashboard, not lost in a comment or a message you might not see for days.
- **Already done for you.** No setup, no writing, no design decisions. It's built, it's live, it's yours.

**Your next step, and this matters: you have 7 days of full access starting today.**

To get into your dashboard, manage your page, and see your enquiries, click below to securely log in and set your password:

**[Login Link]**

Once you're in, you can stay on our flat-rate Foundation plan, or upgrade to Growth to unlock things like on-demand branded social media graphics and deeper tracking on how your page is performing.

Let's get your business found again.

The DigitalFlyer SA Team

---

*You're receiving this because you were previously a registered DigitalFlyer SA member. If you'd rather not hear from us, [Unsubscribe Link].*

---

## Notes on what changed from the original draft, for the record

- Removed the "R0 Commission" claim entirely. This batch has no product sales or checkout, only a lead form, so there's nothing to take commission from, the claim would describe a feature that doesn't exist for these accounts. Replaced with "already done for you," which is real and genuinely differentiating, most of these business owners will remember their old listing needing real effort to fill out.
- Changed "storefront" to "page" throughout, same reason, avoids implying e-commerce that isn't there.
- Softened "weekly social media flyers" to "on-demand branded social media graphics," matching what the feature actually does.
- Added a working unsubscribe line, required given the sending safeguards already built into the reactivation spec.
- Simplified the subject line, no emoji, no exclamation mark, safer for a list with real bounce and complaint risk.
- Clarified the two links are doing two different things: the public page is already viewable by anyone right now, the login link is specifically what gets the owner into their own dashboard. The original draft blurred these into one action.

## Round 2 changes (2026-07-16)

- **Greeting changed from `[Owner First Name]` to `[Business Name] team`.** The legacy source data does have first/last name fields, but they were never captured into `growth_clients` during the Sprint 1 batch build, and re-templating this whole batch off a separate spreadsheet added risk for a one-line personalization. Dewald's call: use Business Name for all 31 instead.
- **Merge-field source clarified**: templated directly off each live `growth_clients` row (`signup_channel = 'legacy_reactivation'`), not a separate `GROWTH_REACTIVATION_BATCH_31_FOR_CLAUDE_CODE.xlsx` file, which doesn't exist anywhere in the repo.
- **"7 days of full access from the moment you open this email" → "starting today."** The built system starts the trial clock (`trial_starts_at`) at send time, not at open time — there's no open-tracking pixel, and adding one just for this line wasn't worth the added complexity/privacy footprint. "Starting today" is honest about what's actually measurable.
- **`[Unsubscribe Link]` is a real, working link, not a reply-to-unsubscribe placeholder.** New `/unsubscribe?client={id}&token={hmac}` route (public, no login), backed by a new `growth_clients.email_unsubscribed_at` column — any future batch-resend must check this before including a recipient. Scope is deliberately narrow: it only suppresses future marketing/campaign sends, never transactional email an account actually needs (password reset, etc).
