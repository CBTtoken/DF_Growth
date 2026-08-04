# Report: the Growth home page split

**Built 4 August 2026 from `docs/HANDOFF-growth-home-page-split.md`. Live on main, commit `a93a028`.**

---

## Where every section of the old page now lives

The old page was `/pricing` doing five jobs. Every section moved; nothing was deleted.

| Old section | Where it lives now |
|---|---|
| Hero | `/`, shortened to the handoff's shape: headline, one line, the price visible before scrolling, one primary button, one link to pricing. Same photo. |
| Why Choose (the four "Built For South Africa" cards) | `/pricing`, under the plan cards. The handoff's table did not name a destination for this one; it supports a buying decision, so it went with the pricing detail rather than to a holding page. Say the word if it belongs elsewhere. |
| How It Works, the four steps | `/how-it-works`, which already carries the same content in fuller form (the ten-step, screen-by-screen walkthrough). The four-step teaser component stays in the codebase unrendered. |
| This Isn't Just A Webpage (technical and SEO detail) | `/how-it-works`, same words. The mock dashboard it carried is gone (see corrections). |
| Sound Familiar | `/`, moved up to position two as instructed. Untouched. |
| Our Most Visited Pages (member showcase) | `/`, with a new link to the marketplace. HelpLift and Standing 365 are still in it, pending your call (see "needs Dewald"). |
| Pricing cards + R450 offer | `/pricing` keeps the full working signup cards, toggle, consent boxes and the R450 band. `/` gets a plain-language two-plan summary and the R450 band as its own section. The R450 words are one shared component now, so the two placements can never drift apart. |
| Do More (Booking, Shop) | New page `/booking-and-shop`, copy kept whole with a short intro so it does not start mid-thought. |
| Do More (List Your Event, Free) | `/events` already is that page: it pitches free listing and takes submissions. The home card came off; nothing needed adding. |
| Do More (Become An Agent) | `/agents` already is the full programme page. Same story. |
| What You Also Get Access To | Split per the handoff: marketplace into the home "what you get" block, KatisoBiz Nomads to `/how-it-works` (linking to the Nomads community page), KatisoBiz into the home KatisoBiz block. |
| Final CTA + Get In Touch form | `/`, as the closing call to action and the contact form. |

Routing: the logo goes to `/` everywhere. The header's "See pricing" button goes to `/pricing#pricing` from every page (it used to be a dead in-page anchor on any page without the cards). Canonicals: `/` says `/`, `/pricing` says `/pricing`. Both pages, `/how-it-works` and `/booking-and-shop` are in the sitemap.

## Tier bullets that could not be matched to a real feature

Checked against the live code before any rewording, as instructed. These four are still on the cards **word for word**, not reworded, waiting on your decision (build it, reword it honestly, or drop it):

1. **"Campaign Landing Pages" (Growth).** A member has one page. There is no campaign-page builder anywhere in the code.
2. **"Monthly Digital Asset" (Foundation).** Nothing delivers an asset monthly. The self-serve social image generator exists, but it is on-demand, not monthly.
3. **"Monthly Optimisation" (Growth).** Nothing in the code. If this is a manual service you perform, the bullet should say what you actually do.
4. **"Growth Reporting" (Growth).** Nothing beyond the dashboard's visitor numbers, which the "see how many people visit" bullet already covers.

Bullets that DID map to something real were put into plain language: the page, the marketplace spot, the enquiry form, the share link, visitor numbers (page-view tracking is real), the social image generator, booking and shop.

## The KatisoBiz R49 product gap, flagged as instructed

Confirmed in code: `bizUpEntitlementForTier` defines the bundle (Foundation gets free, Growth gets R49), but **nothing calls it during signup**. Growth provisioning never creates or links a KatisoBiz account, and `growth_client_id` is how the two would connect. A member signing up at katisobiz.co.za separately gets a second, unconnected account. All copy now says "switched on by us / by our team" and nothing implies the accounts connect themselves. Until the switching-on is either built or done by hand for each Growth member, this is a promise a human has to keep.

## Found while working, contradicting or beyond what the handoff assumed

1. **Browsers cached the old redirect.** `/` used a *permanent* (308) redirect to `/pricing`, and browsers cache those hard. New visitors get the home page immediately; anyone who visited before may keep landing on `/pricing` until their browser cache expires. Nothing server-side can undo that. If your own phone shows `/pricing` when you type the bare domain, that is why: hard-refresh or open a private tab.
2. **Booking and Shop are not actually tier-gated in code.** They are positioned (and now sold) as Growth features, but nothing in the dashboard stops a Foundation member using them. The only tier gate in the whole dashboard is the Meta ads section. Either the gate should be built or the positioning is a discount Foundation members silently enjoy.
3. **The social image generator is available to every tier**, though "Marketing Assets" sells it as Growth-only. Same shape of gap as above.
4. **The old page's "10 styles available" line** (member showcase) was kept; the template picker does exist with ten styles, so it checks out.

## Placeholders standing in for screenshots

All visibly labelled "Real screenshot coming soon", none faking content, waiting on the three phone screenshots the handoff lists as yours to take:

1. Home, "What you get", card one: a real member page on a phone.
2. Home, "What you get", card two: the dashboard (real or zero state). The same screenshot can later replace the deleted mock dashboard panel on `/how-it-works` if you want a visual back in that section.
3. Home, KatisoBiz block: a quote being built on a phone.

The member showcase cards are not placeholders; they use the real captured screenshots from the existing pipeline.

## Needs Dewald (from the handoff's own list)

- The four unmatched bullets above.
- Final approval of the home headline and hero line (currently the existing "Build Your Presence. Grow Your Business." with a new supporting line).
- Whether HelpLift and Standing 365 stay in the "real members" showcase. Jetting Worx is the genuine third-party example if you want to swap one in.
- The three screenshots.
