# DigitalFlyer Growth: Business Plan and Direction
Prepared for Dewald Rosema. Internal planning document. This covers business model and direction only, not the technical build (see the separate CLAUDE.md spec) and not the pilot campaign (deferred until the platform is built).

## 1. What DigitalFlyer Growth is

A standalone growth-as-a-service platform for budget-sensitive South African businesses: conversion-optimized landing pages, programmatic social media asset generation, and server-side Meta ad tracking, delivered as a monthly software-with-a-service product rather than a traditional agency engagement.

It is branded under the DigitalFlyer name but runs as its own business with its own domain, its own infrastructure, and its own client base. DigitalFlyer SA (the existing directory platform) is not a dependency of Growth and continues operating independently. The two may be brought together later once platform access and business structure allow for it, but that is explicitly a future decision, not part of this plan.

## 2. Who this is for

Two segments, treated as one ladder within the same product, not two separate businesses:

1. **The self-managed segment, the biggest gap in the South African market right now.** Businesses that want a professional, conversion-ready website and matching branded social media assets, but have no ad budget yet, or aren't ready to hand ad spend to anyone else. They receive the same design and asset quality as any other tier, and post the generated assets themselves, manually, on their own Facebook or Instagram. This is the intended entry point for most new Growth clients, and the segment to prioritize first before working up to ad-managed clients.
2. **The ad-managed segment.** Businesses ready to run paid Meta campaigns with the campaign, tracking, and optimization handled for them. Worked up to from segment 1, not sold to instead of it.

This is not a fit for businesses wanting a fully bespoke, multi-page custom build from day one, but that boundary is commercial, not technical, and not a reason to turn a client away. Those needs get routed into DigitalFlyer SA's existing front-end development service line, sold alongside Growth as an upgrade path, not instead of it. A DigitalFlyer SA marketplace listing can also be bundled into a Growth tier as an added-value line item, since it increases a client's digital footprint at close to zero marginal cost to you. See Section 6 for how Growth links commercially with these other lines while staying technically separate.

## 3. Business model

Growth-as-a-service, sold on a monthly retainer, once-off setup is minimal to none since delivery is largely templated and automated rather than custom-built per client. This is the core distinction from your existing agency retainer model: DigitalFlyer's agency retainers wrap around bespoke development work already done, Growth's retainer wraps around a productized, repeatable delivery.

### Service tiers (restructured around the self-managed segment as the entry point)

