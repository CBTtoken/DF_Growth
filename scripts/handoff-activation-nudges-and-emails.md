# Handoff: opt-in KatisoBiz activation, public URL move, Growth nudges, and two member emails

**For Claude Code. Written 6 August 2026.**

**Follows `unified-account-and-reviews`, which is merged. Nothing here starts
until that is on main.**

**This replaces the two separate files sent earlier. Work from this one only.**

---

## Context

The unified account sprint linked the products and shipped automatic KatisoBiz
provisioning on Growth signup. **That automatic behaviour is now being
reversed**, deliberately, after the fact. Creating a KatisoBiz account for
somebody who never asked for one puts their details into a product they did not
opt into, and any account that exists will eventually receive mail about that
product. A Growth member who bakes cakes and will never send a quote should not
appear in KatisoBiz at all.

The link stays automatic. The account creation waits for a yes.

The same sprint revealed the live numbers: 46 Growth accounts, 31 KatisoBiz
accounts, 3 linked. Several of the 46 are Dewald's own or tests. The 28 unlinked
KatisoBiz accounts are almost entirely trades, plumbers, painters, welders,
builders, and they are the recruitment pool for Growth.

Current pricing, for copy purposes: **Foundation R100 a month or R900 a year.
Growth R180 a month or R1,199 a year.** Note that R1,199 a year works out at
R99.92 a month, so Growth paid annually costs the same per month as Foundation
paid monthly. That line is the strongest upgrade argument available and should
appear wherever an upgrade is offered.

## Goal

A Growth member activates KatisoBiz when they choose to, public URLs stop
carrying a retired product name, KatisoBiz members are shown a real reason to
take a Growth plan based on their own activity, and two emails go out to
existing members.

## Order of work

Jobs 1 to 6 are the build. Job 7 is the emails and **must not start until job 1
is live**, because the activation email points at a button that job 1 creates.

---

## Job 1: activation becomes opt-in

**Change what shipped.** `ensureLinkedBizUpAccount`, called from `saveStep1` in
the onboarding flow, must no longer create a KatisoBiz account.

Split its behaviour:

- **Linking stays automatic and stays where it is.** If a matching KatisoBiz
  account already exists, by login or by phone, link it silently. That is a
  correctness fix and needs no consent.
- **Creation moves behind an explicit action.** If no account exists, create
  nothing at signup.

**Add the activation control** to the Growth member dashboard, in the account or
plan area. It states plainly that KatisoBiz is included in their plan, says in
one line what it does, and has one button to activate. Pressing it creates the
free KatisoBiz account, links it, and takes them into it.

- A member who already has a linked account sees a link into KatisoBiz instead,
  never the activation button.
- Activation is recorded with a timestamp, so it can be counted.
- No account is ever created by any path other than this button or a direct
  KatisoBiz signup.

**Do not backfill.** The 43 Growth members without KatisoBiz get the button, not
an account. The job 7 email is what brings them to it.

## Job 2: move the public `/bizup/` URLs

BizUp is a retired name and it currently appears in URLs that members send to
their own customers, including the review capture link a tradesperson sends to a
homeowner.

Move every **public-facing** KatisoBiz route off `/bizup/`. At minimum the
review capture page, the invoice screens, and the upgrade and signup pages.
`/katisobiz/` is the obvious replacement unless you find a reason it collides.

- **Every old URL gets a permanent redirect to the new one.** Links are already
  in the wild and none may break.
- Check for the old path in email templates, WhatsApp message text, the sitemap,
  canonical tags and Open Graph URLs, not only in routing.
- Internal file, folder, table and variable names stay as they are. This is a
  public URL job only, and renaming internals turns a small job into a large
  one.
- List every route moved, old path and new path, in the report.

## Job 3: duplicate member pages

Two businesses have two live pages each, and both duplicates are on the
marketplace:

- Mila's Place (`mila-s-place`) and Milas Place (`milas-place`)
- SIP Happens Bespoke Mobile Bar (`sip-happens-bespoke-mobile-bar`) and SIP
  Happens (`sip-happens`)

Do not delete anything. Report which of each pair has real content, photos and
recent activity, and which is empty, and recommend which to keep. **Dewald
picks.** Once he has, redirect the retired one permanently to the keeper and
remove it from the marketplace.

Also check for any other duplicate on the same phone number or a near-identical
business name, and list them without acting.

## Job 4: the website question

One question in KatisoBiz, shown once to any member without a linked Growth
account, dismissible, three tap answers:

1. I have a website
2. I only have Facebook or WhatsApp
3. I have neither

Store the answer against the account. Show the counts in admin. That is the
whole feature. No follow-up flow, no automated response to the answer.

## Job 5: the review wedge

A KatisoBiz member with no Growth page who has received at least one review sees
a prompt on their reviews or dashboard screen. The prompt shows how many reviews
they have and says, in plain language, that those reviews are sitting on a page
nobody can find, and that a Growth page puts them where customers looking for
their trade will see them. One button through to the Growth plans.

- Only shown to members with no linked Growth account.
- Only shown once they actually have a review. Never shown at zero.
- Dismissible, and it does not come back for at least 30 days.

## Job 6: the quote nudge

On the KatisoBiz reports or dashboard screen, for members with no linked Growth
account, a prompt built from their own real numbers: quotes sent this period and
quotes won. It observes that the ones who did not accept went somewhere they
could see the member's work, and offers a Growth page.

- Uses only real figures from that member's own documents. **No invented
  benchmarks, no industry averages, no comparison to other members.**
