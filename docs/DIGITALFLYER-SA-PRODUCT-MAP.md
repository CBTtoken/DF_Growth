# DigitalFlyer SA: the product map

**Read this before any sprint that touches more than one product.**

This exists because on 31 July 2026 I called KatisoBiz "BizUp" in a customer
email draft, having taken the name from a spec folder that was renamed four
days earlier. The specs are not the source of truth. This is, and the code is.

**Last verified against the code: 31 July 2026.**

---

## 1. The company and the products

**Digital Flyer (Pty) Ltd**, trading as **DigitalFlyer SA**, is the company.
Everything below is a product under it. Nothing is a separate brand, and
correspondence is always "from DigitalFlyer SA" regardless of which product it
concerns.

| Product | What it is | Lives at | Status |
|---|---|---|---|
| **Growth** | Member page, marketplace presence, reviews, leads | `growth.digitalflyersa.co.za` | Live, 34 active members |
| **KatisoBiz** | Quoting and invoicing on a phone | `katisobiz.co.za` | Live |
| **The Board** | Community notice board | `/board` on Growth | Built, unlisted |
| **Find a Trade** | Public list of KatisoBiz members | `/katisobiz-members` | Live |
| **Agent Programme** | Referral agents with their own pages | `/{agent-slug}` on Growth | Live |
| **Marketplace** | Where Growth members are found | `/marketplace` on Growth | Live |

---

## 2. Naming, and the traps

**KatisoBiz was called BizUp until 27 July 2026.** The rename covered every
member-visible string, email, PDF line, page title and legal disclosure.

**What deliberately kept the old name**, and will keep tripping people up:

- The `bizup_*` database tables
- Component and file names: `BizUpHome`, `BizUpNav`, `components/bizup/`
- The `/bizup` route prefix, hidden behind the domain
- **`BizUp/docs/`, which is stale and still says BizUp throughout**

That was a considered call: seven migrations of live financial tables for
something no member sees. It is fine. Just never read a name out of those
places into anything a customer sees.

**Other absolute naming rules:**

- It is a **marketplace**, never a "directory" or a "listing".
- **No em dashes**, anywhere, in any customer-facing text.
- Emails open **"Good day {name},"**, never "Hi there".

---

## 3. Tiers and what each one includes

Growth tiers, from `lib/paystack/plans.ts`:

| Growth tier | KatisoBiz included | Source |
|---|---|---|
| **Foundation** | KatisoBiz **Free**, 10 documents a month | `bundled_foundation` |
| **Growth Engine** | KatisoBiz **R49 tier**, 75 documents a month | `bundled_growth_engine` |
| **Enterprise** | KatisoBiz **R49 tier**, 75 documents a month | `bundled_enterprise` |

**Inclusion is by TIER, not by billing cycle.** Monthly and annual make no
difference. Confirmed in `bizUpEntitlementForTier` in
`lib/bizup/entitlements.ts`, and confirmed as intended by Dewald on 31 July
2026 when I raised it.

KatisoBiz standalone, from `components/bizup/landing/BizUpLanding.tsx`:

| Plan | Price | Documents | Notes |
|---|---|---|---|
| Free | R0 forever | 10/month | 1 template, no logo upload |
| KatisoBiz | R49/month | 75/month | All 5 templates, own logo, customer list, reports, statements, accountant export |
| Unlimited | R89/month | Unlimited | **Documents only.** Multi-user and recurring invoices are Sprint 2 and are NOT built. Never advertise them. |

When a Growth subscription lapses, the KatisoBiz entitlement drops to `free`.
It never deletes anything. See `lapsedEntitlement()`.

---

## 4. Where things actually live in the code

One Next.js app, one Supabase project, several domains routed by
`src/proxy.ts` on the **first label** of the hostname.

| Area | Path |
|---|---|
| Member pages | `src/app/[clientSlug]/` |
| Member page rendering | `src/components/landing/` |
| Dashboard | `src/app/dashboard/` |
| Onboarding | `src/app/onboard/` |
| KatisoBiz | `src/app/bizup/`, `src/components/bizup/`, `src/lib/bizup/` |
| The Board | `src/app/board/`, `src/lib/board/` |
| Agent pages | `src/lib/agent-page/`, `src/components/agent-page/` |
| Marketplace | `src/app/marketplace/` |
| Email | `src/lib/email/`, footer applied automatically in `resend.ts` |
| Contact and phones | `src/lib/contact/` |

**Shared, so a change here touches every product:**

- `sendEmail()` in `lib/email/resend.ts`. The standard footer is appended
  inside it, so no call site needs to add one.
- The Paystack webhook. One endpoint for Growth subscriptions, KatisoBiz
  charges and book orders, told apart by a product tag.
- The Resend webhook. Bounces and complaints are written to **both**
  `growth_clients` and `bizup_accounts`, because both send through the same
  domain and one product's bounces damage the other's deliverability.

---

## 5. Rules that cross every product

- **Never email an address flagged unsubscribed, bounced or complained.**
- **Two bounces flags the account for closure**, and a human approves it.
  Dewald, 31 July 2026. Deletion is always a button, never a timer.
- **Data retention:** Growth 12 months, KatisoBiz 5 years (financial records),
  public commenters 12 months.
- **Never claim a feature that is not built.** The R89 tier is the live
  example: two features were on its pricing card and neither existed.
- **Verify a migration is live before shipping code that queries it.** A new
  table gets no `service_role` grant by default on this project, and the
  failure is a silently empty page rather than an error.

---

## 6. Members, as at 31 July 2026

34 active. 33 on Growth Engine, 1 on Foundation (Seven Passes Initiative).
Only 1 member is on an annual cycle.

Not members, these are our own pages served through the member route:
**HelpLift**, **KatisoBiz Nomads**, **Standing 365**.

A clear-out is running: 27 members were given until **7 August 2026** to reply
or their accounts close. Protected from it: Buffelskop, HelpLift, KatisoBiz
Nomads, Standing 365, WerkBewys, JozyMee Marketing, Mikey's Handyman.

---

## 7. When this is wrong, fix it here

If something in this file disagrees with the code, **the code is right**. Fix
the file in the same commit as the change, and never trust `BizUp/docs/` or any
other spec folder for a name, a price or an entitlement.
