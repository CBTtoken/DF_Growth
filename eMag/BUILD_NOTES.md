# Moxie eMag builder: build notes

Running record of what was built, what was derived from the reference
editions, and what is still open. Updated as the build progresses.

## Where it lives

- Routes: `src/app/bizup/emag/moxie/*`, served at `katisobiz.co.za/emag/moxie`.
- No change to `src/proxy.ts` was needed. The existing KatisoBiz host branch
  already rewrites `katisobiz.co.za/<path>` to `/bizup/<path>`, so the eMag
  sits inside that rewrite for free. Verified locally with a Host header:
  `katisobiz.co.za/emag/moxie` returns 200.
- Verified unchanged: `robots.txt` on both hostnames, and no `x-robots-tag`
  header on the Growth or KatisoBiz public pages. The builder's own pages
  carry a page-level noindex through route metadata.

## Reference files

The handoff names three files. None of them exist under those names. What
was used instead, found in `C:\Users\dewal\Downloads`:

| Handoff name | Used | Notes |
| --- | --- | --- |
| `Moxie_June_2026_Edition.pdf` | `Moxie June Edition/` folder | All 41 pages already exported as PNG. Matches the stated page count. |
| `MOXIE_July26_Final.pdf` | `Moxie July Edition-13/19/24/30.png` | Only four July pages exist as images. The full July PDF could not be rendered on this machine: no poppler, no PDF rasteriser. |
| `Moxie_Aug_Ed.pdf` | not found | The August production brief is missing entirely. |

Consequences, both of which need Dewald:

1. **The August brief is missing.** The section list, the default running
   order and the advertisement specifications in this build were taken from
   the handoff's summary of that brief plus what June and July actually do.
   Anything the brief says that the handoff did not repeat is not in here.
2. **Only four July pages are available as images.** Acceptance criterion 1
   asks for July rebuilt and judged against the published PDF. Three of the
   four have been rebuilt. The rest needs the remaining July pages exported
   as PNG, the same way June already was.

## Palette, measured not guessed

Sampled pixel by pixel from the 300dpi page exports:

| Colour | Value | Role |
| --- | --- | --- |
| Orange | `#c85a1e` | The Moxie mark, advertising, rules and kickers |
| Charcoal | `#1e2020` | Editorial bands, the footer, body text |
| Cream | `#f7f3ee` | Page |
| Teal | `#0b6e6e` | Smart Value Club only |

## Geometry, measured not guessed

A4, 210 x 297mm, digital only, no bleed, RGB.

| Element | Measured | Used |
| --- | --- | --- |
| Top orange bar | 48px at 300dpi | 4mm |
| Vertical rule, from left edge | 107px | 9mm |
| Vertical rule width | 6px | 0.5mm |
| Text column, left and right margin | 166px | 14mm |
| Running head hairline | 117px from top | 10mm |
| Footer band | 118px | 10mm |
| Body text | 50px extent, 66.5px line pitch | 12pt on 16pt |
| Paragraph gap | 22px on top of the line pitch | 1.9mm |
| Standfirst | 54px extent, 72px pitch | 13pt on 17.3pt |
| Pull quote | 100px pitch | 17pt on 24pt |
| Headline, in a charcoal band | 92px em | 22pt |
| Headline, over a photograph | 143px em | 34pt |
| Headline, personality opener | 159px em | 38pt |
| Running head and kicker | 27px cap height | 9pt |

## Realigned to the Editorial and Design Reference, 1 August 2026

Dewald supplied `Moxie_Editorial_and_Design_Reference_2026.md` after the
first checkpoint. It is the single source of truth and supersedes the 2026
Production Layout Guide where values differ. Everything below the line was
rebuilt against it. What it changed:

**Two of the three typefaces were wrong.** See the type section below.

**Pillars, sections and layouts are three things, not one.** The first
version collapsed them. A pillar is the editorial territory and prints left
in orange with an orange underline. A section is the standing slot and
prints right in charcoal. A layout is the page structure. Eight pillars,
four structural labels, seventeen standing sections, seven layouts.

**Values corrected against the reference**, where my measurements off the
published pages had been the only source:

| Item | Was | Now | Why |
| --- | --- | --- | --- |
| Left margin rule | 9mm | 10mm | 4mm left of the 14mm margin |
| Rule and hero base rule | 0.5mm | 1.5pt | Stated |
| Hero band | content height | 52mm minimum | Stated |
| Subheadings | 9.5pt | 11.5pt | Range 11 to 12pt |
| Space above a subheading | 4.5mm | 8mm | Stated |
| Pull quote | Spectral 17pt | Playfair Italic 14pt on 20pt | Stated |
| Stat block figures | 24pt white | 38pt orange | Range 36 to 48pt |
| Captions | 8pt, warm grey | 9.5pt, `#888888` | Stated |
| Section label bar | plain | pillar underlined in orange | Stated |
| BELIEVE pages | not handled | teal margin rule and teal hero band | Stated |

**Three new palette values** that measurement could not have found, because
they appear on pages I did not have: border grey `#E0D8D0`, light mint
`#A8D0D0` for the Moxie Tip label only, caption grey `#888888`.

**Three mandatory devices added**: the four-column fact grid, the Moxie Tip
box and the writer credit. The stat block and the pull quote already
existed and were restyled.

**A real consequence worth knowing.** The reference raised body copy from
11pt to 12pt after Edition 01 for mobile legibility, and raised the
subheading and stat sizes with it. July was laid out at the old sizes. So
the same words now need more room, and July page 13 no longer fits on one
page. It is split into an opener and a run-on page, which is what the
reference says The Quiet Hero is anyway: a two-page section. Expect the
same for other July pages when the rest of them arrive.

**Answered by the reference, so no longer open questions:** the published
edition URL, the section list, Savings, the ad formats and their trim and
bleed sizes, the standing ad inventory, and the default 38-page flatplan.

**Em dashes.** Dewald, 1 August 2026: the rule applies to Moxie too, and
the reference states it as non-negotiable across articles, briefs, headings
and captions. The earlier exemption is withdrawn. The July fixture's one em
dash, in Alice Myburgh's credit line, is now a comma. This does not conflict
with byte-identical passthrough: the builder still never rewrites text, and
the check belongs in the editor, where a publisher is shown the em dash and
fixes it themselves before approving.

## Type: settled, and I had it wrong

Section 5 of the reference names three typefaces and adds "no others,
ever". Two of my three guesses were wrong, and the fourth face I had
introduced is explicitly banned.

| Job | Correct | I had guessed |
| --- | --- | --- |
| Display, headlines, logotype, pull quotes | **Playfair Display** | Playfair Display, correct |
| All body copy and italic body | **Source Serif 4** | Spectral, wrong |
| Kickers, labels, subheadings, stat numbers, footers, captions | **Barlow Condensed** | Oswald, wrong |
| Nothing. Never used. | | Inter, banned by name |

Worth recording rather than quietly fixing. The pages were read correctly:
I cropped them at 300dpi and matched letterforms carefully. The conclusion
was still wrong, because a rendered letterform cannot tell you which of
several very similar faces produced it, and Spectral, Source Serif, Oswald
and Barlow Condensed are close enough at 12pt that reading pixels cannot
separate them. The specification could, and the specification existed. Ask
for it first.

The rebuilt SA Personality page now deliberately differs from published
July, which set that page in Helvetica.

All three are self-hosted through `next/font`, which is what makes "renders
identically every time" true rather than hopeful. Barlow Condensed is
already in the root layout for the Growth wordmark, so it costs nothing
extra.

## Sections mapped to layouts

Fifteen section names, seven page structures, four of them editorial. Live at
`/emag/moxie/sections`.

| Layout | Sections that open on it |
| --- | --- |
| Feature opener | Discover, Explore, Think, Roam, Gather, SA Personality |
| Band opener | Open, Thrive, Believe, Partner |
| Run-on | Every page of every article after the first |
| List | Play, Savings |
| Cover | Cover |
| Contents | Contents, generated from the flatplan |
| Advertisement | Full, half horizontal, half vertical, quarter |

The feature opener carries the difference between July page 30 and July page
19 as settings rather than as a second template: banner height, whether the
type sits in a gradient or a solid band, and whether the page is set in the
serif or the grotesque.

## Decisions worth recording

