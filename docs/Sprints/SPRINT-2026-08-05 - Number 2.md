# Sprint handoff: tracking and measurement audit

**DONE, both parts.** Marked 8 August 2026 by the session that added this
file to git.

Part 1, the audit, is written up in `docs/Report_TrackingAudit.md`, read
against main as deployed rather than against a branch, as this handoff
required. Part 2, the fixes it found, needed Dewald's specific go-ahead and
got it: GA4 cross-domain linking was applied, and the Growth `Subscribe`
gap is closed, with the Paystack webhook now sending Meta a server-side
`Subscribe` keyed on the Paystack reference and `/pricing/success` giving
the browser pixel the same id, so a sale counts once instead of twice.

One item in the report is Dewald's alone and cannot be done from here:
confirming both domains are verified properties in Search Console.

**For Claude Code. Start only when the 5 August sprint is complete and
reported.**

## Start a new session with this

> Read `SPRINT-tracking-audit.md` in the sprint folder. The previous sprint is
> complete and its report is available. This is an audit first and a build
> second: find out what is actually wired before changing anything, and report
> the findings even if nothing gets fixed in this session. Same permissions as
> the previous sprint: run continuously, stop only for the deny list.

---

## Permissions

Identical to the previous sprint. Run continuously without asking. Stop only
for: deleting anything, force pushing or pushing to main, touching `.env.local`
or any secret, changing Vercel environment variables, writing to production
data, or touching Paystack, Resend or Meta credentials and webhooks.

Anything Dewald must do himself gets collected into one block of numbered
plain-language steps at the end, not asked mid-stream.

---

## Context

Growth and KatisoBiz are two products on two domains. Advertising, audience
building and any claim about what a member's page produced all depend on
tracking being correct, and nobody has verified that it is.

Three things make this worth doing now rather than later.

Audiences cannot be backdated. Every day of correct tracking is an asset that
compounds, and every day of broken tracking is permanently lost.

The two products cannot currently be linked in our own data, because
`growth_client_id` is null on every account. But Meta and Google match people
on their own identity rather than on ours, so correct tracking can answer "did
this person use both" long before the product can.

And a campaign is about to be run for a member, plus one for ourselves. Running
either on unverified tracking means the results cannot be trusted.

## Goal

Know exactly what is firing, where, and into whose account. Fix what is broken.
Do not add new tools.

---

## Part 1: the audit, and this comes first

Report findings before changing anything. If the audit consumes the session,
that is an acceptable outcome.

### Meta

- Which Pixel IDs exist, and which pages carry which.
- **Whose pixel is on member pages?** The product brief says member pages carry
  Meta Pixel and Conversions API so a member running ads can see which ads
  produced enquiries. If that is the member's own pixel and not ours, then
  traffic to 34 member pages is invisible to DigitalFlyer. Establish which it
  is. If both can coexist, say so.
- Is the Conversions API actually sending, or is it configured and dormant?
- If both browser and server events fire, is `event_id` set so Meta
  deduplicates? Without it, every conversion is counted twice and every cost
  figure is wrong by half.
- Which events fire, and are they named consistently between the two products?
- Does katisobiz.co.za carry any pixel at all?

### Google

- Is Google Analytics installed, on which domains, and which property?
- Is cross-domain measurement configured between
  growth.digitalflyersa.co.za and katisobiz.co.za? Without it, a person moving
  between them is counted as two people and the referral shows as the other
  domain rather than the true source.
- Is Search Console verified for both domains?
- Is Google Ads present at all, or nothing?

### Consistency

- Do UTM parameters survive across the two domains, or are they dropped on the
  hop?
- The legacy mailer tags links with `utm_source=legacy-mailer`. Is anything
  actually recording those arrivals?
- Are events being recorded for the things that matter commercially: a trial
  started, a subscription paid, a lead form submitted, a KatisoBiz signup, a
  first document issued?

---

## Part 2: fix, once the audit is reported

Priority order. Do not proceed past the audit without Dewald seeing it.

1. **One tracking plan, written down.** A short list of the events that matter
   with one agreed name for each, used identically on both domains. This
   document is the deliverable, not the code.
2. **Deduplication**, if browser and server events are double counting.
3. **Cross-domain measurement** between the two domains for Google, and the
   same pixel behaviour for Meta, so one person is one person.
4. **KatisoBiz coverage**, if it is currently untracked.
5. **Our own visibility on member pages**, if the audit shows we have none.
   Members keep their own pixel. We are not replacing it, we are adding ours
   alongside if that is possible.

---

## Part 3: audiences, no campaigns

Set up Meta Custom Audiences built from our own data collection, not from
uploaded lists:

- All visitors to growth.digitalflyersa.co.za
- All visitors to katisobiz.co.za
- Visitors to any member page
- Page and profile engagement

These build in the background and cost nothing. Create them now even though no
campaign is running, because they cannot be backdated.

**Uploaded lists are out of scope for this build**, but one rule must be
written into whatever tooling is prepared for them: **anybody on
`marketing_suppressions` is excluded from every audience, always, checked at
build time.** Someone who unsubscribed from email has asked us to stop, and
advertising to them anyway is the same request ignored on a different channel.

---

## Out of scope

- No new analytics tools, tag managers or third-party trackers.
- No campaigns created, funded or launched.
- No uploading of any customer or member list.
- No changes to member pages beyond tracking, if tracking changes are needed at
  all.
- No work on the Board, the page poster, or anything outside Growth and
  KatisoBiz.

---

## Needs Dewald

- Approval of the audit findings before any fix is applied.
- Anything requiring access to a Meta, Google or Vercel account he owns, given
  as numbered steps.
- Any decision about placing our pixel on member pages, since that touches what
  members were told.

---

## Acceptance criteria

1. A written audit exists covering every question in Part 1, with a plain answer
   to each, including the ones where the answer is "nothing is set up".
2. A one page tracking plan exists listing the events that matter and their
   agreed names.
3. No conversion is double counted.
4. A person moving between the two domains is not counted as two people, or the
   report says plainly why that could not be achieved.
5. The four audiences exist and are collecting.
6. No campaign was created and no list was uploaded.
7. House style holds: no em dashes, "marketplace" never "directory" or
   "listing", Rand, South African English.

---

## Report back

One report at the end. It must contain:

- The audit answers, in plain language a non-technical reader can act on.
- Whose pixel is on member pages, and whether we can see that traffic.
- What was double counted, and by how much, if anything.
- What is now being tracked that was not before.
- Anything found that contradicts what this document assumes.
- Any numbered steps Dewald still needs to action.
