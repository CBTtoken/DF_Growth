# KatisoBiz Jobs

**Parked spec. Written 6 August 2026. Not a handoff. Do not give this to Claude
Code as it stands.**

**Trigger to build: the Board moderation sprint shipped and merged.**

---

## What it is

A jobs section on its own subdomain under KatisoBiz. Two sides. People looking
for work, and businesses with a vacancy.

It is the widest funnel in the portfolio. Job search volume in South Africa is
larger than everything else DigitalFlyer is chasing put together, and every
vacancy page and every anonymous candidate page is indexable by Google.

**Who converts.** Employers, not job seekers. An employer with a vacancy is by
definition a real trading business, which is exactly the Growth and KatisoBiz
customer. Job seekers are the traffic and the reason the thing works, and they
are not the revenue. Plan the numbers on the employer side only.

**The gateway principle.** Each product is a door. Most people walk through one
and stay there. Some cross over later. Nothing gets blocked because a different
door is unfinished, and nothing assumes a member arrived through any particular
one.

---

## The CV builder is the product

Everything else is the shop window. A free tool that turns "I worked at a
warehouse for three years" into a document that does not look homemade is worth
more to that person than any listing, and it is the same shape as KatisoBiz: a
document, built on a phone, in a few minutes, by someone who would never open
Word.

- Built as a conversation, one question at a time, tap answers wherever a
  question has known options. Not a form.
- **No file uploads.** An uploaded PDF cannot be searched, cannot be matched and
  cannot power alerts, which defeats the point of having a database, and it
  creates a storage and retention problem for nothing. Someone with an existing
  CV types from it and gets back something structured and better looking.
- The CV belongs to the person. Downloadable, theirs, whether or not they are
  listed anywhere.
- Photos downscaled on upload, originals discarded immediately.

**Voice notes are cut.** Decided 6 August. Worth revisiting only if typing turns
out to be where people abandon, since the format removes literacy and language
barriers and dropping it costs some of the people the tool would help most.

---

## Three tiers of visibility

The line is not secrecy. Names and numbers are already public. The distinction
is aggregation: individually public facts become sensitive when assembled into a
structured record that can be pulled a thousand times.

**Anonymous browse, the Google-indexable layer.** Role or trade, skills, years
of experience, suburb or town, availability. No name, no photo, no contact of
any kind. Reads as "qualified electrician, eight years, Boksburg, available
now."

**Logged-in employer.** The full record. Name, contact, full history. **Every
view logged against the employer account that made it.**

**Never stored at all.** ID numbers and bank details. Something never held
cannot leak, cannot be scraped, and needs no retention policy. Strip them
automatically if typed, and show one line where they would have been entered: we
do not ask for your ID number, and no real employer needs it before an
interview. That line protects the person and teaches them to be suspicious of
anyone who does ask, which is the most common scam opener in the country.

**The rule in one sentence:** consent to be seen by employers is not consent to
be published to the world.

**The asymmetry is deliberate.** A business's contact details are business
information. Employer name, trade, area and contact are fully public and fully
indexed. Job seekers are protected, employers are exposed.

---

## Anti-scraping

You cannot prevent scraping. Anything a browser renders, a script can take. Make
bulk collection expensive and visible instead.

- Personal information never appears in a page an unauthenticated request can
  fetch. **This is a portfolio-wide standard, not a jobs rule.** The Board should
  work the same way.
- Full records behind a logged-in employer account only.
- Rate limits per account, not per IP. IPs are free, accounts are not.
- No public API, and no endpoint that returns a list of full records.
- Every full-record view logged. You will not stop the first scrape. You will
  see the account that pulled 400 records in an hour and kill it.
- Bulk collection ends the account, said plainly in the terms.

---

## Employers

- Registration is one step. Cell number and business name. Free forever, no
  verification wall before they can look.
- **Never put friction on the scarce side.** Job seekers are abundant, employers
  are not.
- The gate on full records exists as a protection control, not a paywall, and it
  should say so on the page.

**Pricing.** Free unlimited job posts for Growth and KatisoBiz members. R45 a
post for everyone else. Charging members would reduce the supply of the scarce
side. Charging non-members turns every employer who wants to post twice into a
reason to join, which makes the jobs board a funnel into the two products that
make money rather than a tenth venture.

