# HANDOFF: WHATSAPP LEAD SWITCHBOARD (V1)

**Working name only. Not a brand name. Do not put this string in front of a user.**

Date: 29 July 2026. **Amended same day** to add first-message routing, stored sales and support answers, and the unmet demand table.
Owner: Dewald Rosema
Build executor: Claude Code

---

## 1. CONTEXT

In South Africa, most trade work is found by asking a WhatsApp group or a local Facebook group. "Does anyone know a good plumber in Boksburg?" That message gets forwarded, someone shares a number, and that is the whole discovery mechanism. It does not happen on Google.

DigitalFlyer has been building the answer as a marketplace people have to find. Marketplaces of this kind fail on traffic, not on quality of listing. This build inverts that. Instead of a place people must discover, it is a single WhatsApp number that can be posted into a group, forwarded, and screenshotted.

Two existing assets make this cheap:

- **Growth** already holds verified provider listings with area and category data, public pages, and reviews.
- **KatisoBiz** already lets a provider build a quote on a phone and send it from his own number.

The economics are the reason this is worth building now. Meta bills per message since 1 July 2025, but a conversation the customer starts is free for 24 hours, and every customer reply reopens that window. Designed correctly, this runs at close to zero marginal cost.

---

## 2. GOAL

A member of the public sends one WhatsApp message describing a job. Within minutes, up to three ranked, verified providers in that suburb have been notified. The client receives the names of who was notified, with a link to each provider's page. The system then tracks whether contact happened, whether the job completed, and collects a review that lands on the provider's public page.

Success is a closed loop: lead in, provider notified, contact confirmed, job invoiced, review published, provider ranks better for the next lead.

The same number also answers two other kinds of message: people asking what KatisoBiz or Growth is and what it costs, and existing members with a problem. All three are inbound, so all three are free. A first-message router decides which is which.

Where a request cannot be matched at all, because there is no provider in that trade or that area, the request is logged rather than discarded. That log is a recruitment map.

---

## 3. WHAT TO BUILD

### 3.0 First message routing

Any inbound message to the number gets a reply with **three tap buttons**. Free-form, no template, no charge.

1. **I need someone for a job** goes to client intake, 3.1 onward.
2. **Tell me about KatisoBiz or Growth** goes to stored sales answers, 3.10.
3. **I am a member and need help** goes to stored support answers, 3.10.

Design notes that are not optional:

- **Do not use a model to read intent.** Buttons are one tap, they cannot misroute, and every conversation labels itself, which builds the answer corpus for free. Intent reading can be added later against real messages.
- **A member with a problem must never fall into lead intake.** If routing is ambiguous at any point, default to escalation, never to intake. The worst outcome in this build is an angry paying customer being asked which suburb he is in.
- The router runs on the first message of a new conversation only. Returning within an open window continues where the person was.

### 3.1 Client intake, on WhatsApp

- Inbound message to the platform WhatsApp number opens a lead.
- Bot collects three things in short exchanges: suburb, what the job is, how urgent.
- Bot immediately acknowledges: it will notify providers in the area and send back who was contacted.
- All of this sits inside the free customer-initiated window. Nothing here may use a paid template.

### 3.2 Matching and dispatch

- Match on trade category and suburb-level area from the Growth listing data.
- Rank eligible providers (see 3.6). Dispatch in waves.
- **Wave 1: top 3.** If fewer than 2 have accepted within 15 minutes, **Wave 2: next 2.** Then continue in twos until the ranked pool is exhausted.
- **Provider notification is in-app, not WhatsApp.** The Growth web app notification capability was built recently and is the delivery mechanism. This keeps dispatch at zero cost. Verify it works on a provider's phone before relying on it.
- Leads dispatch immediately at any hour. Quiet hours do not apply to leads.

### 3.3 Client confirmation message

Once a wave has accepted, send the client, inside the free window:

- The names of the providers notified.
- For each provider: their Growth page link if they have one, or the Find a Trader listing link if they do not.
- A line saying one of them will be in touch shortly.

**Do not soften the difference between a Growth page and a bare Find a Trader entry.** A provider without a page appearing next to two who have one is the intended effect.

### 3.4 The 90 minute check-in

- 90 minutes after dispatch, message the client with **two tap buttons**, not free text: "Yes, someone contacted me" and "Not yet".
- Buttons matter for two reasons: one tap is not a behaviour change, and any reply reopens the free 24-hour window.
- **"Not yet"** triggers the next wave immediately, and tells the client the request is being sent wider. Never retry silently.
- **"Yes"** returns a short thank you and nothing else. Get out of the way.
- If a check-in would fall inside quiet hours, hold it until 07:00.

### 3.5 Completion, review and nudges

- **The invoice is the completion signal.** When a provider issues an invoice through KatisoBiz against a lead-originated job, that job is complete. Trigger the review ask on that event, not on a timer.
- Reviews land on the provider's Growth page through the existing review mechanism.
- **Fallback review ask, by category:**
  - Urgent trades (plumbing, electrical, locksmith, towing, appliance repair and similar): if no invoice within 48 hours, send one review ask.
  - Scheduled work (painting, renovation, solar, landscaping and similar): no automatic fallback. Wait for the invoice however long it takes.
