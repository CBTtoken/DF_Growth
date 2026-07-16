# GROWTH_NEXT_SPRINT_BUILD_SPEC_CLAUDE.md

## 1. Context

DigitalFlyer Growth is live in production at `https://growth.digitalflyersa.co.za`, Paystack in live mode, real transactions flowing. Since go-live, a real Marketplace directory, a second custom page instance (RE:Biz Nomads), a multi-account switcher, and admin visibility/delete controls have all shipped and been verified live. This spec covers the next build cycle, working from the current live functional spec and its backlog.

This sprint is scoped tight and operational first. Everything in section 3 (do not build yet) stays out of scope regardless of how tempting it is to fold in, since it needs business scoping that has not happened yet.

## 2. Build Order

### 2.1. Fix first, before anything else in this sprint

**`NEXT_PUBLIC_WHATSAPP_NUMBER` missing from Vercel production.** This is a live bug, not a backlog item. Every WhatsApp CTA button that depends on it, RE:Biz Nomads' "Message us" button and the dashboard's Enterprise upsell, has been silently invisible in production since go-live. Add the environment variable to Vercel's production environment, redeploy, then manually confirm both CTAs render correctly on the live site. This is near zero effort and should not wait for the rest of the sprint.

At the same time, spot check that `SITE_URL`, `CRON_SECRET`, and `SUPABASE_DB_URL` in the GitHub Actions repo secrets correctly reflect the current production domain, this was flagged as not yet re-confirmed since the domain was fixed, and the scheduled jobs (trial reminders, onboarding nudges, weekly backup) depend on it being correct.

### 2.2. Uptime and error monitoring

This has now been flagged as open across two consecutive reviews and still is not done. Real customer money is flowing through live Paystack checkouts today, and the only current visibility into a failure is Vercel's own function logs. This is the priority build item for this sprint.

- Confirm whether UptimeRobot is actually active. If not, set it up against the production domain, monitoring at minimum the homepage, `/pricing`, `/marketplace`, and one representative client page route.
- Add a lightweight error monitor, Sentry or equivalent, wired into both the Next.js frontend and any server-side API routes and webhook handlers, especially the Paystack webhook and the WhatsApp webhook, since those are the two places a silent failure would be most costly.
- Confirm alerts actually reach Dewald, email or another channel he checks regularly, not just a dashboard nobody looks at.

### 2.3. Member-facing analytics, page-view tracking

Lightweight to start, a counter plus increment on each client page view, surfaced as a simple stat on the member's own dashboard. This does two jobs. It gives a member a real reason to return to their dashboard and see their page is working, and it is the ranking signal the Marketplace directory needs for a future "most visited" sort mode, which today only sorts by most recently added.

- Track a page view per visit on the public client page route, written asynchronously so it never slows down the page render itself.
- Surface a simple count, and ideally a basic trend, total views this week or this month, on the client dashboard.
- Do not build the Marketplace "most visited" sort mode itself in this sprint, just the underlying tracking. That sort mode can be a fast follow once real view data exists to sort by.

## 3. Explicitly Deferred, Do Not Build This Sprint

- **Main page plus additional custom page architecture.** Standing 365 and RE:Biz Nomads have now proven the custom page mechanism twice, both under one login via the account switcher, but true dual-page-per-member support needs real routing-layer design that has not happened yet. This needs a business scoping conversation before any engineering starts.
- **Enterprise tier live checkout.** No live checkout button exists yet, low urgency.
- **Real client showcase pages.** Swapping the 3 honestly-labeled placeholder "See It In Action" pages for real, permission-granted members should wait until there are enough real live members to choose from and their permission has actually been requested.
- **Mobile performance root cause.** The ~2.3s warm LCP on throttled mobile stays parked, revisit once there is less launch-critical work competing for attention.

## 4. Do Before Any Paid Meta Ad Spend, Not Tied To This Sprint's Timeline

**Meta ad-asset compliance pass.** Verify the dashboard's generated social images actually meet Meta's real current campaign size and format requirements. This does not need to happen inside this sprint, but it needs to happen before any client, or Dewald himself, relies on a generated asset in a live paid campaign. Flagging it here so it does not get lost.

## 5. Out of Scope, Do Not Build

- No changes to the Marketplace directory beyond what already exists, this sprint only adds the tracking data it will eventually use.
- No dual-page routing work, per section 3.
- No new custom page instances.
- No changes to pricing, tiers, or the Founding Business mechanic.

## 6. Acceptance Checklist For This Sprint

- [ ] WhatsApp CTA buttons visible and functional in production (RE:Biz "Message us", dashboard Enterprise upsell)
- [ ] `SITE_URL`, `CRON_SECRET`, `SUPABASE_DB_URL` confirmed correct against the live domain
- [ ] UptimeRobot confirmed active and monitoring the right routes, or newly set up
- [ ] Error monitor installed and confirmed capturing real errors, including webhook handlers
- [ ] Alerts from both of the above confirmed reaching Dewald
- [ ] Page-view counter live and incrementing on real page visits
- [ ] View count visible on the client dashboard
