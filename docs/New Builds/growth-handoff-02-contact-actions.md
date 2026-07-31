# Claude Code Handoff 02: Growth contact actions, lead tracking and stock image removal

## Context

DigitalFlyer Growth is a self-serve platform for South African one-person businesses. Members complete an onboarding flow and the system generates a public landing page at `growth.digitalflyersa.co.za/{clientSlug}`.

Stack: Next.js on Vercel, Supabase for data and storage, Sentry for error reporting. Member page route is `/[clientSlug]`.

**This handoff runs after Handoff 01 is merged.** Do not start until those fixes are live.

Today, a member page has one action: a lead form. Contact details are hidden until the visitor submits it. The reasoning was lead tracking. The problem is that it taxes conversion hardest where the money is. A customer with a burst pipe at eleven at night does not fill in a form to reveal a phone number, they go back and phone the next business.

This handoff replaces the gate with three visible actions and tracks the tap rather than gating the reveal. The measurement goal is preserved. The conversion tax is removed.

It also removes stock photography from member pages, which is doing active harm to member credibility.

## Goal

A visitor who lands on a member page can reach that member in one tap, by whichever method suits them, and the member can see that the tap came from DigitalFlyer.

## What to build

### A. Three contact actions

Replace the contact gate. Contact details are public. No reveal, no flip, no form submission required to see a number.

Three actions, all visible:

1. **WhatsApp**, primary and visually dominant. A `wa.me` link to the member's WhatsApp number with a pre-filled message.
2. **Call**, secondary but present. A `tel:` link to the member's phone number.
3. **The form**, kept, as the third option for non-urgent enquiries and after hours.

Placement: WhatsApp and Call appear in the hero, above the fold, and again in the contact section at the foot of the page. The form stays where it is.

Also render the phone number as selectable text next to the buttons. On desktop a `tel:` link often does nothing useful, and a visitor needs to be able to read and copy the number.

The pre-filled WhatsApp message should be short, plainly worded, and easy for the customer to edit or delete. It must name DigitalFlyer so the member can see where the enquiry came from, and carry a short reference code for that member so enquiries can be matched to the page later. Do not make the customer feel they are sending a form.

House style applies to any customer-facing copy: plain language, no jargon, no em dashes, "Good day" rather than "Hi there".

### B. Numbers at signup and in the dashboard

Phone number and WhatsApp number become required member data.

- Both fields appear at onboarding and in the member dashboard.
- Entering the phone number auto-populates the WhatsApp field with the same value, visibly, so the member can see it and correct it if the numbers differ.
- **Exception:** if the number entered is a South African landline, do not auto-populate. A landline cannot receive WhatsApp. Ask for the WhatsApp number separately and keep it required.
- Normalise on save. Members will enter `082 123 4567`, `0821234567` and `+27 82 123 4567` and mean the same thing. Store one canonical format. Both `tel:` and `wa.me` links fail silently on malformed numbers, so validate before saving and tell the member if it does not look like a valid South African number.
- Show a short note under the fields, framed as the benefit rather than as a rule. Along the lines of: this is the number customers will use to reach you, and it appears on your page. Make it explicit that the number will be publicly visible, so members are consenting knowingly.

**Setting:** one tick, phrased as hiding rather than showing. Along the lines of "Hide my call button and use WhatsApp only." Default is off, meaning both buttons render. This is deliberate. Most members will never open this setting, and if the default were WhatsApp only, most pages would ship without a call button.

**Existing members:** many have no number on record. Their pages keep the form only, with no call or WhatsApp buttons, until a number is added. Never render a dead button. Prompt these members in the dashboard to add their number, explaining what it unlocks.

### C. Lead event tracking

Record an event for each of the three actions: call tap, WhatsApp tap, form submission.

Store enough to be useful and no more: member, action type, timestamp, referring source, and a coarse device type. Do not retain visitor IP addresses or any other personal information beyond what the member's own form already collects. POPIA applies here and the safe position is to collect the minimum.

Deduplicate obvious double-taps within a short window so the counts are not inflated by accident.

