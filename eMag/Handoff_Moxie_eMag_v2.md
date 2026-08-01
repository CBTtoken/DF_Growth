# CLAUDE CODE HANDOFF: MOXIE eMAG BUILDER v1

**Prepared for Dewald Rosema | 1 August 2026 | Supersedes Handoff_Moxie_Pipeline_v1**

---

## 1. CONTEXT

Moxie is a monthly digital magazine published on the 1st of each month for Smart Value Club. Dewald is currently the sole editor, writer, publisher and designer.

The current process: articles are drafted in a separate Claude project, exported to PDF, imported into Adobe Express, and the layout is then repaired by hand. Spacing, placement and images are fixed manually, every issue. Roughly five full days a month. The writing is not the bottleneck. The manual repair is.

This build replaces Adobe Express with a browser-based eMag builder, and replaces the PDF-first output with an HTML edition that reads on a phone.

**Moxie is digital only. It is never printed.** PDF is an optional export, not the product.

**Reference files supplied:**

- `Moxie_June_2026_Edition.pdf`, Edition 01, 41 pages, published
- `MOXIE_July26_Final.pdf`, Edition 02, 51 pages, published
- `Moxie_Aug_Ed.pdf`, the Edition 03 production brief, 9 pages, not an edition

June and July are the design reference. The August brief carries the section list, the flatplan structure, the colour rules and the advertisement specifications. Use it as a specification, not as content.

---

## 2. GOAL

A publisher writes or pastes an article, picks a section type, uploads images, positions them with controls, approves it. Repeats until the edition is full. Drags the articles into running order. Page numbers and contents build themselves. Previews the whole edition. Publishes.

No export, no import, no manual repair, no hand-numbered contents page.

---

## 3. WHERE IT LIVES

- Inside the existing KatisoBiz application, at `katisobiz.co.za/emag/moxie`.
- Uses the existing Supabase project and the existing Supabase auth. No new project, no new vendor, no new auth system, nothing added to the monthly cost base.
- Build it for one publication, Moxie, but keep publication-specific values (name, colours, logo, section list) in configuration rather than hardcoded. Do not build multi-tenancy. Just do not make it impossible later.

---

## 4. THE PAGE MODEL

**Fixed A4 pages, not reflowing content.** A4 proportions, digital only, no bleed, no crop marks, RGB.

On a phone the reader pinches and zooms, exactly like every other digital magazine. This is a deliberate decision and it is not a compromise: fixed pages make text wrapping, image placement and PDF export straightforward and deterministic.

Because pages are fixed, an article occupies a known number of pages, which is what makes the flatplan and the contents page work.

---

## 5. WHAT TO BUILD

### 5.1 Settings

One screen. Publication name, logo upload, colour palette, fonts.

From the August brief, the colour rules are binding: charcoal is editorial, orange is advertising, teal is Smart Value Club. Smart Value Club palette is never mixed with Moxie colours on the same page.

**Do not build automatic brand extraction from a sample PDF.** Colours are picked, the logo is uploaded.

### 5.2 Section templates

Derive the section types and their visual treatment from June and July. Where the two differ, July wins, it is more recent.

From the August brief the sections are: Cover, Editor's Letter, Contents, Discover, Thrive, Explore, Think, Roam, Gather, Personality, Believe, Play, Open, Savings, Partner advertorial, plus advertisement formats.

That is more section names than layouts. Reduce it to four to six actual layout templates that the sections map onto. A section is a label and a colour band; a layout is a page structure. Report which sections you mapped to which layout.

Advertisement slots, from the brief: full page, half page horizontal, half page vertical, quarter page. Two quarter pages can share one page. Advertisers supply finished artwork. **The builder never designs an advertisement**, it places supplied artwork into a slot.

A section list screen lets the publisher see the sections, a short description of each, and reorder the default running order.

### 5.3 The article editor

Not a chat interface. **Do not build an AI writing assistant.** Dewald writes with Claude elsewhere and pastes the finished text in. This is explicitly out of scope.

The editor provides:

- A title, a standfirst, body text, a writer credit
- A section type picker
- Rich text limited to what the templates support: paragraphs, subheadings, pull quotes, lists, bold, italic. Nothing that can break a layout.
- Image upload with, per image: which slot on the page, which side, wrap text or full width, caption, alt text, and an optional text overlay with a colour picker for the overlay text
- A live preview of the article as its finished pages, updating as the controls change
- An approve action that stores the article with its page count

