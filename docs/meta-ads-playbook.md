# Meta Ads Playbook (Facebook & Instagram)

**What this is:** a plain-language record of how DigitalFlyer SA built and launched its first paid signups campaign on Meta, kept as (a) source material for the member-facing FAQ / help centre, and (b) the blueprint for when we automate this and run it on behalf of members.

**First campaign:** "DF - Signups - Test 1", launched 25 July 2026. Objective Leads, optimised for website signups (Complete registration). Budget ~R100/day, South Africa only.

> Style note for anyone editing this into published copy: DigitalFlyer SA voice, no em dashes, "marketplace" never "directory".

---

## Part A: The simple version (for the member FAQ)

**"How do I run a Facebook or Instagram ad that actually gets me customers?"**

There are five decisions, in order. Get these right and everything else is detail.

1. **What do you want people to DO?** Not "see my ad", a real action: sign up, message you, buy, book. This is your *objective*. For getting signups or enquiries on a website, choose the **Leads** objective.
2. **Where does that action happen?** On your **website** (your DigitalFlyer page), not inside Facebook. This is the *conversion location*. Choosing "Website" is what lets Facebook find people who actually convert, not just people who click.
3. **How does Facebook know a signup happened?** A tiny piece of tracking called a **pixel** sits on your page and reports back "someone signed up". Without it, Facebook is flying blind and your money is wasted. (On DigitalFlyer, this is built in.)
4. **Who should see it?** Pick your **location** (e.g. South Africa, or your town) and let Facebook's AI find the right people. Don't over-narrow at the start.
5. **What do they see?** One clear **image**, a short **headline**, a line or two of **text**, and a **Sign Up** button. Honest and on-brand beats flashy.

**Then:** set a daily budget you're comfortable losing while you learn (R50 to R100/day is a sensible start), publish, and **leave it alone for 2 to 3 days**. Judging an ad on day one is like weighing a cake while it's still baking.

**The numbers that matter afterwards:**
- **Results** = how many signups/enquiries you got. This is the score.
- **Cost per result** = what each one cost you.
- **CTR (click-through rate)** = how compelling the ad is. Around 1% or higher is healthy.
- Ignore the "campaign score", it only measures how many of Facebook's upsells you accepted, not how well your ad will do.

---

## Part B: The exact recipe we used (reference config)

| Setting | Value | Where |
|---|---|---|
| Business portfolio | DigitalFlyer SA | Account picker (top-left) |
| Ad account | Digital Flyer, ID `979705365794025` | Account picker |
| Campaign objective | **Leads** | Campaign level |
| Buying type | Auction | Campaign level |
| Budget strategy | Campaign budget (Advantage+) | Campaign level |
| Daily budget | ~R100/day (ZAR) | Campaign level |
| Special ad category | **None** (we are not credit/housing/jobs/politics) | Campaign level |
| Conversion location | **Website** | Ad set level |
| Dataset / pixel | Growth_DigitalFlyer SA, ID `974569028893466` | Ad set level |
| Performance goal | Maximise number of conversions | Ad set level |
| Conversion event | **Complete registration** | Ad set level |
| Location | South Africa | Ad set level (Audience) |
| Audience | Advantage+ (AI finds them), no custom audience yet | Ad set level |
| Placements | Advantage+ (all placements) | Ad set level |
| Identity | Page: DigitalFlyer SA / IG: digitalflyersa | Ad level |
| Format | Single image (uploaded our own 4:5 + variants) | Ad level |
| Call to action | **Sign Up** | Ad level |
| Destination URL | `https://growth.digitalflyersa.co.za/pricing?utm_source=facebook&utm_medium=paid_social&utm_campaign=df_signups_test1` | Ad level |

**Ad copy used:**
- Primary text: *"Your business deserves more than a Facebook page. Get your own professional business page, then get found by local customers on the DigitalFlyer SA marketplace. Set up in minutes, free to start. No coding, no agency fees."*
- Headlines (3, so Meta can favour the best): "Your Own Business Page, Free to Start" / "Get Found by Local Customers" / "More Than a Facebook Page"
- Description: *"Join South African businesses growing with DigitalFlyer SA."*

---

## Part C: Decisions and WHY (the reasoning members won't get from Meta)

- **Leads objective, not Traffic.** Traffic buys clicks from anyone. Leads optimises for people likely to actually sign up. Same money, far better people.
- **Website, not Instant Forms.** An Instant Form keeps people inside Facebook. Our whole product, signup, trial, and the conversion we can measure, lives on the website, so we send them there.
- **Optimise for Complete registration, not link clicks.** We tell Meta the real goal (a signup) so its AI learns who converts, not just who taps.
- **Broad audience, South Africa.** With a good pixel + conversion event, Meta's AI targets better than manual interest-picking, especially early. Narrowing too soon starves it of data.
- **Declined every AI "enhancement".** We turned off AI image generation, creative enhancements (touch-ups/music/animation), auto-translation, and multi-advertiser ads. Our creative is a designed graphic with text and a logo, so AI "improvements" only risk distorting a layout that's already right. For a raw photo, some enhancements (like brightness) are fine.
- **Turned OFF auto-translation.** It defaulted to translating the ad into every language (Spanish, Hindi, etc.). We target South Africa and our site is in English, so a translated ad pointing at an English page would confuse people and convert worse.
- **UTM tags on the URL.** So Google Analytics also credits this campaign (`utm_source=facebook&utm_medium=paid_social&utm_campaign=...`), giving us a second, independent read on results.
- **One image, kept simple.** Easy to read the result. Video and carousel are deliberate *next* tests, not first-run complexity.