Understand the limitation and do not try to engineer around it: a tap is an intention, not a completed job. Some taps will be misdials and curiosity. That is acceptable. An inflated count on a much larger volume is worth more than an accurate count on a strangled one.

### D. Member-facing lead counter

In the member dashboard, show this month's activity broken out by the three actions, with a simple comparison to the previous month.

Plain language. This is the number that carries the renewal conversation, so it should be the first thing a member sees when they log in, and it should be legible to someone who is not comfortable with dashboards.

### E. Remove stock photography

The generator currently falls back to Pexels stock images when a member has no photograph. Observed live on `/cape-town-butler` and `/nefeli-property-maintenance`.

Remove this entirely. Delete the integration, do not leave it behind a flag.

Replace it with a generated typographic hero: the member's business name, their trade, and their suburb, set at large size on a solid background colour, with no image at all. This should read as a deliberate design choice, which it is. Do not substitute gradients, shadows, patterns or other decorative effects. Restraint is the point.

For the background colour: derive it from the member's logo where one exists. Where none exists, assign deterministically from a small fixed set based on the member's slug, so the colour is stable across renders rather than changing on each load. A proper palette system arrives in Handoff 04 and will replace this.

## Out of scope

- Image uploads, EXIF handling, resizing, focal points, quality rejection. These are Handoff 03.
- Generated Open Graph share cards. Handoff 03.
- The twelve-section library, four compositions, colour palettes, type pairings. Handoff 04.
- The offers and packages box, including its existing flip behaviour. Leave it exactly as it is.
- Any change to the marketplace, pricing or billing.
- Any use of the Meta WhatsApp Business API. `wa.me` links are free and require no API. Do not introduce a paid messaging path.

## Decisions

**The agent decides:** reference code format, event storage schema, deduplication window, button component structure, validation approach for South African numbers, and the exact wording of on-page and dashboard copy within the house style above.

**Needs Dewald, stop and ask rather than guessing:**
- Anything that would change what the member is charged or which tier gets which feature
- Any proposal to store more visitor data than described in section C
- Any suggestion to route messaging through the Meta API rather than `wa.me`

## Working method

Work on a branch. Do not push to production. Deploy to a Vercel preview and give Dewald the preview URL so he can compare against live before merge.

Existing member pages are live businesses with real customers. If any change risks breaking an existing page, leave it and raise it in the report.

## Acceptance criteria

Test against all eight live member pages:

`/dr-gerhard-bothma-pty-ltd`, `/mikeys-handyman`, `/cape-town-butler`, `/experto-bdm-services`, `/nefeli-property-maintenance`, `/tats-by-mags`, `/simply-water-boksburg`, `/seven-passes-initiative`

1. No contact detail is hidden behind a form submission anywhere
2. Members with a number on record show WhatsApp and Call buttons in the hero and in the contact section
3. Members with no number on record show the form only, with no buttons rendered
4. The phone number appears as selectable text as well as a button
5. Tapping WhatsApp opens a conversation with a short pre-filled message naming DigitalFlyer and carrying the member's reference code
6. `tel:` and `wa.me` links work from an actual mobile handset, not only in a desktop browser
7. Entering a mobile number at onboarding auto-populates the WhatsApp field; entering a landline does not
8. The hide-call-button setting defaults to off, and switching it on removes only the call button
9. All three actions record an event, and the same tap recorded twice in quick succession counts once
10. The dashboard shows this month's counts by action type against last month
11. No Pexels or other stock image appears on any member page, and no stock integration remains in the codebase
12. Members with no photograph get a typographic hero with a stable background colour
13. Nothing listed under Out of scope has changed

## How to report back

One report at the end. Cover:

1. What changed, by file, in plain language
2. The Vercel preview URL
3. The pre-filled WhatsApp message wording you settled on, quoted in full, so Dewald can approve or change it
4. How many existing members have no usable phone number and will therefore ship with the form only
5. How many existing members have a landline stored where a mobile is needed
6. Any member records where the stored number failed validation, listed, not fixed
7. Anything found and deliberately not fixed, and why
8. Anything in this brief that turned out to be wrong about how the code actually works
