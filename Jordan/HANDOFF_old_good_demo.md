# Handoff: Old Good, demo thrift storefront on Growth

## Context

Dewald is setting up a demo online thrift shop as a surprise for his son Jordan Rosema, who wants to sell second-hand clothing online and take a stall at weekend markets.

Nothing here is live. Jordan has not seen it, has not agreed to it, and has no accounts anywhere. The purpose of this build is to show him a working shop with his name on it so he can decide whether he wants to do it. If he says yes, the real accounts get opened afterwards and this becomes the starting point rather than being thrown away.

There is a working reference build: `thrift-shop-demo.html`. It is a single self-contained page. Treat it as the design and behaviour brief, not as code to reuse.

## Goal

A Growth member page for Old Good that looks and behaves like a real thrift shop, running entirely on sample data, with no external service connected.

## Before you build anything

Three questions to answer first and report back on, because they decide whether this is a configuration job or a real one.

1. Does the Growth storefront engine support stock quantity of one, with no product variants? Thrift has no sizes to pick and no restock. Every item is a single unit.
2. Can a sold item stay visible on the page with a sold marker, instead of being removed or hidden?
3. Can an item be held for a fixed period when added to the cart, and released automatically if checkout is not completed?

If all three are yes, this is theming and content. If any is no, that gap is the actual work and everything else is decoration. Say which, and do not start building around a workaround before Dewald has seen the answer.

## What to build

**The page.** Growth member page, own slug, shop enabled, events on. Unlisted and noindex until Dewald says otherwise.

**Theme: Old Good.** The name is a bilingual pun and the design should carry that plainness. Direction is thrift-native rather than boutique. Reference build shows it:

- Every product is a cardboard swing ticket, hanging from a rail
- Condition graded A, B or C, with the meaning stated on the page and the specific flaw written out on any C item
- Real measurements in centimetres on every item, because vintage sizing lies and returns are the killer in this trade
- Sold items stay on the rail with a sold stamp
- Shop name is editable in place on the demo page, so Jordan can type his own if he wants a different one

**Products.** Twelve placeholder items, in the reference build. Photos are drawn placeholders with a visible "photo slot" marker. Build so a real photo drops into the same slot with no rework, and so an item with no photo still looks deliberate.

**Checkout.** Runs to a confirmation screen and stops there. No gateway, no keys, no test mode. The confirmation states plainly that this is a demo and no order was placed.

**Delivery options, displayed only, priced as flat rates.** PUDO locker to locker, PAXI PEP store to PEP store, courier to the door, and collect at the market for free. Published 2026 figures are in the reference build. They are not live quotes and must be re-checked before anything goes live.

**Events.** Three sample markets. Collect at the market must be selectable at checkout and must pick a specific market.

**One-handed stock view.** A page Jordan can open on his phone at a market stall to see what is still available and mark something sold on the spot. This is the least glamorous item here and the most important one. He will be listing the same jacket on Yaga, on Old Good, and hanging it on a rail at a Saturday market. Selling it twice is how a new thrift seller burns his name in week three.

## Out of scope

Do not build, connect, or open accounts for any of the following:

- Paystack, in any mode, under any account
- PUDO or PAXI APIs
- Yaga
- A domain, an Instagram handle, or any social account
- Anything touching CIPC, VAT or company registration
- Any real customer data

Legal and tax structure is not yours. It goes to Dewald's attorney and accountant.

## You decide

Layout, typography, component structure, how the theme is stored, how the sample data is seeded, how the stock view is routed.

## Dewald decides

The shop name if Jordan wants to change it. Whether the page goes public. Anything involving money, an account, a legal entity, or Jordan's personal details.

## Acceptance criteria

1. The page loads on a phone and is usable one-handed.
2. Adding an item to the cart removes it from the rail for everyone else until the hold expires.
3. An item cannot be bought twice. Attempting it fails clearly rather than silently.
4. Sold items are still visible with a sold marker.
5. Every item shows measurements in centimetres and a condition grade. Any C grade shows its flaw.
6. Checkout completes to a confirmation that says it is a demo, with no external call made.
7. Collect at the market is selectable and records which market.
8. The page returns noindex and is not reachable from any public Growth marketplace listing.
9. Replacing a placeholder photo with a real one requires no code change.
10. Nothing on the page implies sales, reviews, ratings or followers that do not exist.

## Report back

One report at the end. Include the answers to the three questions at the top, anything in the Growth engine you had to work around, and a list of everything that will need doing if Jordan says yes.
