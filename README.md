# DigitalFlyer Growth

Growth-as-a-service platform for budget-sensitive South African businesses: conversion-optimized landing pages, programmatic social asset generation, and server-side Meta ad tracking. Sub-brand of DigitalFlyer SA, fully separate codebase and infrastructure.

Full build spec: [CLAUDE.md](./CLAUDE.md). Business model and direction: [docs/business-plan.md](./docs/business-plan.md).

## Status

Sprint 0 scaffold. Not yet wired to a live Supabase or Paystack project — see "Provisioning checklist" below.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in values, see checklist below
npm run dev
```

## Provisioning checklist (Sprint 0)

These need to be created in your own Vercel/Supabase/Paystack accounts — not something that can be scripted from here:

- [ ] New Supabase project `dfsa-growth-staging` (and later `dfsa-growth-prod`), per CLAUDE.md Section 5.1 — kept separate from `dfsa-prod` since this data (ad tracking tokens, CAPI logs, Paystack subscription state) is higher-liability
- [ ] Run `supabase/migrations/20260708120000_init_schema.sql` against it (or connect the Supabase GitHub integration to auto-apply on push to `main`, matching the FortisLex project's setup)
- [ ] Supabase Auth: enable magic-link sign-in
- [ ] New Vercel project `digitalflyer-growth`, same team as the rest of DigitalFlyer
- [ ] Paystack account, test-mode secret key first for the Sprint 1 dry run
- [ ] Decide the domain name (CLAUDE.md suggests `digitalflyergrowth.co.za`) and point it at the Vercel project through Cloudflare
- [ ] Confirm launch prices per tier before Sprint 1 is testable end to end (CLAUDE.md Section 2.2 suggests R550 / R1,400 / R3,500 as defaults, set as Paystack Plan amounts, not hardcoded)

## Sprint roadmap

See CLAUDE.md Section 12 for the full sprint breakdown (0–6).