---

## Part D: Gotchas that tripped us up (worth warning members about)

- **The "Create" button in Events Manager is not the campaign button.** Campaigns are built in **Ads Manager** (adsmanager.facebook.com). Events Manager's Create menu only makes pixels/audiences.
- **The green Publish bar is stuck to the bottom of the screen.** It is not the end of the form. The image and text fields live *below* it, you have to scroll the form underneath that bar.
- **Browser zoom hides sections.** Zoomed in, you only see one block at a time and get lost. Zoom out (Ctrl and minus) to see whole sections.
- **"Campaign score" is a vanity number.** It drops when you decline Meta's upsells. Declining them was the *right* call. Ignore the score.
- **"5 headlines recommended" is optional.** One of each is a complete ad. We added 3 headlines because it's a free, easy win (Meta favours the best), not because it's required.
- **A payment method must be on the ad account** before it will spend. This is a personal step the business owner does; DigitalFlyer never handles card details.
- **After publishing, Delivery shows "Processing"** = in review (minutes to a few hours), spend R0 until approved, then flips to Active. Normal.

---

## Part E: The tracking chain (technical, so we can trust the numbers)

Two independent tracking layers so we do not undercount:

1. **Browser pixel (client-side)** — the DigitalFlyer-own Meta Pixel (`974569028893466`) loads on the site, consent-gated (only fires after the visitor accepts cookies). On the signup thank-you pages, a small component fires the standard events: `CompleteRegistration` (free trial / signup started) and `Subscribe` (paid). Proven working 25 Jul 2026 via a real test signup that showed up green in Meta Test Events.
2. **Server-side CAPI (Conversions API)** — *pending build.* The browser pixel misses roughly a quarter to a third of conversions (ad blockers, iOS restrictions, people who decline cookies). CAPI sends the same conversion from our server directly to Meta, so we catch those too. Meta itself flags a median ~10.9% more conversions reported when CAPI is on for this event. Build notes:
   - Model on the existing per-member `src/lib/meta/capi.ts` (Graph API v25.0, POST to `/{pixel_id}/events`, sha256-hash email/phone, `action_source: website`).
   - Env-gate on a new `DIGITALFLYER_META_CAPI_ACCESS_TOKEN` + pixel `974569028893466`; no-op until the token is set.
   - **Dedup:** the browser event and the server event must share one `event_id` (generate at signup, pass to the thank-you page and to CAPI) so Meta counts each signup once, not twice.
   - Token is generated in Events Manager: Growth_DigitalFlyer SA -> Settings -> Conversions API -> Generate access token, then added to Vercel env.

Also feeding results: **Google Analytics 4** (`sign_up` and `generate_lead` events + the UTM tags above), as a cross-check independent of Meta.

---

## Part F: Automation blueprint (running this FOR members)

The end goal: a member clicks "Advertise my page" and we build + launch a campaign like the above on their behalf. What that needs:

- **Meta Marketing API** (not the manual Ads Manager UI). Everything in Part B has an API equivalent: create Campaign (objective `OUTCOME_LEADS`), Ad Set (`optimization_goal` toward the pixel event, `promoted_object` = pixel + `CompleteRegistration`, geo = the member's town/province), Ad Creative (their page URL + generated copy + their image), then publish.
- **Per-member pixel + CAPI already exists** (`src/lib/meta/capi.ts`, `meta_pixel_id` + encrypted `meta_capi_access_token_encrypted` per client). That is the tracking half already solved, this playbook is DigitalFlyer running its *own* version of the same machine, which is why doing it once ourselves matters.
- **Ad account access:** either members grant us access to their own ad account (Business Manager / system user token), or we run ads from a DigitalFlyer ad account on their behalf and bill it through. Commercial + policy decision, not just technical.
- **Creative generation:** we already generate copy (Anthropic) and have image tooling (Pexels picker, asset generator). Reuse to auto-draft each member's ad.
- **Budget + billing:** members set a budget; we need a funding model (their card on their ad account, or we front it and recover via their plan).
- **Guardrails:** Meta ad-policy compliance, spend caps, auto-pause on poor performance, and honest reporting back to the member (Results, Cost per result, CTR), reusing the same metrics in Part A.

**Sequence when we build it:** (1) finish DigitalFlyer-own CAPI and run our own campaign long enough to trust the numbers, (2) prove the Marketing API create-campaign flow against our own ad account, (3) add member ad-account connection + creative auto-draft, (4) budgets/billing + guardrails, (5) member-facing "Advertise" button.

---

## Part G: After launch, what we watch and when

- **Day 0 to 2:** learning phase. Numbers swing wildly. Do **not** edit the ad (every edit restarts learning). Just confirm it got approved and is spending.
- **Day 3 onward:** read Cost per result and CTR. Healthy CTR ~1%+. If cost per signup is unworkable, the usual levers in order: creative (biggest impact), then offer/landing page, then audience, then budget.
- **Ongoing tests (one at a time so results stay clean):** image vs video, different headlines, different first line of primary text, a tighter geo.
- **Once we have signups:** build a **lookalike audience** from people who signed up, often the single biggest performance jump.

*Last updated 25 July 2026, after the first campaign went live.*
