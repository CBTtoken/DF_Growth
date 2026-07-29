# Where things stand, and what to pick up next

**Written 29 July 2026, at the end of a long working session.** Its job is to let the next session start sharp without re-deriving anything. Covers both DigitalFlyer Growth and KatisoBiz, because they are one codebase, one database and one deployment, and today's work crossed between them constantly.

Everything below was read from the live system, not remembered.

---

## 1. The one number that matters right now

**Fifteen KatisoBiz accounts and climbing, off the paid campaign. Zero documents issued by a real member.**

The account count moves daily, so treat it as stale and re-read it. The zero is the number that matters, and the day it stops being zero is the day this section can be rewritten. One issued document exists and it belongs to Dewald's own test account, which is not the same thing.

### What was blocking them, and what has been done about it

Reading every unfinished draft on 30 July gave a much sharper picture than the totals did:

- **7 opened a quote and typed nothing at all**
- **3 entered line items but never attached a customer**, one worth R55,020
- **1 was complete and simply never issued**

Everything below came out of that, and all of it is live and verified:

- `Add a new customer` inside a quote created the customer and did not attach it, so a member returned to a quote still saying "Not chosen yet". Fixed.
- A customer can now be created **by typing a name straight into the quote or invoice**, no second screen. The full customer form stays alongside it.
- With no saved customers the box **opens ready to type** rather than hiding behind a tap.
- The home screen leads with **Start a quote**, full width, and a member who has never issued anything gets a first-run screen with one instruction instead of three cards reading R0.00.
- The setup checklist became **one button** that names the consequence, not the task.
- A **welcome email** and **three check-in emails** now exist where there was previously only a login code.

### What to check first, next session

```sql
select count(*) from public.bizup_documents where number is not null;
```

If members have started issuing, the fixes worked and the conversation moves to upgrades. **If it is still zero, the wall is somewhere else and it must be found by reading the drafts again, not guessed at.** Reading what each draft is actually missing, rather than counting them, is what produced everything useful in this section.

The check-in emails began going out on the morning of 30 July, so **replies in info@digitalflyer.co.za are the best evidence available** and should be read before building anything.

---

## 1b. Next build: WhatsApp, across both products

Flagged by Dewald on 30 July as the next major piece of work, spanning Growth and KatisoBiz. **Read this before designing anything, because a working skeleton already exists and was never switched on.**

**Already in the repository:**

- `src/app/api/whatsapp/webhook/route.ts`, the inbound webhook, signature verified
- `src/lib/whatsapp/` with `graph-api.ts`, `parse-webhook.ts`, `signature.ts`, `conversation.ts` and `handle-message.ts`
- `src/lib/bizup/whatsapp.ts`, which formats a member's number for the wa.me links KatisoBiz already uses
- Four migrations from 12 July, including the `whatsapp_conversations` table with resumable step state

**What it currently does:** a conversational Growth onboarding, asking a business name and walking through signup over WhatsApp. It is keyed on a stable conversation id rather than the phone number, deliberately, and the reasoning is in the migration comment.

**What it does not do:** anything at all in production. `whatsapp_conversations` has **zero rows**. Of the credentials it needs, only `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is set; `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and the app secret are all absent, so it can receive nothing and send nothing.

**Two things worth settling before writing code.** First, whether this is one WhatsApp number for both products or one each, because the answer changes the routing at the webhook rather than being a later detail. Second, that KatisoBiz's existing WhatsApp behaviour is deliberately *not* automated: a member presses a button, their own WhatsApp opens with the message ready, and they press send. Documents come from the member's own number, never from ours. That is a stated trust decision, repeated in several places in the code, and an automated sender must not quietly undo it.

There is also a separate WhatsApp backend for Vowie, mentioned in memory as code-complete and waiting on infrastructure funds. Worth asking whether anything there is reusable before rebuilding.

---

## 2. Open items owned by Dewald

- **Sentry has expired**, so the payment alarms are silent. Fifteen alerts, eleven of them on the Paystack webhook, watching for things like a renewal failing to record. The app is unaffected: Sentry is pure monitoring, nothing branches on it, and the build does not depend on it. Verified. The fix is to downgrade to Sentry's free tier, no code change, the connection is still configured in Vercel.
- **Book order emails** for Standing 365 still carry the WhatsApp number in three places, pointing at `dewald@digitalflyer.co.za`. Left deliberately, since it is a different product and a different kind of enquiry. Remove if wanted.
- **Tier naming has drifted.** The site says Foundation and Growth; planning documents say Foundation, Growth Engine and Enterprise. Needs one decision, then code, copy and docs made to agree.
- **`digitalflyer.co.za`** currently redirects to Growth. Whether the old directory concept folds into the marketplace permanently is unanswered, and worth answering before any SEO investment.