**Text passes through exactly as written. Do not spellcheck, autocorrect, reformat or rewrite any body text.** Dewald is dyslexic and text is approved before it reaches this stage.

**Layout is deterministic.** Adjustments happen through the controls above. No model call lays out a page, at any point, for any reason. The same article with the same settings must render identically every time.

### 5.4 The flatplan

One screen showing every approved article and advertisement as a block with its page count, in running order, drag to reorder.

The default order, from the August brief: Cover, inside front cover advertisement, Editor's Letter, Contents, then articles and advertisements through the run, inside back cover advertisement, back cover.

Rules from the brief, enforce them: advertisements sit between sections, never mid article, never inside the cover story. Half and quarter pages sit adjacent to editorial and never break an article across a spread.

**Page numbers are derived from this screen, never typed.** The contents page is generated from the actual assembled edition, after ordering. Reordering two blocks renumbers everything correctly.

### 5.5 Preview and publish

- Scroll preview of the whole edition, on desktop and on a phone.
- Publish produces the edition at a stable URL, mobile friendly, with the cover as the link preview image.
- A PDF export toggle per edition. When on, the reader can download a PDF. When off, no download link is offered.
- **Do not claim the PDF toggle prevents sharing.** Anything a browser displays can be captured. It is a convenience control, not access control. Do not build DRM and do not describe it as protection anywhere in the interface.

**Do not build a page-turn flipbook.** Scroll only for v1.

### 5.6 Logins and roles

Use the existing Supabase auth.

- **Writer:** creates and edits articles, submits for approval. Cannot publish.
- **Publisher:** everything, including the flatplan and publish.

Dewald is publisher. Jaco and Samantha are writers. No self-signup, accounts are created by the publisher.

---

## 6. OUT OF SCOPE

Named explicitly because each of these was considered and cut:

- AI writing interface or chat inside the product
- Automatic brand or colour extraction from an uploaded sample
- Page-turn flipbook animation
- Advertiser self-service upload portal
- Multi-tenancy, other publications, customer accounts
- DRM, copy protection, watermarking
- Email distribution, analytics, archive pages, comments
- Any redesign or improvement of the Moxie look. Match June and July.

---

## 7. WHAT YOU DECIDE VERSUS WHAT NEEDS DEWALD

**You decide:** framework, storage of articles and images, editor library, how templates are implemented, how the preview renders, PDF generation method, folder and route structure.

**Stop and ask Dewald:**
- Any font in June or July that is not available or licensed for web use
- Any section in the brief that has no visual precedent in June or July
- Anything requiring a new paid service
- Anything that would change existing KatisoBiz or Growth behaviour. The Desk build touched `src/proxy.ts` and `src/app/robots.ts`; be careful in the same area and verify the public sites still index.

---

## 8. ACCEPTANCE CRITERIA

The test edition is **July**, rebuilt from its own content. August content does not exist yet and most of it is waiting on interviews, photographs and advertiser artwork. Do not generate placeholder content and present it as a passing test.

1. July, rebuilt through the builder, is visually close to the published July PDF. Dewald judges close.
2. An article can be created, imaged, positioned and approved without leaving the browser.
3. Image controls work: slot, side, wrap, caption, overlay, overlay text colour. Each renders as previewed.
4. The same article with the same settings renders identically on repeat runs.
5. Reordering two blocks in the flatplan renumbers every page correctly and rebuilds the contents page to match.
6. The contents page page numbers match the assembled edition exactly.
7. No heading is separated from the text below it by a page break. No text overlaps, overflows or is truncated.
8. The published edition reads on a phone and on desktop.
9. PDF export produces a file that matches the HTML edition. With the toggle off, no download is offered.
10. A writer account can create and submit but cannot publish.
11. All body text in the output is byte-identical to what was pasted in.
12. No step in producing an edition requires a model call.
13. The Growth and KatisoBiz public sites still return their normal `robots.txt` and no `x-robots-tag: noindex`. Verify by fetching headers directly.

---

## 9. HARD STOP

Dewald has set an abort time. If criterion 1 is not met by then, stop and report what works.

Build in this order so that stopping early still leaves something usable: templates and rendering first, then the flatplan and contents, then the article editor, then publish, then roles. A renderer with no editor is still useful. An editor with no renderer is not.

Report back once: what was built, every criterion pass or fail, which sections map to which layouts, anything derived from June and July that you had to guess at, and how to run it.
