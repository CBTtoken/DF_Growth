# HANDOFF: THE BOARD (V1)

**Working name. Not a brand name.**

Date: 30 July 2026
Owner: Dewald Rosema
Build executor: Claude Code
Lives in: the DigitalFlyer Growth repository and Supabase project

Third of three builds in this phase. The others are the WhatsApp lead switchboard (already handed over) and the Growth members' room. This one is the public face.

---

## 1. CONTEXT

South African small business discovery happens in Facebook groups. Local ones like "Ek's van die Ooste", buy-and-sell groups, and DigitalFlyer's own 7,500-member marketplace group. That is where the behaviour already is.

The problem with all of it is Meta's. Organic reach on a Facebook page has fallen below 5%, so a member with followers cannot reach them without paying. And Facebook Marketplace is a walled garden, so a listing there is invisible to Google forever.

This build takes that behaviour and puts it somewhere the member actually benefits from it.

**The three things this must beat Facebook at, and they are the whole product:**

1. **Reach that is not sold back to you.** A member posts, and people looking in his area see it. Every time. No algorithm, no boosting, no paying to reach people who already chose to follow him.
2. **Google can read it.** Every post and listing is a server-side rendered page. Member activity becomes indexable pages, which is how a marketplace solves the traffic problem that kills marketplaces. Meta structurally cannot copy this, because their model depends on the walls.
3. **A post becomes a quote.** Someone asks what a job costs, the member taps once, and a real priced quote goes out through KatisoBiz from his own number. Facebook can host that conversation and then has to lose it.

**What not to copy from Facebook:** the infinite algorithmic feed, engagement ranking, engagement bait, and advertising. Those exist to sell attention. This does not sell attention. If a member posts, the people who should see it see it. That is deliberately boring and it is the product.

---

## 2. GOAL

A public, browsable board of what DigitalFlyer members offer, organised by area and trade, indexable by Google, familiar enough that a Facebook user needs to learn nothing, and wired so that interest turns into a real quote from a real business.

---

## 3. BUILD ORDER

**Three phases, and the order matters for a reason beyond engineering.** Phase 1 needs no accounts from the public at all. Phases 2 and 3 progressively do. Every step that holds personal information for non-members increases POPIA exposure, so the phase that delivers the traffic and SEO value ships first and carries no exposure with it.

Do not start Phase 3 until the item in section 8.1 is closed.

---

## 4. PHASE 1: THE BOARD, NO ACCOUNTS

Anyone can browse. Nobody signs in. Most of this is assembly from what Growth already has.

- **Public browse** by area and trade category, using the same category and suburb data the lead switchboard depends on. If that work has not landed yet, it is a shared dependency, not a duplicate.
- **Member posts.** A member publishes an offer, a listing, or an update from inside Growth. Familiar shape: image, text, price where relevant.
- **Every post is a server-side rendered, indexable page** with proper metadata. This is non-negotiable and it is the single most valuable thing in this build. Client-side rendering was one of the reasons Core was switched off.
- **Area identity, not just an area filter.** A member belongs to an area and the board presents it as a place, with a name and a page of its own. "Ek's van die Ooste" works because people feel they belong to the Ooste. Copy the belonging, not the filter.
- **Share to WhatsApp and Facebook**, one tap, no account, with a dynamic OpenGraph preview image rendered server-side so a shared link lands in a group chat as a real card with business name, item and price rather than a bare URL. Growth already generates dynamic images via next/og with Satori. Reuse it.
- **Tap through to the member's own WhatsApp** via a wa.me link. No account needed on either side.
- **Two trust signals on every post:**
  - **Verified**, from the existing Growth verification.
  - **Active this week**, derived from real KatisoBiz document activity. Facebook groups are full of businesses that died years ago and nobody can tell. This one cannot be gamed, because it comes from actual issued documents. Do not expose the underlying counts, only the signal.

---

## 5. PHASE 2: INTERACTION, OTP IDENTITY

The public can now react, but does not get a full account.

- **Likes, comments and reviews require a verified identity, not a signup.** Growth already does verified reviews with email OTP and bot protection. Reuse that exact mechanism. This is the point: prove a person is real without asking them to join anything.
- **Sharing stays anonymous.** Never gate a share.
- **Quote from a comment.** A member sees a comment asking about price or availability and can turn it into a KatisoBiz quote in one tap, prefilled with what the board already knows. This is the feature no competitor can build and it should feel like one action, not a handoff between two products.
- **Moderation.** Comments are public speech about a named business, which is a different risk from a review tied to a transaction. Required:
  - Report button on every comment and post.
  - Reported content held and surfaced to the member and to platform admin.
  - Takedown path with a logged decision: rule, actor, timestamp, outcome.
  - Auto-enforce anything countable, hold anything needing judgement. Same engine and same split as the members' room moderation, different rule set.
  - **A member must be able to report a comment on his own post and get it out of public view quickly.** That is the call Dewald will otherwise receive personally.