**Body text is stored as plain text with emphasis held as offsets beside it**,
not as markdown or HTML. Criterion 11 is that output is byte-identical to what
was pasted. Markdown means re-serialising, HTML means escaping, and both change
the string. Offsets leave it alone.

**Layout is frozen, not recomputed.** Page breaks will be measured once, when
an article is approved, and stored with the article. The renderer replays them.
That is what makes repeat runs identical and the contents page trustworthy.

**No model call is involved in producing a page**, at any point.

**The magazine's own text is exempt from the platform's no-em-dash rule.** A
July credit line reads "Alice Myburgh — Marloth Park", and it has to survive
exactly. The house style check only scans `src/` and `scripts/` for `.ts`,
`.tsx`, `.js`, `.jsx` and `.mjs`, so article content in the database, and the
July fixture held as `.json`, are outside it by construction rather than by
exception.

## Three fixes after the first review

1. **Ghost type on the Think banner.** The reference photograph had been cut
   out of the published page, so it carried the published page's own white
   headline baked into the pixels, and the builder then drew its headline on
   top. Re-cropped from the right-hand part of the same banner, which has no
   type over it. A lesson about reference material rather than about the
   renderer: any photograph lifted off a laid-out page brings that page's
   type with it.
2. **Photographs came out darker than the original.** The scrim under
   overlaid type was one fixed gradient at 72 percent. It is now a control
   with three settings, none, light and strong, defaulting to light, because
   a headline over a bright sky needs one and a headline over a shadow does
   not.
3. **A quote beside a picture hung from the picture's top edge.** It was a
   CSS float, and a float cannot centre text against the thing it sits
   beside. Pull quotes now take an optional `beside` naming the asset, and
   the pair renders as a row with the quote centred. Explicit rather than
   inferred: the renderer never guesses that a figure followed by a quote
   was meant to be a pair.

## The database, applied 1 August 2026

`supabase/migrations/20260801160000_emag_moxie.sql`, applied to the live
DF-Growth project through the Management API because no Supabase CLI is
installed on this machine. Seven tables, all prefixed `emag_`, all additive:
nothing existing was altered or dropped.

Verified live after applying: all seven tables exist, all seven carry their
`service_role` grants, and the Moxie publication row is seeded with thirteen
pillars and the correct palette.

| Table | What it holds |
| --- | --- |
| `emag_publications` | Name, palette, pillars, sections, logo. One row. |
| `emag_members` | Who may use the builder, and as writer or publisher. |
| `emag_editions` | An edition, its slug, status and PDF toggle. |
| `emag_articles` | Authored blocks, and the frozen pages after approval. |
| `emag_assets` | Uploaded images and every placement control. |
| `emag_ads` | Supplied artwork, format and position. |
| `emag_flatplan` | The running order. The only place order is recorded. |

Two constraints are worth knowing about, because they encode decisions
rather than tidiness. An approved article must carry frozen pages and a
non-zero page count, because the contents page trusts `page_count`
absolutely and one stale count silently renumbers everything after it. And a
flatplan row must point at exactly the thing its `kind` says it does.

Pillars and sections are `jsonb` rather than tables. Dewald has said the
pillars are guidelines he expects to edit, they are read as a whole list
every time and never joined against, and a table would buy referential
integrity over a list one person edits on one screen at the cost of a
migration every time the shape changes.

## Page numbers are derived, never typed

`src/lib/emag/flatplan.ts` holds the calculation the whole build turns on.
`planPages` is pure: rows in, page numbers out, no database and no clock, so
the same order always produces the same numbering.

The one place the sum is not "add up the parts" is quarter pages, which
share a physical page. They pair in running order, and a quarter page with
nothing to pair with keeps its own page rather than being silently dropped.

The flatplan screen renumbers in the browser as blocks move, using the same
rule, because a preview that renumbers differently from the save is worse
than no preview.

Rules from the brief are reported, not enforced by refusal, with one
exception. An unapproved article blocks, because its length is not final and
every page number after it will move. An advertisement with no artwork
blocks, because that page would publish blank. Everything else is a warning:
a publisher who wants something odd at 11pm before publication should be
told it is odd, not stopped.

## Access

Existing Supabase auth, no new system, no self-signup. A row in
`emag_members` is the whole permission model. Writers create and submit,
publishers do everything including the flatplan and publishing.