## 3. Parked by explicit decision, do not re-propose

- **Multi-user accounts.** Nobody has asked, including the field tester. Contained when it comes, because account scoping runs through one function.
- **Recurring invoices.** Refused rather than deferred. Tradesmen invoice per job.
- **Paystack "Pay Now" on invoices.** Good idea, but it collides with published terms clause A6.3 and shares an unresolved commercial decision with Growth's own payments question.
- **Agents getting access to a client's dashboard or leads.** The answer is always that the client hands over their own login.

---

## 4. What shipped on 28, 29 and 30 July

Grouped so a reader can see the shape rather than a commit list.

**Speed.** The database is in eu-west-1, Ireland, and no Vercel region was pinned, so the serverless functions had been placed in iad1, Washington DC. Every query crossed the Atlantic. Server thinking time measured at 390 to 420ms; pinning `dub1` in `vercel.json` brought it to about 285ms. Separately, the main buttons gave no feedback at all when pressed, which made any latency read as a broken button, so they now say what they are doing and disable while they do it. Cape Town would put the server nearer members but leave every query crossing to Ireland, which is worse whenever a page runs more than one query, and all of them do.

**Installable.** KatisoBiz can be added to a phone's home screen with its own icon, opening full screen with no browser bar and nothing to download. The install prompt is ours rather than the browser's, because Chrome only offers it when it feels like it and iPhones never offer it at all. iPhone users get written steps instead. The manifest is host-aware, so Growth is not made installable by the same code.

**Naming.** RE:Biz Nomads became KatisoBiz Nomads everywhere, including the `/rebiz` slug, which now redirects. The two Facebook groups are still called RE:Biz on Facebook itself and only Dewald can change those.

**Money.** Subscription renewals were being silently discarded, because Paystack sends a renewal with none of the metadata set at checkout and the handler keyed on exactly that. Nothing broke for members but no payment record was written, so revenue was understated and every paying member would have appeared to churn after one month. Now matched on plan code and recorded as a distinct `renewal` kind.

**Advertising.** The Meta pixel was on no page of the KatisoBiz funnel at all, found the day before spend started. Now live and consent gated on the landing and signup pages, sending to dataset `974569028893466`, with click cookies forwarded on signup. The domain is verified with Meta. Event priority is not configurable for this account, Meta now manages it automatically.

**The product.** Straight invoices without a quote, invoice numbering that continues from a member's old book, three transactional emails to members, customer email validation before a document send, and the customer attachment fix above.

**The site.** Three rounds of external audit produced four real defects: KatisoBiz described as the wrong product on the pricing page, the Foundation entitlement reading identically to Growth's and inviting refund requests, six pages sharing as bare links with no image, and old hostnames serving a duplicate site. All fixed. Several other audit findings were tested and were not true, including its headline claim that ad spend was being wasted on a lost redirect.

**Legal.** Attorney-reviewed schedules published on terms and privacy. The cookie clause was widened when the pixel went onto the KatisoBiz funnel, because it then described less tracking than actually happened.

---

## 5. Things worth knowing before changing code here

- **Two products, one app.** Growth owns `/login` at the application root, so KatisoBiz routes live under `/bizup` internally. `katisoPath()` in `src/lib/bizup/product.ts` emits clean paths on katisobiz.co.za and prefixed paths on the Growth hostname. No visible URL should ever contain `/bizup`.
- **Overriding `openGraph` or `twitter` in page metadata replaces the root layout's block wholesale, images included.** This silently removed the share image from six pages and caught me twice in one day. Always name the image explicitly.
- **`service_role` bypasses row level security.** Twelve tables have RLS on with no policies, which is correct, but it means every query must also filter on `account_id`. That discipline lives in the code, not the database, and is the most likely thing to go wrong when someone new joins.
- **Verify a migration is live before shipping code that reads the column.** This has caused a real outage on this project before.
- **Test against the live site rather than trusting a claim**, including claims in audit documents and including my own. Several confident assertions this week turned out to be wrong in both directions.
