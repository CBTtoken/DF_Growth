# THE STACK: WHAT WE PAY FOR AND WHAT WE DO NOT

**Verified 3 August 2026 by reading each provider's own API, not from memory.**

This is the companion to `ESTATE.md`. That one says where the code lives.
This one says what it runs on, what it costs, and where the limits are.

It also feeds the health check: the handoff asks that each provider's plan and
hard limits be recorded so the checks know what they are measuring against.

---

## WHAT WE PAY FOR

| Service | Plan | What it costs | What it does |
|---|---|---|---|
| **Vercel** | Pro | **$20/month** plus usage | Hosts all four applications. Usage is currently absorbed by the $20 included credit |
| **Supabase** | Pro, org `DigitalFlyer` | **$25/month** typical | Database, auth and file storage for all three products |
| **Anthropic** | Pay as you go | usage | The AI that drafts member page copy |
| **ScreenshotOne** | Paid tier | usage | Screenshots of member pages for the marketplace |
| **Paystack** | No monthly fee | ~2.9% per transaction | Takes the money. 8 plans configured |
| **Meta / WhatsApp** | Pay per conversation | usage | The WhatsApp number and template messages |
| **Domains** | Various registrars | annual | digitalflyersa.co.za, katisobiz.co.za, moxiemag.co.za, helplift.co.za, fortislex.co.za, digitalflyer.co.za |

**Vercel is the one to watch.** Build CPU was 59 hours in the August cycle,
$12.56 of a $15.08 infrastructure total, with everything else in cents. The
Ignored Build Step added on 3 August cuts roughly a quarter of that.

---

## WHAT IS FREE

| Service | Tier | What it does |
|---|---|---|
| **Cloudflare Turnstile** | Free, unlimited | The "are you a person" check on every public form |
| **Google Analytics 4** | Free | Traffic on Growth and KatisoBiz |
| **Sentry** | Free tier | Catches errors in production and emails them |
| **Pexels** | Free API | Stock photography inside onboarding |
| **GitHub** | Free | Code, plus three Actions workflows |
| **Resend** | Free tier, 3,000/month | Every email the platform sends |

---

## WHAT WE ARE NOT USING

**Cloudflare, as a CDN or proxy.** Checked on 3 August: every one of the five
live domains is served directly by Vercel, with no Cloudflare in front of any
of them. Only Turnstile is in use, which is a separate free product. An API
token exists and reads zero zones, correctly, because there are none.

Worth knowing rather than assuming, because "we are behind Cloudflare" is the
sort of belief that quietly informs a security decision that was never true.

---

## THE THREE SUPABASE PROJECTS

One organisation, `DigitalFlyer`, on the Pro plan. Three projects:

| Project | Region | Serves |
|---|---|---|
| `DF-Growth` | eu-west-1, Ireland | Growth, KatisoBiz, Kwaai Press, The Board, The Desk, Moxie |
| `fortislex-mvp` | eu-central-1, Frankfurt | FortisLex |
| `helplift` | **ap-northeast-1, Tokyo** | HelpLift |

**HelpLift's database is in Tokyo.** Its users are in South Africa and its
Vercel deployment is not in Tokyo, so every query crosses roughly half the
planet twice. That is not urgent, nothing is broken, and moving a live
database is not a small job. But it is worth knowing before anybody wonders
why HelpLift feels slower than Growth.

DF-Growth is in Ireland and its Vercel deployment is pinned to `dub1`, Dublin.
Those two are correctly co-located and should stay that way.

---

## MONEY IN: WHAT PAYSTACK IS SET UP TO CHARGE

Eight live plans, read from Paystack on 3 August:

| Plan | Price |
|---|---|
| DigitalFlyer Growth, Foundation | R550 / month |
| DigitalFlyer Growth, Foundation post-trial | R100 / month |
| DigitalFlyer Growth, Growth | R180 / month |
| DigitalFlyer Growth, Growth annual | R1,199 / year |
| DigitalFlyer Growth, Growth Engine | R1,400 / month |
| DigitalFlyer Growth, Enterprise | R3,500 / month |
| Moxie Magazine membership | R49 / month |
| Moxie Magazine membership annual | R490 / year |

Member product sales are separate and never touch a DigitalFlyer account: a
member connects their own gateway and their buyers pay them directly.

---

## WHAT THE HEALTH CHECK CAN AND CANNOT SEE

Tokens held, and what each one can actually do:

| Provider | Token | Can the health check read usage? |
|---|---|---|
| Vercel | team-scoped, `digital-flyer` | **Yes.** Spend, bandwidth, invocations, build minutes |
| Supabase | management API | **Yes.** Database size, storage, project health |
| Paystack | secret key | **Yes.** Account status and plans |
| Cloudflare | account token | Not applicable, nothing is on Cloudflare |
| Resend | **send-only restricted key** | **No.** See below |
| Meta | none held here | **No.** Conversation spend needs a token |

### Resend needs a second key, or stays unknown

The Resend key in use is a **restricted send-only key**. That is good practice
and it should stay exactly as it is for the application. But it cannot list
domains or count emails sent, so the health check cannot report Resend usage
against the 3,000/month free tier.

Two options, and it is Dewald's call:

1. **Create a second, read-only Resend key** for the health check. Small job,
   and it turns "unknown" into a real number on the one provider with a hard
   monthly cap that could actually be hit.
2. **Leave it.** Resend reports `unknown` with the reason given plainly.

The handoff is explicit that unknown is never dressed up as fine, so option
two is honest, just less useful.

---

## SINGLE POINTS OF FAILURE

Said plainly, because they are worth knowing rather than discovering:

- **One Vercel account** carries all four applications.
- **One Supabase organisation** carries all three databases.
- **One Paystack account** takes every payment. There is a known issue here:
  one test-mode account shared across four products, recorded in The Desk as
  blocking payment work.
- **One Resend account** sends every email in the estate.
- **One person** has access to all of it, which is the intention, and is why
  2FA on each of these matters more than any monitoring.
