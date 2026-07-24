# DigitalFlyer Growth
## Design Skill Installation and a Real Design Pass

Internal document for Claude Code handoff. Prepared 18 July 2026 by Dewald Rosema. Two different goals here, don't apply the same instruction to both: DigitalFlyer's own platform pages need *more consistency*, the member template system needs *more genuine diversity*. Claude Code already has full context on both, this document is about direction, not re-explaining what exists.

**Confirm current design tooling before starting.** If any frontend design skill is already installed in this environment, check what it is and what it's already been configured to do before adding a second one, don't stack overlapping skills blindly.

---

## 1. Install the Design Skills

1. Install Anthropic's own first-party frontend-design skill if not already present, this is the baseline fix for generic, default-feeling output (the "Inter font, purple gradient, rounded card" pattern), install this before anything else.
2. Install one strong community design skill suite on top of it, evaluate `Taste Skill` (github.com/Leonxlnx/taste-skill) or `ui-ux-pro-max-skill` (github.com/nextlevelbuilder/ui-ux-pro-max-skill), both are actively maintained and adjustable rather than locked to one look. Pick whichever installs more cleanly into this project's actual stack (Next.js, Tailwind, shadcn/ui).
3. Install `Ilm-Alan/frontend-design` (github.com/Ilm-Alan/frontend-design) specifically for Section 3 below, its aesthetic-anchor system (locking palette, typography, and texture to specific tokens per anchor) is the right mechanism for making the 10 member templates genuinely distinct rather than superficially different.

None of this touches application logic, payment flows, data model, or anything functional. This is a visual-layer pass only. Everything built and confirmed working across every prior sprint (contact-reveal-after-submission, package types, booking calendar, checkout, RLS, rate limiting, all of it) stays exactly as it is.

---

## 2. DigitalFlyer's Own Pages: More Consistent, Not More Varied

**Goal.** One confident, cohesive DigitalFlyer brand identity across every platform-owned surface, not ten different experiments. A visitor moving from the home page to Marketplace to an event listing should feel like they're in the same product the whole time.

**Apply the design skill pass to:**
- The main marketing home page (`/pricing`)
- The Marketplace directory
- The Events section (List Your Event, public event pages)
- The admin panel
- The client dashboard
- Any other DigitalFlyer-owned page not already covered above

**Direction for this pass.**
1. Pick one aesthetic direction for DigitalFlyer's own brand and commit to it across every page listed above, don't let the skill generate a different style per page.
2. Fix known, already-flagged issues as part of this pass rather than leaving them for later: the founding business banner styling work, section title sizing, template picker visual clarity, and anything else already identified as a visual polish gap in earlier specs, this is the natural moment to close those out.
3. Respect existing brand colours already established (the blue and lime green treatment used elsewhere), this is a refinement pass, not a rebrand.
4. Mobile-first throughout, consistent with everything else already built.

---

## 3. Member Templates: Genuine Diversity, Not Just a Different Hero

**Goal, stated plainly.** Today the 10 templates differ mainly in hero section treatment, the rest of each page renders largely the same regardless of which one a client picks. That's the actual problem to solve here. A client who picks "Storyteller Vertical" should get a genuinely different reading experience than a client who picks "Bold & Vibrant Geometric," not the same layout with a different top banner.

**Use the aesthetic-anchor mechanism from `Ilm-Alan/frontend-design`** to assign each of the 10 existing templates its own locked anchor, palette, typography, and texture tokens that actually hold across the whole page, not just the hero. Suggested pairing, adjust based on what actually renders well, this is a starting point, not a mandate:

- **Single-Action Minimalist** → a genuinely minimal anchor, generous whitespace, restrained typography, one clear focal point per section
- **Left-Heavy Split** → a photography-forward anchor, image treatment and cropping should feel considered, not just "photo on the left"
- **Content-Dense Feature Grid** → a structured, information-dense anchor, tighter spacing, clear visual hierarchy for businesses with a lot to communicate
- **Storyteller Vertical** → an editorial anchor, real typographic personality, long-form reading rhythm
- **High-Impact Dark Mode** → committed dark theme throughout, not just a dark hero with a light body
- **Social Proof & Trust First** → an anchor built around testimonial and review presentation as the visual centrepiece
- **Interactive Step-by-Step** → a process-driven anchor, numbered or sequential visual language throughout
- **Bold & Vibrant Geometric** → genuinely bold colour and shape use throughout the page, not contained to the hero
- **Multi-Product Showcase** → an anchor built around packages and products as the visual centrepiece
- **App-Style Checklist** → a product-screenshot, checklist-driven visual language throughout

**Classic Conversion** stays as it is, the original layout, don't touch it, it's the default for existing clients and shouldn't shift under them.

**What must not change per template.** The underlying structural rules stay identical across all 10: only sections with real content render, numbered cleanly with no gaps, the lead-gen behaviour (contact details revealed only after submission), package display logic, gallery behaviour, booking and shop integration where active. The diversity is visual and typographic, not structural or functional. A template swap must never lose or corrupt a client's actual data.

**Template picker.** Once each template genuinely looks distinct, the picker itself should reflect that honestly, real, larger previews per option rather than a small ambiguous thumbnail, this was already flagged as a quick win worth doing alongside a fuller template redesign, this is that moment.

---

## 4. Acceptance Criteria

- DigitalFlyer's own pages (home, Marketplace, Events, admin, dashboard) share one consistent visual identity, reviewed side by side.
- All 10 member templates, viewed side by side with identical placeholder content, are visibly, meaningfully different from each other beyond the hero section, not just a different top banner on the same layout.
- Classic Conversion is unchanged.
- No functional behaviour regresses, run through the existing test checklist after this pass, not just a visual review.

---

*This is a genuine design initiative, size it honestly rather than treating it as a quick tweak. Once both parts are done, bring results back for review before considering this closed.*
