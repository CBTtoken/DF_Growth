# THE BOARD, PHASE 1: REPORT

**Date: 30 July 2026. Written to the format asked for in section 11 of the handoff.**

Phase 1 is built, verified against a running app, and not deployed. The migration is live on DF-Growth. The code is in the repository and uncommitted, so nothing is public yet.

---

## 1. WHAT WAS BUILT

**Public, no account, nothing gated.**

- **`/board`**, the index. Posts newest first, filter chips for the four kinds, an area strip and a trade strip, both as real links rather than dropdown state.
- **`/board/area/<area>`**, an area as a destination with its own URL, its own title ("Businesses in Boksburg") and its own place in the sitemap. An area exists only when a member is in it, so an unknown area returns 404 rather than an empty page.
- **`/board/category/<trade>`**, the same for trade, at the parent-category level the marketplace filter already uses.
- **`/board/post/<slug>`**, the post page. Title, body, price, photo, business, area, trade, a WhatsApp link to the business, share buttons, and other posts by the same member.
- **`/api/og/board/<slug>`**, the share card, rendered server-side at 1200x630 with the business name, the item and the price.
- **`/dashboard/board`**, the member's composer and his own list of posts, with take down and put back.

**Decisions you took on the day**, all three implemented as chosen: one post shape with a kind label, area drawn from the member's city with the member able to change it, and `/board` labelled The Board.

---

## 2. MIGRATIONS ADDED

One.

**`supabase/migrations/20260731160000_board_posts.sql`** creates `public.board_posts`: the member, the kind, title, body, price in cents, photo path, status, slug and three timestamps. Two indexes, row level security enabled with no policies, and `grant select, insert, update, delete ... to service_role`.

Applied and verified live on DF-Growth: 12 columns, RLS on, 0 policies, service_role granted.

**Nothing is denormalised onto the post.** Area and trade are read from `growth_clients` at query time, so a member who moves town or corrects his trade does not leave old posts filed under the old one.

**The grant is the part worth remembering.** The first version of the migration left it out, on the assumption that a new table inherits usable privileges. It does not on this project. Every board query came back "permission denied for table board_posts", and because the query code reads `data` and ignores `error`, the board rendered a polite "Nothing posted here yet" instead of failing. It looked exactly like an empty board. Found by loading the page rather than by trusting the migration, which is the same lesson this project has already learned once about verifying a migration before shipping code that reads it.

---

## 3. FETCHING A POST PAGE WITH JAVASCRIPT DISABLED

Fetched with `curl`, no browser, no JavaScript executed at any point. HTTP 200, 53,365 bytes, and the response body contained:

- The title in an `<h1>`.
- The full body text.
- The price, formatted, as text.
- The business name.
- The `wa.me` link to the business, complete with the prefilled message.
- The anonymous WhatsApp and Facebook share links.
- `og:title`, `og:description`, `og:url` and `og:image`, with the image pointing at the generated card.
- Two JSON-LD blocks: a BreadcrumbList, and an Offer with price, currency and the business as `offeredBy`, typed through the existing industry-to-schema mapping.

The generated card was fetched separately: HTTP 200, `image/png`, 1200x630, with the kind, title, price, business name and area rendered in the platform's own two fonts.

**Criterion 2 is met.** The only client JavaScript anywhere on the page is the copy-link button, and the two share links are plain anchors that work without it.

---

## 4. WHAT PERSONAL INFORMATION PHASE 1 STORES

**About members of the public: nothing.** No account, no email, no phone, no name, no comment, no like. `board_posts` holds business content written by a member about his own business, and nothing else. There is no visitor table, and the board writes nothing on a page view.

**About members: nothing new.** Everything shown comes from `growth_clients`, which already held it. The one write the board can make to a member's record is his city, saved once when he posts and has no city yet, and he is told it is being saved.

**One thing that belongs in the record rather than buried.** Board pages use the standard marketing header, which carries DigitalFlyer's own consent-gated Meta pixel, the same as `/marketplace`, `/events` and the rest of the marketing site. So a visitor who accepts the cookie banner is tracked on the board exactly as elsewhere. That is not new to this build and it is not personal information stored by us, but the handoff asked what is held at each phase and it would be dishonest to describe the board as tracking-free.

**Criterion 12 is met for Phase 1.**

---

## 5. ACCEPTANCE CRITERIA