| Tier | What's included | Ad spend / Meta account connection | Price (ZAR/month) |
|---|---|---|---|
| Foundation | Conversion-optimized landing page, brand kit, monthly programmatic social asset generation, client posts manually. Optional add-on: DigitalFlyer SA marketplace listing bundled in for added digital footprint | None, no ad account connection needed | Directional only |
| Growth Engine | Everything in Foundation, plus Meta CAPI tracking, weekly asset generation, managed campaign monitoring, monthly performance summary | Client's own ad budget, connected via Meta Business Manager sharing | Directional only |
| Enterprise | Everything in Growth Engine, plus a custom multi-page site (delivered through DigitalFlyer SA's front-end development line), dedicated infrastructure isolation, featured DigitalFlyer SA marketplace placement, priority support | Client's own ad budget, higher management involvement | Directional only |

Pricing across all three tiers is intentionally left directional rather than fixed. Final numbers get set after running real-world case studies once the platform exists, to see actual impact, effort, and cost involved per tier before committing to a rate card.

### Economics
Growth's own incremental infrastructure cost sits at roughly $10 to $15/month (its own Supabase project compute, domain registration), on top of your already-existing business-wide overhead of roughly $65 to $70/month covering Claude, Vercel, and Supabase across everything you run. Marginal cost per Growth client is close to zero beyond that, generated assets and CAPI events are cheap API calls, not per-client infrastructure. This means margin is primarily a function of how many clients you can onboard and retain, not a function of per-client cost creep, which is the intended structural advantage of building this as a platform rather than bespoke work per client.

## 4. Positioning and value proposition

"Built and hosted in Cape Town, live in days, priced for a small business, not a corporate budget."

The honest differentiators:
- **Speed of delivery** is the real edge over traditional agencies, a templated, AI-assisted build process ships in days where a traditional agency takes weeks.
- **Cape Town-hosted infrastructure** is a genuine, verifiable point (confirmed Vercel compute region in Cape Town), giving real latency benefits for South African visitors, not just a claim.
- **Cost structure**, not cost-cutting. Lower price is possible because per-client marginal cost is near zero, not because corners are cut.

Avoid overclaiming performance or results language ("outperforms every agency") until there's a live client result to point to. Positioning should lead with process and cost honesty, not unverified superiority claims.

## 5. Delivery and onboarding model

Fully self-serve, digital onboarding, no sales call and no manual admin step required. A public pricing page lets a business pick a tier and pay through a hosted Paystack checkout, then lands immediately in the same guided intake wizard already designed (business info, brand kit, copy, and Meta ad account connection for Growth Engine and above only). You get visibility into every new signup but don't need to take any action to activate one.

This is a correction from an earlier draft of this plan that assumed you would personally create each client's account before sending an invite. On review, that step was never actually necessary, the wizard already puts data entry in the client's hands, and self-serve payment simply moves account creation there too. The exact technical implementation of the public signup and checkout flow is a build decision for the tech stack conversation, not this document.

## 6. Relationship to DigitalFlyer SA and your other service lines

Technically decoupled, commercially linked:
- Separate domain, separate codebase, separate infrastructure, this does not change
- Shares the DigitalFlyer brand name
- A DigitalFlyer SA marketplace listing can be bundled into Growth tiers as an added-value line item, increasing a client's digital footprint at near-zero marginal cost
- A client who outgrows Growth's templated tiers (wants a fully custom, multi-page build) gets routed into DigitalFlyer SA's front-end development service line as an upgrade, reflected directly in the Enterprise tier, not turned away or treated as out of scope
- DigitalFlyer SA is also a candidate to become a Growth client later (the planned pilot), but is not a dependency, a data source, or an infrastructure host for Growth
- No decision has been made about merging the two businesses' infrastructure, and none is needed to move forward with Growth on its own

## 7. Go-to-market (open, needs more definition before launch)

The DigitalFlyer SA pilot is the planned first real-world test case, but it is not the only channel worth thinking about, and it shouldn't be treated as the whole go-to-market plan. Worth deciding, once the platform exists, whether initial clients also come from:
- Direct outreach to businesses you already have some relationship with through DigitalFlyer SA or RE:Biz Nomads
- Referral from existing agency retainer clients
- Local business networks and word of mouth

This section is intentionally left open rather than filled in with assumptions, it's a decision to revisit once there's a live platform and a first test case to point to.

## 8. Risks worth naming

- **Unproven pricing.** The tier pricing above is a draft based on cost economics and comparable market rates, not tested against real South African small business willingness to pay. Expect to adjust after the first handful of real sales conversations.
- **No proof points yet.** Every early sales conversation, including the DigitalFlyer SA pilot, will need to lead with the offer itself rather than social proof, since there's no track record yet. This is a temporary state, not a permanent constraint, but worth being honest about in early positioning.
- **Solo-dev delivery capacity.** Same structural risk as DigitalFlyer SA's own agency plan, all delivery currently depends on one person. Growth's templated nature reduces this risk somewhat compared to bespoke development work, but doesn't eliminate it.

## 9. What's explicitly out of scope for this business plan right now

- The pilot campaign strategy and numbers for marketing DigitalFlyer SA through Growth. Already drafted in a prior conversation, held until the platform is actually built.
- Final, tested pricing. Directional ranges only, pending real-world case studies.
- Any go-to-market channel beyond noting that DigitalFlyer SA is the intended first test case.
- Multi-seat client teams and any ad platform beyond Meta remain deferred, as in the technical spec.

## 10. What "clear" looks like before moving to the tech stack conversation

This document is considered locked once you've confirmed or corrected: the two-segment target market and tier ladder in Section 2, the restructured tier boundaries in Section 3, and the positioning statement in Section 4. Pricing itself stays open pending case studies, that's expected and doesn't block moving forward.