---

## 6. PHASE 3: PUBLIC ACCOUNTS AND CHAT

Only after 8.1 is closed.

- **Optional public account.** A person who wants to keep a profile, track what they follow, and chat in-app can create one. Nobody is ever forced to. Browsing, sharing and OTP interaction all keep working without it.
- **Growth Chat, one to one, public to member.** Runs on the same messaging infrastructure as the members' room. Do not build a second messaging system.
- **Both paths stay live, side by side.** Message in Growth Chat, or tap through to the member's WhatsApp. Let usage decide which wins rather than forcing either.
- Member controls whether he accepts in-app chat at all.

---

## 7. OUT OF SCOPE

- Algorithmic or engagement-ranked feeds. Ordering is by area, category, recency and the trust signals. Nothing else.
- Advertising or paid placement of any kind.
- Payments on the board. Payment belongs on the KatisoBiz invoice.
- A second messaging system. Phase 3 uses the members' room infrastructure.
- Native apps.
- Any third-party social SDK or Meta integration beyond outbound share links.
- Public accounts before section 8.1 is resolved.

---

## 8. WHAT NEEDS DEWALD

### 8.1 Blocking Phase 3: settle data retention

The record currently holds three contradictory positions: the published privacy policy says 12 months, the internal rule says 60 days, invoicing needs 5 years. The code has never been audited against any of them. Registration as Information Officer is in place under Digital Flyer (Pty) Ltd, 2018/350974/07, which covers this build.

Holding personal information for members is one thing. Holding it for members of the public who never bought anything and never joined anything is another, and it needs a settled, accurate, published position first. **This blocks Phase 3 only. Phases 1 and 2 can proceed.**

### 8.2 Not blocking, but needed

- Post types and what a member is actually posting. Offers, listings, updates, jobs done, all of the above.
- Whether area is drawn from the member's registered suburb or chosen by the member.
- Moderation rule set for public comments, distinct from the group rules.
- Launch audience. The 7,500-member marketplace group is the densest starting point available and the board should not open empty.

---

## 9. WHAT THE AGENT DECIDES

- Schema and namespacing inside Growth's existing project. All changes as migration files.
- Rendering and caching strategy for indexable pages at volume.
- OpenGraph image generation approach, reusing the existing next/og implementation.
- How the "active this week" signal is computed and cached without exposing underlying counts.
- Rate limiting on OTP issuance and on comment and review submission.
- Interface, including empty states for an area with no members and a category with no posts.

---

## 10. ACCEPTANCE CRITERIA

1. A member post is publicly viewable with no account and no login.
2. Every post renders server-side and returns full content to a crawler, verified against a real fetch without JavaScript.
3. Sharing to WhatsApp produces a preview card with business name, item and price where relevant, not a bare link.
4. Area pages exist as destinations with their own URLs, not only as filter states.
5. Verified and active-this-week signals appear on posts, and active-this-week derives from real KatisoBiz document activity.
6. Tapping through to a member's WhatsApp works without an account on either side.
7. Likes, comments and reviews require OTP verification. Sharing does not.
8. A member can turn a comment into a KatisoBiz quote in one action.
9. Every comment and post can be reported, and reported content is held and surfaced with a logged decision trail.
10. No feed anywhere is ordered by engagement.
11. No public account can be created until Phase 3, and Phase 3 does not begin until 8.1 is closed.
12. Phases 1 and 2 store no personal information for anyone other than a verified email or phone used for OTP.

---

## 11. HOW TO REPORT BACK

One consolidated report at the end of each phase, not each feature.

Covers: what was built, every migration added, the result of fetching a post page with JavaScript disabled, what personal information is stored at each phase and where, any acceptance criterion not met and why, and any decision made that this document did not cover.

---

## 12. MASTER REFERENCE UPDATES ARISING

- **§5.6 HelpLift.** Correction. HelpLift is a separate entity with its own board, not under the DigitalFlyer SA umbrella. Dewald is a director. The Information Officer certificate covers Digital Flyer (Pty) Ltd only. The real-data gate in §5.6 therefore still stands and is a question for HelpLift's board.
- **§1.** Information Officer registration confirmed: Digital Flyer, registration 2026-061838, registered 11 July 2026, private company 2018/350974/07, Dewald Rosema appointed. Covers everything trading under the (Pty) Ltd.
- **§6 audiences.** The Facebook Marketplace group at 7,500 members is now the intended launch audience for the board, which changes it from a stranded asset into the seed for the strongest distribution play in the portfolio.
- **§10.5.** "Google Business Profile rather than the marketplace" was parked on the reasoning that marketplaces die on traffic. This build answers that objection directly by making member activity indexable. Worth revisiting the park.
- **New standing item.** Data retention must be settled and audited before any public account exists.