- **Invoice nudge to the provider.** If a provider accepted a lead and has not invoiced it, nudge **in-app first**, since no free WhatsApp window is open with him. Escalate to WhatsApp only if the in-app nudge is ignored.
  - Frame it as his money, not as record keeping. Reference the specific job.
  - Three response buttons: **Invoice it now**, **Still in progress**, **Did not go ahead**.
  - Same category split as above: 48 hours for urgent trades, no automatic nudge for scheduled work.

### 3.6 Ranking

Record and rank on:

- **Response time to accept.** Free to capture and the most predictive signal available.
- **Conversion**, derived from the client check-in response and the invoice event.
- **Review score.**

Rules that are not negotiable:

- **Rating gates eligibility. Growth membership decides order within the eligible pool.** A paying member must never outrank a better-rated provider into a client's hands. Growth preference buys a first-wave slot, not a rating override.
- **"Did not go ahead" is completely neutral in ranking.** Losing a job is normal business. If it costs rank, providers will lie or stop responding.
- **Accepting a lead and then going silent must cost rank.** Hoarding leads is the one behaviour that will poison this system.
- The ranking rules are published to providers in plain language. This is deliberate: providers who understand it will chase reviews and response time on their own.

### 3.7 No-acceptance path

If every wave is exhausted with no acceptance, tell the client inside the hour. Straight, no excuses, with a short apology, the Find a Trader link, and the marketplace link so they can look themselves.

A silent number is a dead number. People forgive a straight answer.

### 3.8 Data ownership

- **Growth owns the lead record.** Matching depends on listing, category, area and rating, which all live in Growth.
- KatisoBiz reads the lead and writes the invoice event back against it.
- One system owns lead status. Do not let both write it.

### 3.9 Matching data check

Before anything else, verify the Growth listing data can actually support matching:

- Does every listing carry a trade category from a controlled list?
- Is the area field suburb-level, not province or city?

If either is thin, fixing it is the first task in this sprint, not a follow-up. The rest of the build is worthless without it.

### 3.10 Stored sales and support answers

Doors 2 and 3 from the router are served from a stored answer set, not generated.

- Answers are written by Dewald, held as editable records, and matched to a small set of common questions. Show the closest few as tap options rather than making the person phrase a question.
- **Price, VAT and SARS answers are never generated. Stored responses only.** This is a standing platform rule and it does not bend for this build.
- Anything without a stored answer escalates to Dewald rather than being guessed at. Escalation reaches him through any channel, or the person is given the direct human support number.
- The commitment is a reply within 24 hours, always. Note that this keeps the free window open, so escalated answers cost nothing as long as they land inside a day.
- Log every question asked, whether it was answered from the set or escalated. Unanswered questions are the input to the next version of the answer set.

### 3.11 Unmet demand log

When a job request cannot be matched, because there is no provider in that trade, that area, or nobody is eligible:

- Tell the client honestly, offer marketplace suggestions where any exist even if imperfect, and give the Find a Trader link. Never a bare dead end. A number that says it cannot help stops getting forwarded.
- **Record the request.** Trade, suburb, timestamp, and whether any partial match existed.
- Surface it in the admin back office as a simple table: trade by area, counted, most frequent first.

This table is the recruitment map. Eleven unmatched locksmith requests in Polokwane in a month is a sales conversation with a real number attached, and it is the cheapest lead generation in the business. Build the table plainly. No dashboard, no charts.

---

## 4. COST MODEL THE BUILD MUST RESPECT

- Customer-initiated messages, and all replies within 24 hours, are free. Every client reply reopens the window.
- Only messages sent outside that window need a pre-approved template and are billed.
- Utility templates to South African numbers run roughly R0.15 to R0.40. Marketing templates run roughly R0.90 to R1.80.
- **Nothing in this build may use a marketing template.**
- Expected paid messages per lead: zero or one. The review ask is the only likely charge.
- Direct to Meta Cloud API. No BSP, no third party, no monthly intermediary fee. This is a standing platform rule.

*Rates are from published July 2026 sources and Meta revises them quarterly. Verify against Meta's own pricing documentation before finalising.*

---

## 5. OUT OF SCOPE

- **Voice note intake.** Wanted later, not in v1.
- **Forcing quotes through KatisoBiz.** Many jobs cannot be priced without a site visit. Providers contact clients directly, by phone or WhatsApp, however they choose.
- **Pay now on the invoice.** Adjacent and valuable, separate build.
- **Any outbound marketing, broadcast or nudge campaign.**
- **Generated answers of any kind.** Sales and support are stored responses only, per 3.10.
- **Intent classification by model.** Buttons only in v1.
- **The two earlier WhatsApp codebases** (`DF-WhatsApp`, 7 July, and the 12 July Growth build). Same stack and same concept, new direction. Do not port their code or their copy. Build A's funnel sells a product that no longer exists.
- **Any third-party messaging provider.**
- Payments, escrow, or holding client funds of any kind.

