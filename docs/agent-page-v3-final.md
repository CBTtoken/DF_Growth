# Agent page v3: final structure and content

**Supersedes `agent-page-revised-brief.md` and `agent-page-content-v2.md`.** Both of those are dead, ignore them. Everything in `agent-programme-build-spec.md` outside section 1.3 still stands: routing, attribution, tracking, dual role accounts, dashboard, ledger.

---

## The idea, in one paragraph

An agent is not a link. An agent is the reason a business owner does not have to figure any of this out alone. That is what the commission pays for, and it is the only thing this page has to communicate.

Two consequences drive every decision below.

**The page is short.** If the promise is that you do not have to do the work, a page that makes you read eleven sections contradicts itself. Five sections. Nothing that does not earn its place.

**The page is written in the agent's voice, about the reader's business.** Not "I am someone who has done these things", but "I will sort this out for you". This is what makes it feel personal rather than corporate, and it means an agent who fills in nothing still gets a page that sounds like a person, because the standard copy is already speaking as them.

---

## Structure, five sections

1. **Hero.** Agent identity chip, the promise, one paragraph, one button.
2. **Recognition.** Three sentences of the problem, one line of resolution. Serif voice.
3. **How this actually goes.** Three steps of what the agent does with them, with the outcome as a small checklist inside it.
4. **Proof.** Three real client pages.
5. **The agent, and the close.** Short paragraph, credential line, both buttons.

Sticky bar on mobile throughout: WhatsApp primary, See prices secondary.

Sections 2, 3 and 4 are entirely standard. Section 1 needs only a name and town. Section 5 has a designed fallback. An agent who uploads nothing still gets a complete, personal-sounding page.

---

## Full standard content

Braces are filled per agent. Sentence case. No em dashes. No ampersands. "Marketplace" never "listing" or "directory".

### 1. Hero

**Chip:** {photo or monogram} / {FullName} / DigitalFlyer SA agent, {Town}

**Headline:** You are good at what you do. Let me handle the online part.

**Body:** Tell me about your business and I will get you a proper page, a place on the marketplace where local customers search, and posts ready to share every month.

**Button:** WhatsApp {FirstName}

### 2. Recognition

Serif voice, no heading.

Someone asks if you have a website and you are not sure what to say. A competitor with a worse product wins the job, because they had somewhere to send people. Your best post is three scrolls down by the time anyone new sees it.

**Resolution line, sans, bold:** That is the gap. Let us close it.

### 3. How this actually goes

**Heading:** How this actually goes
**Sub:** Three steps, and I am with you for all of them.

1. **You message me**
We talk about what your business does and who you want reaching you. No forms, no jargon.

2. **I get it built**
Your page, your look, your words. You see it and approve it before anyone else does.

3. **You start sharing it**
One link for WhatsApp, Facebook, your invoices, the back of your bakkie.

**Inset checklist, heading "What you end up with":**
- Your own professional page
- A place on the marketplace
- Branded posts every month
- Real customer reviews

### 4. Proof

**Heading:** Pages like the one you will get
**Sub:** Real South African businesses, live right now.

Three live client pages in device frames via the existing ScreenshotOne integration. Use Buffelskop, HelpLift Network Vaal Triangle and Standing 365, the same three already on the pricing page. Each links to the live page.

### 5. The agent, and the close

**Standard fallback when no bio is supplied:**
I am here in {Town}, and I would rather talk to you than have you fill in a form. Ask me anything, even if you are not ready yet.

**If a bio is supplied it replaces this entirely.** Serif voice, 400 character cap, visible counter. Guidance above the field in the dashboard:

> Three or four sentences, written to the reader, not about yourself. What would you say to someone standing in front of you who is not sure yet?

**Credential line, small, muted:** Verified DigitalFlyer SA agent, active since {Month Year}

**Agent's own services, only if they exist.** Small pills under the credential line, no prices shown. Sub-label: {FirstName} also does. Disclaimer: These are {FirstName}'s own services, separate from DigitalFlyer SA.

**Businesses helped.** If three or more attributed, active and live, a single quiet line above the close: {FirstName} has helped {list} get online. Hidden below three. No counts, no invented figures.

**Buttons:** WhatsApp {FirstName} / See prices

---

## Call to action