| # | Criterion | Result |
|---|---|---|
| 1 | Post publicly viewable, no account, no login | Met |
| 2 | Server-rendered, full content to a crawler with no JavaScript | Met, verified by real fetch |
| 3 | WhatsApp share produces a card with business, item and price | Met, image rendered and inspected |
| 4 | Area pages exist as destinations with their own URLs | Met, unknown area returns 404 |
| 5 | Verified and active-this-week signals on posts | **Partly met, see below** |
| 6 | WhatsApp tap-through with no account on either side | Met |
| 7 to 9 | Likes, comments, reviews, quote-from-comment, reporting | Phase 2, not started |
| 10 | No feed ordered by engagement | Met, and there is no engagement column to rank on |
| 11 | No public account before Phase 3 | Met, none exists |
| 12 | No personal information beyond an OTP identity | Met, Phase 1 stores none |

### 5.1 Criterion 5, first half: there is no Growth verification to read

The handoff says the verified signal comes "from the existing Growth verification". **That mechanism does not exist.** The marketplace redesign in July left the verified badge out deliberately, with a note in the code that you had a separate idea for it, and nothing has been built since. There is no column, no process and no record of who has been verified or against what.

So no verified badge was built. Inventing one from what is available, being a paying member with a published page, would put a trust mark on every post on the board and mean nothing at all, which is worse than not having one.

**This needs your decision: what does verified mean, and who checks it.** The slot on the post card is where it will go.

### 5.2 Criterion 5, second half: active this week is built and currently reads false for everybody

The mechanism is built exactly as specified. It reads real issued KatisoBiz documents from the last seven days, an issued document being one with a number, which is the same definition your handover document counts by. It returns a set of members, never a count, so the underlying numbers never leave the server.

**It returns nobody, because `bizup_accounts.growth_client_id` is null on all 19 KatisoBiz accounts.** Nothing links the two products at the record level. I checked whether they could be matched automatically: there is no overlap at all on owner user id, and exactly one match on email address. They are, so far, different people.

The signal starts working the day accounts are linked, with no change to this code. Until then it is silent rather than wrong, which is the correct failure.

---

## 6. DECISIONS THIS DOCUMENT DID NOT COVER

Section 9 left these to the agent. Recorded so they are not re-litigated.

1. **Rendering.** Post, area and category pages are static with a five-minute revalidate, and the publish and take-down actions revalidate the exact affected paths, so a change is live immediately rather than up to five minutes later. `/board` itself is dynamic because it reads a filter from the URL. The crawlable pages are the cached ones, which is the right way round.
2. **Post URLs** are `/board/post/<title-slug>`, unique across the table, with a short suffix only on a real collision. `board` was added to the reserved slug list so no business page can be given that address.
3. **Category pages** exist at the parent-category level only, and a member whose trade is free text gets no category page. His posts still appear on the board and on his area page. Generating a page for every spelling a member ever typed is the classic thin-content mistake.
4. **Area pages** are built from what members actually say their city is, not from the curated dropdown, because the dropdown has a free-text escape hatch and members have used it. Hartbeespoort is in the live data and is not in the list.
5. **Taking a post down** sets a status rather than deleting the row, and the photo stays in storage. Phase 2 has to be able to answer who removed something and when.
6. **Photos** go into the existing public `client-photos` bucket under a `board/` prefix. No new bucket, no new storage policy.
7. **Table privileges** are service_role only, matching the newer `bizup_*` tables rather than the older Growth tables that grant everything to anon and rely on RLS alone.
8. **No rating on board cards.** The marketplace shows ratings and there are still zero reviews in the database. A second surface showing nothing adds nothing.
9. **Rate limiting** on posting is 15 an hour per member, high enough that nobody real will meet it, present so a stuck button cannot fill the board.

---

## 7. WHAT IS NOT DONE

- **Not deployed and not committed.** The code is in the working tree.
- **The composer has not been used by a real logged-in member.** Every public path was verified against a running app with seeded posts, and the composer was verified by build, types and lint only, because signing in as a member account is your call rather than mine. The first real post is a one-minute test and is the last thing standing between this and being live.
- **Phase 2 has not been started.** Likes, comments, reviews, quote-from-a-comment and moderation are all untouched, which is correct: the handoff asks for one phase at a time and a report between them.
- **Phase 3 remains blocked** by the data retention question in section 8.1, which is unchanged.

---

## 8. WHAT WOULD MAKE THIS WORTH MORE, IN ORDER

1. **Link the KatisoBiz accounts to Growth clients.** It switches on the one trust signal that cannot be gamed, and it is the join the WhatsApp switchboard will need anyway.
2. **Decide what verified means.** The slot exists and is empty.
3. **The 12 members with no city.** They can post, and their posts appear on the board, but they belong to no area, and area is where the belonging lives. The composer asks the first time they post, which handles it quietly for anyone who does.
4. **Seeding the board before opening it.** Section 8.2's launch audience question. A board with nothing on it teaches a visitor that the board is empty.
