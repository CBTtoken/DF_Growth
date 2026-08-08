# Answers for the business agent

**Checked against the live code on 31 July 2026.** Where something is not
built, it says so plainly. Where my earlier brief was wrong, it is corrected
here and the correction is flagged.

---

## A. The Board

### 1. Do likes and comments exist in the live code today?

**Comments: yes.** `board_comments`, with threaded replies via
`parent_comment_id`.

**Likes: yes.** `board_likes` exists.

Both are built. Note this contradicts the product brief I sent earlier, which
said the Board had no engagement features. **That brief was wrong on this
point.** The no-engagement rule applies to *ranking*: posts are ordered by
publish time, area and trade, never by popularity. Likes and comments exist,
they just do not decide what surfaces.

### 2. Exact post type names, and who may post each

The form offers four, and the choice of kind decides the rest of the form.

| Shown as | Picker wording | Who may post |
|---|---|---|
| **Special** | "A special", a deal you are running now | **Members only** |
| **Offer** | "Something you offer", a service you want people to know about | **Members only** |
| **For sale** | "Something for sale", an item you are selling | **Members and the public** |
| **Looking for** | "Looking for something", you need somebody, or you are looking to buy | **Members and the public** |

Special, Offer and For sale carry a price box. **Looking for does not**, on
purpose, because somebody needing a plumber has no price to give.

### 3. Can the public ask for a service, the "I need a plumber" post?

**Yes.** That is exactly what **Looking for** is, and it is open to the public.
The placeholder in the live form is literally *"Plumber for a burst geyser,
Centurion"*.

A "Looking for" post is always personal, never posted as a business, on the
reasoning that a business looking for a plumber is a person looking for a
plumber.

So a member of the public can **browse, post an item for sale, post what they
are looking for, comment, like, and start a Chat with a business.**

### 4. Does each post get a permanent indexable URL?

**Yes.** `/board/post/{slug}` with a canonical tag.

**But not indexable yet.** While the Board is unlisted every board page carries
`noindex, nofollow`. The URLs are permanent and will not change when it goes
public, so nothing breaks and no post has to be recreated.

### 5. Does a WhatsApp share show a preview card?

**Yes, a proper card, not a plain link.** Every post has a generated share
image at `/api/og/board/{slug}` carrying the business name, the item and the
price. The Open Graph title is `{post title} · {business name}` and the
description falls back to kind, business and price if the post has no body.

This works **now**, while unlisted, so a tester sharing into a group gets the
real thing.

### 6. Is the area chosen or automatic? Can a member post to another town?

**Automatic for a business, chosen for a member of the public.**

A business post leaves the post's own `city` empty and takes its area from the
business's town on their profile. That is deliberate: a business that moves
does not leave a trail of posts filed under the old town.

A post by a member of the public carries its own area.

**So no, a member cannot post into a town they are not in.** Changing it means
changing their business address.

### 7. Do posts expire?

**No. Nothing expires.** There is no expiry logic anywhere in the Board code
and no scheduled job that ages posts out. A special from six months ago stays
up until the member hides it.

**Worth raising as a real gap**, especially for "Special" and "Looking for",
where a stale post is worse than none.

### 8. Public or unlisted, and what changes?

**Unlisted right now.** That means exactly three things and nothing else:

1. No link to it in any menu
2. Not in the sitemap
3. Every board page tells crawlers not to index it

**It is not gated.** Anyone with the URL gets the real product, and a tester's
post is a real post that survives the switch.

**To make it public:** set `NEXT_PUBLIC_BOARD_LIVE` to `true` in Vercel and
redeploy. Nothing in the database changes.

**To clear first:** any test posts made during the unlisted period become
publicly visible and indexable the moment it flips. Somebody should read
through what is on there before the switch.

---

## B. The loop

### 9. Does a one-tap "turn into a quote" exist?

**No.** There is no path from a Chat message, a lead, a review or a board post
into a KatisoBiz quote. I searched for it specifically.

**What does exist** is the reverse direction, a shared contact list. A member's
"clients" list combines everybody who has messaged them through the Board with
everybody they have quoted or invoiced in KatisoBiz, **matched on name**,
because a board contact often has no email and a KatisoBiz customer often has
no board identity.

### 10. What would it carry?

Not applicable, it does not exist.

### 11. Shortest real path today from "what will this cost" to an issued quote

1. Customer asks, by Chat, WhatsApp, phone or the lead form
2. Member opens KatisoBiz
3. Adds the customer, name and contact details, or picks them if already saved
4. Adds lines, either from their saved price list or typed
5. Issues it, which allocates the number
6. Sends it by WhatsApp or email

**The customer is not carried across.** It is retyped. That is the honest
answer and it is the obvious thing to build next.

---

## C. Chat

### 12. Who can start a Chat, and what is asked?

**Any member of the public**, from a business's board post or their page. They
give a name and a message. No account and no password.

### 13. Where does each side see it?

**Both, on both sides.** The member sees threads in their dashboard under
Messages, with unread counts and favourites. The visitor sees the thread on the
site.

**Every message also sends an email to the other side**, carrying enough to
answer from. The rule in the code is that nobody sits on a page waiting for a
reply, so a chat product without email is a page where two people leave notes
for nobody.

### 14. Can a member switch Chat off and keep WhatsApp only?