Checked in the server actions as well as the screens, because a server
action is a public endpoint and hiding a button says nothing about what can
be posted to it. The reorder action also verifies every block id belongs to
the edition being reordered.

Dewald is a publisher on both `info@digitalflyer.co.za` and
`dewald@digitalflyer.co.za`, so whichever he is signed in as works.

## Built so far

- Palette, geometry and type as a scoped stylesheet, `moxie.css`.
- The page frame: top bar, running head, left rule, live area, footer with a
  derived page number.
- Blocks: paragraph, subhead, pull quote, list, figure with side and wrap and
  caption and overlay, statistics strip, repeating rows.
- Openers: banner and band, three headline sizes, two faces.
- Three July pages rebuilt from their own content, at `/emag/moxie/rebuild`.

- The database, applied live and verified.
- The flatplan: running order, drag or nudge to reorder, derived page
  numbers, rules checked.
- The generated contents page, built from the running order every time it
  renders. Nothing about it is stored, so there is no second copy of the
  numbering to fall out of step with the first.
- Editions: list, and starting one with its cover, contents and back cover
  already in the running order.
- Access: writer and publisher, enforced in the actions as well as the
  screens.

- The article editor, with its live preview and the measure-then-freeze
  approval described below.
- Picture upload and every placement control.

## How pagination actually works

The promise is that the same article renders identically every time and
occupies a known number of pages. That is delivered by splitting the problem
in two, and the split is the whole design.

**Measuring** happens once, in the browser, in
`src/components/emag/useMeasuredPages.ts`. A hidden column exactly 182mm
wide, positioned off screen but genuinely laid out, holds one rendered copy
of every block with the real stylesheet applied. Heights are read off it,
margins included. Nothing is estimated from character counts, so a long word
or an odd photograph aspect is measured rather than guessed at. Images are
watched for load, because a page measured before its photograph arrived is
measured wrong, and that is the single most common way a preview and a
published page disagree.

**Splitting** happens in `src/lib/emag/paginate.ts`, which is pure. Heights
in, page breaks out, no database and no clock. Greedy and block level,
because paragraphs never split across a page break, which the reference
states as an absolute rule and which is also what makes the problem
tractable: the unit is a whole block, so there is no partial line to reason
about.

A subheading is measured together with whatever follows it, so a heading can
never be stranded at the foot of a page. That is acceptance criterion 7 and
it is enforced by construction rather than by checking afterwards.

The result is written to `emag_articles.pages` on approval and replayed by
the renderer from then on. Editing an approved article clears those pages
and returns it to draft, because pages that no longer match the text they
came from are worse than none: the flatplan would keep numbering the edition
off a page count the article no longer has.

Two things are reported rather than silently tolerated: a block taller than
a whole page, and a page that ends more than 20mm short because something
was pushed over. The second is the reference's own white space rule.

## The em dash rule, in the product

Approval refuses an article containing an em dash and says exactly where it
is. It does not remove it. Byte-identical passthrough and "no em dashes" are
both real rules, and the only way to honour both is for the publisher to fix
it themselves.

The check lives in `articles/actions.ts`, which had to build its own regular
expression from character codes: the repository's house style check scans
for exactly these characters, so a file that hunts for them fails the hunt.

## Verified

- Migration applied and confirmed live: seven tables, seven service_role
  grants, publication row seeded.
- `emag-assets` storage bucket created and confirmed, public, 25MB limit,
  images and PDF only.
- Production build compiles. The only type error is pre-existing and nothing
  to do with this work: stale generated types under `.next` referencing
  `src/app/desk`, which contains no files at all. Clearing them leaves the
  typecheck clean. Worth knowing about before the next deploy.
- Unauthenticated requests to every builder route redirect to login.

## Built as a product, not as Moxie

Dewald, 1 August 2026: "even though we are building this for me to do
Moxie, the aim is to turn this into a product for any magazine editor and
publisher, so let's not make things the only option, let's build with
multiplying in mind."

Full multi-tenancy is still not being built, and should not be: it would
slow down the edition he actually needs. What has been removed is Moxie
being *assumed*.