- Only shown once the member has sent enough quotes for the numbers to mean
  something. Use a sensible threshold and say in the report what you chose.
- Dismissible, and does not come back for at least 30 days.

**Both nudges** carry the build-it-for-me offer at R450 as a secondary line,
since the member being addressed is a working tradesperson who will not sit down
and fill in an onboarding wizard. Both show the annual figure alongside the
monthly one.

Dewald approves all nudge copy before it ships.

---

## Job 7: two emails to existing members

**Does not start until job 1 is live.**

Send the activation email first. Send the expiry email a week later, and only to
members whose subscription is actually lapsing. Never send both on the same day
and never combine them. One is a gift and one is a warning, and mixing them
weakens both.

Both are plain text or very light HTML. No banners, no stock photography, no
long intro paragraph. The member reads these on a phone. **Copy is approved,
send as written.**

### Email 1: activate KatisoBiz

**Send to:** Growth members with no linked KatisoBiz account.

**Subject:** {name}, you are already paying for this one

Good day {name},

Quick one. Your Growth plan includes KatisoBiz, and you have not switched it on
yet.

It is a quoting and invoicing tool built for a phone:

- Build a quote in under a minute and send it on WhatsApp
- Turn an accepted quote into an invoice with one tap
- See who has paid and who still owes you
- Add a Pay Now button so the money lands in your own account

It is included in what you already pay. Nothing extra, no card needed.

{button: Switch on KatisoBiz}

Takes about thirty seconds.

Regards,
Dewald
DigitalFlyer SA

### Email 2: subscription about to lapse

**Send to:** members whose subscription is expiring. Send a week after email 1.

**Subject:** {name}, your DigitalFlyer page comes down on {date}

Good day {name},

Your subscription runs out on {date}, and when it does your page at {page_url}
comes down and you drop off the marketplace.

What you keep by renewing:

- Your page stays live at the same address, so anything you have shared still
  works
- You stay on the marketplace where people search by trade and area
- Your reviews stay where customers can see them
- KatisoBiz stays included

{button: Renew now}

One thing worth knowing: paying for the year works out cheaper per month than
paying monthly. Both options are on the renewal page.

If something is not working for you, reply to this and tell me. I would rather
fix it than lose you.

Regards,
Dewald
DigitalFlyer SA

### Email notes

- `{page_url}` must be the member's real page address, not the marketplace.
- `{date}` in plain South African format, 14 August 2026, not 2026-08-14.
- The activation button goes to the activation control in the dashboard, not
  straight into KatisoBiz, so the member consents by pressing it.
- Do not send email 1 to anyone who already has a linked KatisoBiz account.
- Do not send email 2 to anyone who has already renewed.

---

## Out of scope

- Any change to prices or plan entitlements
- Backfilling KatisoBiz accounts for existing Growth members
- Internal renaming of BizUp files, tables, folders or enum values
- Deleting any member page
- Any email other than the two above
- The WhatsApp inbox, the Board, the verified badge, the Members' Room
- Payment provider configuration

## What you decide, and what needs Dewald

**Decide yourself:** the new public route names, how redirects are implemented,
where each prompt sits on its screen, the quote-count threshold for job 6, how
the dismissal timer is stored, email sending mechanics, and all schema
decisions.

**Stop and ask Dewald:** which duplicate page to keep in each pair, the final
copy of the activation control, both nudges and the website question, and
anything that would change what a member currently pays or receives. Email copy
is already approved and does not need re-approval.

**Never without Dewald:** deleting files, force pushing, secrets or environment
variables, Vercel settings, production data, payment credentials.

Three minute rule applies. Carry on with what you can and raise it in the
report.

## Acceptance criteria

1. A new Growth signup with no existing KatisoBiz account results in **no**
   KatisoBiz account being created
2. A new Growth signup whose phone or login matches an existing KatisoBiz
   account is still linked automatically
3. The activation button creates and links a free KatisoBiz account, and taking
   the member into it works
4. A member with a linked account never sees the activation button
5. Activation is timestamped and countable in admin
6. No public URL under `/bizup/` remains reachable as the primary path
7. Every old public `/bizup/` URL permanently redirects to its new equivalent,
   verified by request, not by reading the config
8. The review capture link sent to a customer carries the new path
9. Sitemap, canonical tags and Open Graph URLs reflect the new paths
10. The website question appears once, stores the answer, and does not reappear
    after being answered or dismissed
11. The review wedge appears only for members with at least one review and no
    Growth account
12. The quote nudge uses only that member's own real figures, and appears only
    above the chosen threshold
13. Both nudges dismiss and stay dismissed for at least 30 days
14. No existing member page is deleted, and no duplicate is redirected before
    Dewald picks
15. Email 1 is not sent before the activation button is live
16. No member receives both emails on the same day
17. Nothing listed under Out of scope has changed

## How to report back

One report at the end. Cover:

1. What changed, by file, in plain language
2. The Vercel preview URL
3. Every route moved, old path and new path, in a table
4. Everywhere the old path was found outside routing, and whether it was updated
5. Which of each duplicate pair has real content, and your recommendation
6. Any other duplicate found, listed and not acted on
7. All prompt and button copy, quoted in full, for approval
8. The quote threshold you chose and why
9. How many members currently qualify to see each nudge
10. How many emails were sent, opens if measurable, and how many members
    activated KatisoBiz off the back of email 1
11. Anything found and deliberately not fixed, and why
12. Anything in this brief that turned out to be wrong about how the code
    actually works