---

## 6. WHAT THE AGENT DECIDES

- Data model and schema for leads, waves, acceptances and status. All schema changes as migration files in the repository.
- How the in-app notification is delivered and how delivery is confirmed.
- Wave timing implementation, queueing and scheduled job mechanism.
- How the ranking score is calculated and stored, given the inputs above.
- Interface for the provider lead view and accept action.
- Error handling, retries and logging.

## 7. WHAT NEEDS DEWALD

1. **Which WhatsApp number this runs on.** Two numbers are owned. One is +27 63 005 8555, pending verification into the new Meta business space. The support and sales bot is also planned for a number. Three doors on one number is a design problem. Recommend the lead switchboard takes the second number, because its audience is the general public rather than members. **This decision blocks launch, not build.**
2. **The trade category list, split into urgent and scheduled.** Drives the 48 hour logic throughout.
3. **Meta template approval.** Every message sent outside a free window needs a pre-approved template, and approval takes time. Write and submit these now, in parallel with the build, not at the end.
4. **Client-facing copy approval** for intake, confirmation, check-in, no-acceptance and review ask.
5. **The stored sales and support answer set.** Nobody else can write these. Start with the ten questions actually asked most often rather than a complete set, since 3.10 logs the gaps and tells you what to add next.
6. **Ranking weights** across response time, conversion and review score.
7. **Confirmation that the in-app notification capability is live** and reaches a provider's phone reliably.

---

## 8. ACCEPTANCE CRITERIA

1. A message from an unknown number opens a lead, collects suburb, job and urgency, and returns an acknowledgement, with no paid template used.
2. Providers are matched by trade category and suburb, ranked, and dispatched in waves of 3 then 2, with a 15 minute wave interval and a 2-acceptance threshold.
3. Provider notifications arrive in-app and are confirmed received.
4. The client receives provider names with a Growth page link where one exists and a Find a Trader link where it does not.
5. The 90 minute check-in sends two tap buttons, and each answer routes correctly: "Not yet" triggers the next wave and informs the client, "Yes" closes politely.
6. Check-ins and review asks respect quiet hours between 20:00 and 07:00. Lead dispatch does not.
7. An invoice issued in KatisoBiz against a lead marks that lead complete and triggers the review ask.
8. Urgent-category leads with no invoice at 48 hours get one review ask. Scheduled-category leads get none.
9. An accepted lead with no invoice gets an in-app nudge with three buttons, escalating to WhatsApp only after the in-app nudge is ignored.
10. "Did not go ahead" leaves the ranking score unchanged. Silence after acceptance reduces it.
11. Exhausting all waves with no acceptance produces the apology message with both links inside one hour.
12. Every paid message in the system is a utility template. No marketing template exists anywhere in the build.
13. Growth is the only system writing lead status.
14. A new conversation receives three tap buttons and each routes correctly. No model reads intent anywhere in the build.
15. A member support question never enters lead intake. Ambiguous routing escalates rather than guessing.
16. Sales and support answers are served from stored records only. No price, VAT or SARS answer is generated anywhere.
17. A question with no stored answer escalates to Dewald and is logged.
18. An unmatched job request produces an honest reply with marketplace suggestions where they exist plus the Find a Trader link, and writes a row to the unmet demand table.
19. The unmet demand table is visible in the admin back office, grouped by trade and area, ordered by count.

---

## 9. HOW TO REPORT BACK

One consolidated report at the end. No check-ins during the build.

The report covers: what was built, what the matching data check found and what had to be fixed, any acceptance criterion not met and why, every schema migration added, exactly which messages in the flow are paid templates and which are free, and any decision made that this document did not cover.

---

## 10. MASTER REFERENCE UPDATES ARISING

To be written into the master reference when this is handed over:

- **§5.1 Growth.** In-app notification capability now exists, built recently, not previously recorded. Find a Trader listing link is issued to every provider, also not previously recorded.
- **§5.10 WhatsApp.** Rewrite. The support and sales layer is no longer a separate build. It is doors 2 and 3 behind a single first-message router, with public lead intake as door 1. The two earlier codebases stay out of scope. The old "how does one number tell support from sales" question is answered: three buttons, no intent model.
- **New, and it belongs in §10.5 or as its own line.** The unmet demand log is a recruitment map. Unanswered requests by trade and area tell you exactly which provider to sign up next, with evidence. Nothing in the record has considered this.
- **§7 contradiction 13, federation.** Growth owning the lead record while KatisoBiz reads and writes against it is a deliberate cross-product link. Dewald has confirmed the admin panels are already combined. Record the decision so it is not re-litigated.
- **§10.5.** "Pay now on the invoice" gains a new argument. If the client pays through the invoice, the completion signal arrives instantly rather than being inferred from the invoice being issued.
