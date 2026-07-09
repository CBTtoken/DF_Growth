# DigitalFlyer Growth: Brand and Content Directive
Companion to the technical CLAUDE.md spec. This is what was missing, who we are, who we talk to, how we sound, and what the landing page actually says. Hand this to Claude Code alongside the technical spec, it needs both to build a page with substance, not just a working form.

## 1. Who we are

DigitalFlyer Growth is built by someone who does the work himself. Not an agency with account managers translating between a client and a design team, one person, the same stack, the same discipline, every time. That's not a limitation being spun into a positive, it's the actual reason this can be fast and honest where a traditional agency can't be.

**One-line version:** Marketing built by someone who's actually in the trenches with you, not someone who's only ever managed people who are.

## 2. Who we're for

Two groups, genuinely different in resources, identical in what they actually need:

**The solo operator, burned or broke.** Either they paid an agency once, got a generic template and a vague promise, and nothing changed, or they've never had the budget to try at all. They're doing the work of the business themselves, sales, delivery, admin, and marketing is the thing that keeps getting pushed to "next week." They don't need to be sold a dream, they need something that works without asking anything else of their time.

**The resourced owner who's outgrown guesswork.** They have budget, sometimes a small team, and they've likely worked with an agency or a freelancer before. What they're missing isn't money, it's someone who actually understands their business well enough not to hand them a junior's first draft. They can tell the difference between someone who gets it and someone who's reading from a template, fast.

Both groups are buying the same thing from a different starting point: proof that this isn't another empty promise. The copy has to earn that from both directions, not split the difference into something generic.

## 3. Voice and tone

**Confident, and a little cheeky about what doesn't work, delivered warm, not mean.** The target is a business owner who has genuinely been burned or genuinely can't afford to be, so the tone calls out agency fluff directly, but always from alongside them, never above them. This is a fellow small operator talking, not a bigger company talking down.

| Do | Don't |
|---|---|
| "No contracts, no jargon, no vague monthly report nobody reads." | "We deliver best-in-class, data-driven growth solutions." |
| "Built by someone who's done this himself, not managed a team who has." | "Our team of experts brings decades of combined experience." |
| Short sentences. Say the specific thing. | Padding a claim with adjectives to make it sound bigger than it is. |
| Name the real frustration (empty promises, no time, no budget) before the offer. | Lead with the product before earning the right to be heard. |
| Confident about what's genuinely true (speed, cost, the DigitalFlyer network). | Overclaiming results before there's a real case study to point to. |

**A useful gut check for any line of copy:** would this sound believable coming from a solo operator who built this himself, or does it sound like it came out of an agency deck? If it's the second one, cut it.

## 4. Differentiation, in this voice

Two real structural advantages, not manufactured hype, this is what actually separates Growth from a freelancer or a small agency:

1. **You're not just getting a page, you're getting a foothold in a real network.** A Growth client sits inside DigitalFlyer SA's existing business directory and RE:Biz Nomads community, not just a design portfolio somewhere. That's distribution most local agencies simply don't have to offer.
2. **No budget gatekeeping.** Most agencies only know how to sell what they're built to sell, usually ad management, so a business with no ad budget gets turned away or oversold. Growth's Foundation tier means you start exactly where you are, budget or none, and grow into the rest when you're ready, not before.

## 5. Draft landing page copy

For Growth's own public pricing/marketing page (not a client's tenant landing page, that's a separate, per-client thing already built in the technical spec). This is a first draft to react to, not final.

**Hero**
- Headline: "Built by someone who gets what it's like to do it all yourself."
- Sub-headline: "Real pages, real tracking, and a plan that starts wherever your budget actually is, no contracts, no jargon, no empty agency promises."
- CTA: "See what fits your business"

**The "why we're different" block**
- "Most agencies sell you what they're built to sell. We start with what you actually need, whether that's a page you'll manage yourself or a full ad campaign someone runs for you, and we never gatekeep the first one behind the second."

**The network block**
- "Every DigitalFlyer Growth client sits inside South Africa's growing DigitalFlyer business directory. You're not just getting a page, you're getting found."

**Tier explainer (plain, not salesy)**
- "Foundation: a real, converting page and branded content, no ad budget needed. Growth Engine: everything in Foundation, plus your ad tracking actually working the way it's supposed to. Enterprise: a fully custom build for businesses ready to go further."

**Trust section**
- Lead with specificity over polish: "Hosted in Cape Town. Built on the same infrastructure serving real South African businesses today." Avoid unverified superlatives here, per Section 4's guardrail, this should read as fact, not sales copy.

**Footer CTA**
- "Start with what you've got. Grow from there."

## 6. Visual identity, open item, not invented here

Colors, fonts, and logo treatment for DigitalFlyer Growth itself haven't actually been set anywhere in this project, worth naming directly rather than defaulting past it. A separate attempt to pull DigitalFlyer SA's own brand tokens off the live site also failed, since the site renders client-side and doesn't expose them to a simple fetch. Two real options, not a decision to make silently:

1. Pull real hex values, font family, and logo files directly from existing DigitalFlyer brand assets (a design file, a brand guide, or manually inspecting the live site's rendered CSS) and hand them to Claude Code as fixed values.
2. If there's no locked brand guide yet, decide fresh for Growth specifically, given the tone in Section 3, a direction worth considering is confident and warm rather than corporate-safe, avoid the generic blue-and-white SaaS palette every templated agency site uses, since that visually undercuts the "not another agency" positioning before a visitor reads a word.

Either way, Claude Code should not invent or guess at hex values, that's a real brand decision, not a placeholder to fill in silently.

## 7. Guardrails

- No fabricated testimonials, member counts, or results. Nothing here has a live case study yet, the copy above deliberately leans on the offer and the real structural differentiators, not proof that doesn't exist.
- No corporate-agency vocabulary ("synergy," "best-in-class," "end-to-end solutions"), it directly contradicts the entire positioning.
- Confident tone is about calling out empty promises, never about mocking or condescending to the business owner reading it, they're the peer here, not the audience being sold down to.