**No "Start free" anywhere on an agent page.** Currently four instances on Natasha's page and three on Losaan's.

- Primary, everywhere: WhatsApp {FirstName}
- Secondary, quiet: See prices, to `/pricing?ref={slug}`
- Pre-filled WhatsApp message: `Hi {FirstName}, I saw your page and I want to find out about getting my business online.`
- WhatsApp number is a required field. An agent page cannot publish without a contact route.
- If a number is somehow missing, primary becomes Message {FirstName}, opening a form that emails the agent and copies admin. Never a signup button.

---

## Design

**Four curated themes, no free colour picker.** Each fully designed and contrast-checked in light and dark mode. The agent picks a theme, not a colour.

**Hero.** Theme-tinted background. Agent chip sits above the headline, small, around 44px. The chip establishes who is speaking, then gets out of the way. Headline is the largest thing on the page.

**Rhythm.** Five sections need clear separation but not five different backgrounds. Tinted hero, then plain surfaces with hairline dividers. Section 3's checklist sits on a subtle inset panel, the only raised element on the page.

**Serif for the two human moments only,** section 2 and the agent paragraph in section 5. Everything else sans. That contrast is what makes those two blocks read as a person talking.

**Mobile is the real design.** Most traffic arrives from a link pasted into a chat. Build 360px first.

**Open Graph** per agent, using their photo or generated monogram, never the DigitalFlyer logo.

---

## Fixes required alongside this

**F1.** `🔒Secure payment via Paystack` is a global footer component rendering on `/natasha`, `/losaan`, `/pricing` and the agent application form. Make it conditional on a payment actually occurring, or remove it. Remove the emoji.

**F2.** The H1 outputs `NatashaRosema` and `LosaanVd Westhuizen Meiring` with no space. Fix the markup.

**F3.** The pricing page lists "Marketplace Listing" as a feature on Foundation and Growth, and calls the marketplace "a shared directory". Fix at the tier feature data source.

**F4.** Em dashes on the pricing page, including the cookie banner. Part of the repo-wide sweep.

**F5.** Tier naming: the live product is "Growth", the agent terms say "Growth Engine". Align both.

---

## Slug logic

First name if free, then first name plus town (`natasha-polokwane`), then first name plus surname initial. **Never append a number.** A slug like `natasha2` reads as a spam account on a page whose only job is trust.

- Agents choose at setup from suggestions, with a live availability check.
- The check runs across agent slugs, business slugs and reserved words in one query. Shared namespace.
- Reserved additions: `digitalflyer`, `digitalflyersa`, `support`, `help`, `official`, `admin`, `info`, `contact`, `foundation`, `growth`, `enterprise`.
- A live slug never changes without a permanent redirect. These links live in WhatsApp threads forever.
- Profanity and impersonation filter on custom slugs.

---

## Confirmed pricing, for the agent playbook

| Tier | Monthly | Annual | What the agent says |
|---|---|---|---|
| Foundation | R100 | R900 | Three months free on the year |
| Growth | R180 | R1,199 | The year costs less than seven months |

Growth annual saves a customer R961 against paying monthly. That is the strongest number an agent has and it should be the first thing in their script.

Enterprise is currently coming soon and cannot be bought, so the commission ladder presently applies to Growth annual only. Keep Enterprise in the terms for when it launches.

---

## Acceptance criteria

- **Primary test:** render with every optional agent field empty, no photo, no bio, no services, no attributed businesses. The page must look finished, read as a person speaking, and be fully usable.
- Render fully populated: photo, 400 character bio, three services, four attributed businesses.
- No "Start free" and no Paystack footer line on any agent page.
- Full name renders with correct spacing in the H1, the page title, and Open Graph.
- No agent page publishes without a working contact route.
- Four themes checked in light and dark at 360px and desktop.
- Slug collision tested: a second Natasha is offered `natasha-{town}`, never `natasha2`.
- Open Graph preview verified by pasting into WhatsApp.

---

## Outstanding from Dewald

1. Losaan's bio, cut to four sentences. Her existing second paragraph, the one about getting people interested and having nowhere good to send them, is the strongest thing either agent has written and works almost as it stands.
2. Natasha's WhatsApp number. Her page currently has no way to contact her.
3. Tier naming decision.