**Yes.** A `chat_enabled` toggle in the dashboard under Messages. Off means no
chat surface on their page and WhatsApp stays.

---

## D. KatisoBiz and Growth together

### 15. What links a Growth business to a KatisoBiz account?

There is a `growth_client_id` column on `bizup_accounts` designed to link them.

**It is null on every account. The two products are not linked in live data
today.** The code that reads it says so in a comment, and the "active this
week" feature on the Board correctly shows nobody as a result.

### 16. Same email at katisobiz.co.za: does it link, or create a second account?

**It creates a second, unconnected account.** There is no automatic linking on
matching email. All 24 current KatisoBiz accounts are separate from Growth,
including where the same person has both.

### 17. Where does an existing Growth member switch KatisoBiz on?

**At katisobiz.co.za, as a separate signup**, because the linking does not
exist. Their Growth tier entitles them to the R49 plan, but nothing today
applies that automatically to an account they create themselves.

**This is the biggest gap in the three questions above**, and it directly
affects what you can promise on camera. Do not demonstrate "it is already
switched on inside your dashboard", because it is not.

### 18. Is the "Generated via KatisoBiz" line on documents, and word for word?

**Yes, added today.** On quotes, invoices and credit notes emailed to a
member's customer, in small grey text at the foot:

> Generated via **KatisoBiz**, DigitalFlyer SA. Quotes and invoices from your
> phone.

"KatisoBiz" links to katisobiz.co.za.

Until today those documents carried our full platform footer instead, signed
"Your DigitalFlyer SA Team" with our email address and a marketplace link, on a
member's invoice to their own customer. That is fixed.

---

## E. Episode 1 specifics

### 19. Can a member change page design after it is built, and see it immediately?

**Yes.** Change Template in the dashboard, ten designs, and the page updates.
**This is a good live moment**, the whole look of the page changes while you
watch.

### 20. Does the free 7 day Foundation signup take a card?

**No card at all.** The code comment is explicit: "No payment ever happens at
signup for a trial, so there's no Paystack transaction reference." Business
name and email, and they are in.

Worth saying on camera, it removes the main objection.

### 21. Can a Foundation account inside its trial post to the Board?

**Yes.** Board posting is gated on being a signed-in member, not on tier or on
trial status.

### 22. Can a member generate and send a review link today?

**Yes.** Every business has a permanent review link at
`/{their-slug}/review`. One screen: a star rating, a comment and a name. **No
account, no password, no email verification.**

**You can absolutely have a real review on a real business before you go live.**
This is the strongest live demo on the list, because the old flow was six steps
and got zero reviews in six weeks.

### 23. What does a brand new dashboard look like?

**Proper zero states, not blank boxes.**

The contact counter shows **0** with the line *"Nothing yet this month."* and
all three actions listed at zero. If the member has no phone number saved it
also shows an amber note saying their number is not on their page yet so nobody
can call or WhatsApp them, and that adding it makes both buttons appear.

Page views shows a seven-day chart at zero.

**On camera this reads as "ready and waiting" rather than "broken"**, which was
the intent.

---

## F. The three public surfaces

### 24. Who appears on each, and the Find a Trade URL

| Surface | URL | Who appears |
|---|---|---|
| **Marketplace** | `/marketplace` | Growth members with a published page. Full pages, reviews, searchable by trade and town. |
| **Find a Trade** | **`https://growth.digitalflyersa.co.za/katisobiz-members`** | KatisoBiz members. A thin free list, searchable by trade and area, message on WhatsApp. **Live now.** |
| **Board browse** | `/board`, plus `/board/area/{area}` and `/board/category/{trade}` | Anybody who has posted, members and public. **Unlisted.** |

The same trade categories are used across all three, so a category means one
thing everywhere.

Note `katisobiz.co.za/katisobiz-members` redirects. Use the
`growth.digitalflyersa.co.za` URL above.

---

## G. KatisoBiz features: what is live today

| Feature | Live? | Detail |
|---|---|---|
| **Saved price list** | **Yes** | Own section, add and edit items, pull straight into a quote |
| **Credit notes** | **Yes** | Proper correction of an issued invoice |
| **Statements** | **Yes** | For a repeat customer, included in the R49 tier |
| **Payment reminders** | **Yes** | With reminder counts and last-reminded tracking |
| **Accountant export** | **Yes** | A one-tap export pack |
| **Top-ups** | **Yes** | Another 75 documents for R49, they never expire |
| **Email under the member's own business name, replies to them** | **Yes** | From name is their business, Reply-To is their own address. The sending address is ours and always will be, since we cannot send as a domain we do not control. As of today the customer also sees their phone, a WhatsApp link and their email in the body. |
| **Numbering continuing from an old paper book** | **NO** | Not built. Numbering starts at 0001 per series per year, allocated by the database. There is no setting for an opening number. **Do not demonstrate or promise this.** |

---

## Three things to be careful of on camera

1. **Do not show KatisoBiz being switched on from inside the Growth dashboard.**
   That link does not exist. A Growth member signs up separately today.
2. **Do not promise continuing an old invoice book.** Numbering starts at 0001.
3. **Clear the Board before it goes public.** Test posts become publicly
   visible and indexable the moment the flag flips.

## And one correction to the brief I sent you earlier

That brief said the Board had no likes or comments. **It has both.** What it
does not have is engagement-based ranking. My apologies, and this document is
the correct version.
