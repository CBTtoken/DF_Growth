# Two Code Audits for the Legal Review

**Prepared:** 27 July 2026, by inspection of the live codebase
**For:** the attorney reviewing DigitalFlyer's terms, privacy policy and PAIA manual
**Why:** the legal pages brief flags both of these as things that cannot be written accurately without knowing what the software actually does. These are findings of fact, not opinion.

---

# Audit 1: Retention periods and deletion

## The question

Three different retention periods exist on paper. Which one does the software actually enforce?

| Source | Says |
|---|---|
| Published privacy policy, section 6a | Information kept while a member is active, then **12 months** after cancellation, then deleted |
| Internal operating rule | Non-renewed or unsubscribed businesses deleted after **60 days** |
| BizUp requirement | Financial records kept **5 years**, 7 for company members |

## The finding

**None of them. No code deletes member data on any schedule.**

This was checked three ways and the result was consistent:

1. **Every scheduled job was inspected.** Five exist: `daily`, `expire-events`, `onboarding-nudge`, `refresh-screenshots` and `trial-reminders`. Only one is registered with the hosting platform to actually run (`daily`, at 06:00, which fans out to the others). **None of them deletes member or customer data.** They send reminder emails, expire event listings and refresh screenshots.

2. **The database has columns built for a deletion warning sequence** (`deletion_warning_14d_sent_at` and `deletion_warning_5d_sent_at`). A search of the entire codebase returns **zero** references to them. They are read by nothing and written by nothing. The groundwork was laid and the job was never built.

3. **The only deletion path that exists is manual.** An administrator can delete a business from the admin console, which removes that business record and its message history. It requires a human decision each time. There is no unattended process.

## What this means for the policy

The published 12-month promise is **not implemented**. Nothing enforces it, and nothing contradicts it either.

That is better news than it sounds. There is no automated behaviour to reconcile a new policy against, and no historic deletions to explain. The policy can be written correctly first, and the code built to match it afterwards, rather than the usual and much worse position of discovering a job has been quietly deleting things the policy never contemplated.

The practical consequences for drafting:

- The **60-day rule has never existed in software.** It is an internal intention only. Treat it as a proposal, not a description of current practice.
- The **5-year BizUp retention is not currently at risk** from any running process.
- Whatever period is settled on, **it will need to be built**, and it should be built once rather than as three separate rules.
- One structural point already enforced: a BizUp account that has issued any document **cannot be deleted through the application at all.** The database refuses it, because the invoice numbering records that guarantee an unbroken sequence are protected from deletion. That was a deliberate design choice and it aligns with a long financial retention period, but it does mean "delete my account" cannot be a self-service button for a BizUp member and will need a documented manual process.

## Backups

Separately from the above, the published policy states a weekly encrypted database backup retained on a rolling 90-day basis. That is accurate and matches the configured backup workflow.

---

# Audit 2: What member data is sent to Anthropic

## The question

The privacy policy does not disclose that any data is sent to an AI provider. What is actually transmitted?

## The finding

**One feature, one function, seven fields, and no third-party personal information.**

**Where:** a single function, `generateLandingCopy`, in one file. It is called from exactly two places: the web signup wizard, and the WhatsApp signup conversation. There are no other calls to Anthropic anywhere in the codebase.

**What it does:** drafts marketing copy for a business's own landing page, which the business owner then reviews and edits before anything is published.

**Model used:** Claude Sonnet 5.

**Exactly what is sent**, and nothing else:

| Field | What it is |
|---|---|
| Business name | The trading name |
| Industry | Chosen from a fixed list |
| Province | Chosen from a fixed list |
| Description | Free text, the owner describing their own business |
| Tagline | Free text, optional |
| Products and services | Free text, optional |
| Additional notes | Free text, optional |

**What is returned:** four pieces of draft copy. A headline, a sub-headline, an "about" paragraph and a services description.

## What is NOT sent

Confirmed by inspecting the input the function accepts, which cannot carry anything beyond the seven fields above:

- **No personal information belonging to anyone other than the member.** No customer names, no lead details, no reviewer information, no contact lists.
- **No BizUp data at all.** No invoices, no quotes, no customer records, no banking details. BizUp does not use AI anywhere.
- No email addresses, phone numbers, physical addresses or identity numbers.
- No payment or banking information.

## The one caveat worth disclosing honestly

Four of the seven fields are **free text typed by the business owner**. A member could, in principle, type a person's name or contact details into their own business description or notes. Nothing prevents it and nothing strips it.

So the accurate disclosure is not "no personal information is sent to our AI provider". It is closer to: **the business's own profile information is sent, which the business owner writes themselves, and which they should not include other people's personal details in.**

That is a smaller and more defensible claim, and it has the advantage of being true.

## Suggested facts for the sub-processor table

- **Anthropic**, provider of the Claude AI service, used to draft landing page copy from the business profile a member supplies. Processing occurs outside South Africa.

Whether that requires anything further under POPIA's cross-border transfer provisions is a question for the attorney, not for this document.

---

**Prepared by inspection of the codebase on 27 July 2026. If either area changes, this document goes stale and should be re-run rather than trusted.**