**Verified employer, the thing nobody can copy.** Gumtree and Facebook are full
of fake vacancies because anyone can post one. A badge derived from real
KatisoBiz trading activity, invoices actually issued this month, is a claim no
competitor can make and no scammer can fake.

**Vouching, the north star version.** A member confirms a worker did real work
for them. Tony at Jetting Worx confirms three months of drain work. Members
vouching for each other in the highest stakes context there is. Second phase,
not launch.

---

## Matching

**Alerts, not scoring.** A job seeker who ticked electrician and Boksburg is
told when an electrician job appears in Boksburg. An employer is told when
somebody matching their vacancy lists.

**No match score, ever.** On sparse data it is wrong often, telling a person
they are a 62% match for a job they could do harms them for nothing, and scored
matching concentrates on the same few candidates so everybody else has no reason
to stay. Rotate among everyone eligible, same enforced-shuffle pattern used
everywhere else in the portfolio.

---

## Safety rules, built in from day one

- **No employer may request payment from a candidate for anything.** Training,
  uniform, transport, placement, admin. Auto-hold on any post mentioning it. The
  advance-fee job scam is the most common in the country and it will arrive the
  week you launch.
- No ID numbers, no bank details, anywhere.
- Report button on every listing, feeding the same moderation queue as the
  Board.
- Structural moderation over filtering, same as the Board: both post types are
  forms with required fields, not free text boxes.

---

## Facebook posting

**Post the role, never the person.** Auto-posting "new person looking for a job"
with a name attached publishes a vulnerable person's details to 15,700
strangers, and job seekers are the most targeted group by scammers in South
Africa. A tick box does not change who did the publishing.

Post instead: qualified electrician, eight years, Boksburg, available now, with
a link. No name, no photo, no number. It reads as market news rather than as a
plea, and it drives the click to a page where the employer has to identify
themselves. Same traffic, none of the harm.

Vacancies can be posted in full, since those are businesses.

Whether this needs its own Facebook page is open.

---

## Expiry and retention

**Retention does not wait for the Board.** The Board Phase 3 is blocked because
three contradictory positions already sit in the record and have to be
reconciled. Jobs has no history and no contradiction. One clean policy written
from scratch, cleanup built in from day one.

**Not a gate. A build requirement, in the same sprint.** The policy exists
before the first CV is stored.

- Listings run 30 days, one-tap renew, then automatic purge.
- The person's own CV stays in their free account until they delete it.
- Deletions logged.

Split the record the same way as the WhatsApp inbox: the listing is on a clock,
and a stripped line with role, area, date and outcome survives indefinitely as
demand data with nothing identifying on it.

---

## Cost, and where it actually bites

Traffic is the cheap part. A jobs board is mostly server-rendered pages that
cache well, and Vercel and Supabase will absorb far more than expected before
the bill moves. Three things bite instead:

- **AI cost in the CV builder scales with unemployment, not with revenue.**
  Every free user costs an API call. Cap regenerations per CV. Never re-run a
  model to display something already generated. Store the output, not the
  process.
- **Storage.** Text is nothing, media is not. No CV file uploads, photos
  downscaled with originals discarded.
- **Search.** "Electricians in Boksburg" across a large table, run by every
  employer several times a day, is the query that gets quietly expensive. Index
  it properly on day one, not after it hurts.

---

## Open, to settle before the handoff is written

1. The subdomain and the name.
2. Whether jobs gets its own Facebook page or rides the DigitalFlyer SA page.
3. Which industry and skill taxonomy the database is organised by. This decides
   whether search and alerts work at all, and it is hard to change later.
4. Whether R45 is once-off per post or carries a duration.
5. Whether vouching lands in phase one or phase two.
6. Who moderates it when volume exceeds one person, and what the plan is before
   that arrives rather than after.

---

## The honest risk

This is the largest traffic opportunity in the portfolio and the thing most
likely to eat the company. It has a different user base from every other
product, a heavier moderation load than the Board, and a failure mode that hurts
vulnerable people rather than annoying them.

Build it. Build it carefully.
