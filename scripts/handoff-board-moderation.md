# Handoff: The Board, structural moderation before launch

**For Claude Code. Written 6 August 2026.**

**Queued. Does not start until the activation and nudges sprint is reported and
merged. One sprint at a time.**

---

## Context

The Board is built and functionally complete, held back from the menu, the
sitemap and Google by one flag. Before it goes live it needs the rules that stop
it becoming a Facebook group.

The reason Facebook groups fill with nonsense is that there is one empty box and
anything fits in it. **The strongest moderation available here is structure, not
filtering.** A post that cannot be submitted without a price, an area and a photo
is a post a time-waster does not finish. Most unwanted content should be
unpostable rather than removed.

An admin moderation queue already exists, with hold, restore, remove, identity
blocking, takedown and a decision log. **Extend it. Do not rebuild it.**

Everything here is pre-launch, which is the cheap time to do it. Retrofitting
rules onto a live board with real posts is a different and worse job.

## Goal

A board where everything with money attached comes from an identified paying
member, where each post type is a form rather than a free text box, where the
bot handles everything countable, and where one person in Vadodara can keep up
with what is left.

---

## Job 1: post types become forms

Each of the four post types gets required fields and will not submit without
them. Optional fields are fine, required ones are the point.

- **For sale.** Price, condition, area, at least one photo. A photo is required,
  not optional.
- **Offer or special.** What the offer is, the price or the saving, the area it
  applies in, and an end date. An offer with no end date is not an offer.
- **Deal or promotion from a member.** Same as offer, plus it must resolve to
  that member's Growth page.
- **Looking for.** What is needed, the area, and how urgent. Kept lightest of
  the four, because this is the type the public posts and friction here costs
  demand.

Free text still exists inside each form. It is no longer the whole post.

Every field that has a home must not be accepted in the body. A phone number or
an email typed into a description where a field exists for it is rejected with a
message pointing at the right field.

## Job 2: asymmetric posting rights

**This is the rule that separates the Board from a group, and it is not
negotiable in implementation.**

- **The public** can post "looking for", and can comment and react.
- **Paying members only** can post for sale, offers, specials and deals.

Anything with money attached comes from an identified business with a page, a
number and a subscription to lose. A stranger can ask. Only a member can sell.

Enforce this at the data layer, in RLS, not in the interface. A hidden button is
a suggestion. A database rule is a rule.

A lapsed member loses selling rights automatically when the subscription lapses,
at the data layer, without anyone remembering to do it.

## Job 3: the Board never touches money

No payments, no deposits, no escrow, no "pay me here" anywhere on the Board.

Every for-sale or offer post resolves to something that already exists and
already keeps a record: the member's Growth shop, or a KatisoBiz invoice or
quote. A deal that happens in a comment thread creates a dispute nobody can
resolve.

Banking details, payment links and payment requests posted in a body or a
comment are auto-held, not auto-removed.

## Job 4: what the bot does alone, and what it holds

Same split already agreed for the Members' Room. Keep it consistent.

**Auto-enforced, no human in the loop. Anything countable.**

- Post frequency caps per poster per period
- Duplicate and near-duplicate posts
- Missing required fields
- Links, against an allowlist
- Contact details in a body where a field exists
- The banned goods and services list
- Posting a type the poster is not entitled to post

**Flag and hold, surfaced to admin with the reason. Anything needing
judgement.**

- Tone, aggression, or a suspected dispute between members
- Suspected scam patterns
- Anything reported by a user
- Payment details found anywhere
- Health, medical or income claims

**The bot never removes on judgement alone.** A wrongly deleted post from a
paying member costs more than the post did.

Every rule is individually toggleable in admin, with sensible defaults on.

## Job 5: the banned list, published

Publish it short and visible at the point of posting, not buried in terms.

Money lending and credit offers. Network marketing, recruitment schemes and
anything paying to join. Firearms and weapons. Alcohol and tobacco. Medicines,
supplements and health claims. Adult content or services. Live animals. Event
tickets. **Job adverts and job wanted posts.**

That last one needs saying plainly on the page: a jobs section is planned and is
not open yet. It will otherwise become the highest-volume unwanted post type on
the Board by a wide margin.

Dewald approves the final list wording before launch.

## Job 6: anti-scam basics

- **A post cannot be silently edited once it has comments or reactions.** Either
  block the edit or show that it was edited, with the original visible to admin.
  Posting something clean and editing it later is the standard bait and switch.
- **A report button on every post and comment**, with a reason, feeding the
  existing moderation queue.
- A poster's history is visible to admin from any post in one click. Volume and
  pattern catch what any single post does not.

## Job 7: posts expire

Every post gets an expiry. A board full of dead posts from March looks
abandoned, and abandoned boards do not get used.

- Sensible default periods per type, shorter for offers and looking-for, longer
  for for-sale. Say in the report what you chose.
- One-tap renew for the poster, with a reminder before it lapses.
- Expired posts stay reachable at their URL and stay indexed, clearly marked as
  expired, since the Google value is the whole point of the Board. They come off
  the browse and the feed.
- **A member renewing a post is telling you they are still trading.** Feed that
  into the active signal.

---

## Out of scope

- The jobs section. Parked, and named in the banned list as not open yet
- The verified badge mechanism. Still Dewald's decision
- Flipping the Board live. The flag stays as it is
- Rebuilding the moderation queue. Extend what exists
- Any payment handling anywhere on the Board
- Retention periods and the data retention question, which sit with Dewald's
  attorney
- The WhatsApp inbox, the Members' Room, Growth, KatisoBiz

## What you decide, and what needs Dewald

**Decide yourself:** schema, how rules are stored and evaluated, expiry
defaults, frequency cap numbers, how near-duplicate detection works, admin
screen layout, and how the entitlement rule is expressed in RLS.

**Stop and ask Dewald:** the banned list wording, the message a rejected poster
sees, the expiry periods if you are unsure, and anything that would remove
content automatically rather than hold it.

**Never without Dewald:** deleting files, force pushing, secrets or environment
variables, Vercel settings, production data, payment credentials.

Three minute rule applies.

## Acceptance criteria

1. Each of the four post types cannot be submitted with a required field empty
2. A for-sale post cannot be submitted without a photo
3. A phone number or email typed into a description is rejected with a message
   naming the correct field
4. A non-member cannot create a for sale, offer, special or deal post, and this
   holds when attempted directly against the database, not only in the interface
5. A non-member can post "looking for", comment and react
6. A member whose subscription lapses loses selling rights automatically
7. No payment, deposit or escrow path exists anywhere on the Board
8. Banking details or a payment link in a body or comment is held, not removed
9. Every auto-enforced rule listed in job 4 fires, and every flag-and-hold rule
   holds rather than removes
10. Every rule can be switched off individually in admin
11. The banned list is visible at the point of posting
12. A post with comments cannot be silently edited
13. A report button exists on every post and comment and feeds the existing
    queue
14. Posts expire, can be renewed in one tap, and expired posts stay reachable
    and indexed while leaving the browse
15. Renewing a post feeds the active signal
16. Nothing listed under Out of scope has changed

## How to report back

One report at the end. Cover:

1. What changed, by file, in plain language
2. The Vercel preview URL
3. The required fields you settled on for each post type
4. The expiry period chosen per type, and why
5. The frequency caps chosen, and why
6. All poster-facing copy, quoted in full, for approval
7. How the entitlement rule is enforced at the data layer, and how you tested
   that it cannot be bypassed
8. What happens to the posts already on the Board that would not pass the new
   required fields
9. Anything found and deliberately not fixed, and why
10. Anything in this brief that turned out to be wrong about how the code
    actually works
