# Where things stand, and what to pick up next

**Written 29 July 2026, at the end of a long working session.** Its job is to let the next session start sharp without re-deriving anything. Covers both DigitalFlyer Growth and KatisoBiz, because they are one codebase, one database and one deployment, and today's work crossed between them constantly.

Everything below was read from the live system, not remembered.

---

## 1. The one number that matters right now

**Eleven KatisoBiz accounts and climbing. Eight drafts. Zero documents have ever been issued.**

Not one, by anybody, ever. That is the whole story of the product right now and it outranks every other piece of work.

The account count is moving daily off the paid campaign, so treat it as stale and re-read it. The zero is the number that matters, and the day it stops being zero is the day this section can be rewritten.

Seven of those eight drafts were stopped on the same thing: line items entered, real money on them, one of **R55,020**, and no customer attached. `Add a new customer` inside a quote created the customer and then did not attach it, so a member came back to a quote still saying "Not chosen yet" with no reason to guess two further steps were needed.

**That is fixed and verified on the live site** (commit `0396860`). A customer added from inside a quote now attaches itself.

**A welcome email went out to every existing member** on 29 July, naming every button exactly as it appears on screen. It did not exist before; the only message a member had ever received was the six digit login code.

### What to check first, next session

Query how many documents now have a number. If members have started issuing, both fixes worked and the next conversation is about upgrades. **If it is still zero after 48 hours, the wall is somewhere else and it must be found by looking at the data again, not guessed at.**

```sql
select count(*) from public.bizup_documents where number is not null;
```

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

## 4. What shipped on 28 and 29 July

Grouped so a reader can see the shape rather than a commit list.

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