**The renderer no longer knows which magazine it is drawing.** `Page.tsx`
imported the Moxie constant for the footer. It now takes an imprint, and a
grep for MOXIE in that file returns nothing.

**Every design value is a setting.** `lib/emag/design.ts` holds the token
list: twenty controls across type, page and colour, each with its unit, its
range, its default and, where the publication has a written design
reference, the value that reference specifies. The stylesheet reads custom
properties and falls back to Moxie's numbers, so a publication that has
never opened settings renders exactly as before.

**The settings screen is generated from that list**, so adding a control is
one entry in one file and nothing else. Adding it to a form by hand is
exactly how a product ends up with a value nobody can change.

**House rules are per publication.** "No em dashes" is Moxie's rule, not a
fact about magazines, and it now lives in `emag_publications.house_rules`.

Verified end to end: setting `footerSize` and a primary colour in the
database put `.mx{--mx-footer-size:14pt;--mx-orange:#0000ff;}` into the
rendered page, and clearing them removed the rule entirely rather than
leaving a stale override.

**The typefaces are chosen, not fixed.** `lib/emag/fonts.ts` is a library of
ten families: four that can carry a headline, five that can carry running
text at 12pt for two thousand words, three condensed faces for labels. The
publication picks one for each of three roles and the settings screen shows
each option set in itself, so the choice is made by looking rather than by
recognising a name.

The set is curated rather than open, and that is a deliberate limit. The
fonts are generated and served from this application at build time, which
is what makes "renders identically every time" true and what lets a PDF
embed the face it is drawing with. A face the build has never seen cannot
be embedded, and a face fetched at read time may not arrive. All ten are
declared with preloading off, so a browser only downloads the three a page
actually uses.

Moxie's three are the defaults and the reference, confirmed by Dewald on
1 August 2026: a publication that changes nothing is Moxie.

Verified the same way as the sizes: choosing Bodoni and Oswald put
`--mx-display` and `--mx-label` into the page pointing at those families,
and clearing the settings removed the rule entirely.

**Still Moxie-shaped, and queued rather than forgotten:** the route is
`/emag/moxie` and should become `/emag/[publication]`; and pillars and
sections are read from the `MOXIE` constant on three screens rather than
from the publication row, although the row already holds them. Neither is
hard, both are cheaper now than later, and neither blocks Moxie.

## Publishing, and where the PDF comes from

An edition is assembled by replay. The articles' pages were frozen at
approval, the numbers come from the running order, the contents page is
generated from that same order, and the cover's also-in-this-edition list is
built from it too, so it cannot list an article the edition no longer
carries. Nothing is laid out again at publish time.

Publishing refuses if there is a blocking problem and names it. Only two
block: an unapproved article, whose length is not final so every page after
it will move, and an advertisement with no artwork, which would publish a
blank page somebody paid for.

**The PDF is the same HTML, printed.** There is no second renderer. The
ninth acceptance criterion is that the export matches the HTML edition, and
the only way to guarantee that rather than test for it is for both to be the
same thing: a separate generator drifts from the first the week after it is
written, and the drift shows up in a reader's download rather than on any
screen we look at. So the download route serves the same pages with a print
stylesheet that makes each one its own A4 sheet, and the browser makes the
file. It also means the fonts are the ones already self-hosted and the page
breaks are the frozen ones.

The PDF switch decides whether a download is offered, and the interface says
in as many words that it is a convenience rather than a lock. With it off
the print route returns not found rather than refusing, because pretending
otherwise would be claiming protection that does not exist.

**A published edition is readable by anyone with the link.** There is no
subscription check in front of it, which is a decision not yet made rather
than an oversight, and the publish screen says so. Editions are not indexed
for the same reason. An unpublished edition returns not found rather than
forbidden, so guessing a slug does not reveal that next month exists.

Verified end to end against the live database: an approved article was put
into a running order, the edition published, and the public URL returned it
with no session at all. Folios came out cover unnumbered, contents 2,
article 3. The contents page listed the article at its real page. A draft
edition returned 404, and so did its print route. The production build
compiles.

## Not built yet

1. An editable sections screen, with the default running order reorderable
2. A screen for the publisher to create writer accounts
3. Cover image upload, which currently has a slot but no way to fill it
4. The generalisation items listed above
