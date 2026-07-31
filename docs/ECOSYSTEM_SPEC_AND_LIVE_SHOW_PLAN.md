# DigitalFlyer SA: full ecosystem spec and live show plan

**Written 31 July 2026. Every number and every click path in this document was read from the live system on the day it was written, not from an older document.**

Its job is two things at once. It is the functional spec of how Growth, KatisoBiz and The Board actually work and fit together, and it is the planning document for a Facebook Live series that walks viewers through all three.

---

## PART ONE: THE ECOSYSTEM IN ONE PAGE

Three products, one company, one database, one deployment.

| | **DigitalFlyer Growth** | **KatisoBiz** | **The Board** |
|---|---|---|---|
| **For** | A business that needs to be found | A business that needs to get paid | Everybody, members and public |
| **Does** | A real web page, a marketplace listing, leads | Quotes and invoices from a phone | Specials, things for sale, people looking for help |
| **Costs** | R100 or R180 a month | Free, R49 or R89 a month | Nothing, ever |
| **Lives at** | growth.digitalflyersa.co.za | katisobiz.co.za | /board |
| **Today** | 34 active members | 23 accounts | Just opened |

**The one sentence version:** DigitalFlyer gets a small business found, KatisoBiz gets it paid, and The Board is where the two meet the public.

### How they connect, which is the part that matters

The three are not three apps that happen to share a login. Each one feeds the next:

1. A business joins **Growth** and gets a real page, on a real domain, that Google can find.
2. That page puts it in the **marketplace**, where somebody looking for a plumber can find it.
3. It posts a special to **The Board**. That post is its own permanent page, so it can also be found on Google, and it can be shared into a WhatsApp group where it arrives as a card with the business name and the price on it.
4. Somebody comments "what would that cost for a double garage". The member taps **one button** and that comment becomes a real, priced **KatisoBiz quote**, sent from the member's own business.
5. The customer accepts. The quote becomes an invoice. The member gets paid.

**That loop is the product.** No competitor in this market has both halves. Facebook can host step 3 and then loses it. An invoicing app can do step 5 and knows nothing about step 3.

---

## PART TWO: THE THREE PRODUCTS, IN DETAIL

### 2.1 DigitalFlyer Growth

**What it is:** a marketing platform for a South African small business. A real page, a marketplace presence, and the tools to bring people to it.

**Live pricing, exactly as the site says today:**

| Tier | Price | What it adds |
|---|---|---|
| **Foundation** | Free 7 days, then R100/month or R900/year | Professional business page, marketplace presence, lead generation page, business profile, monthly digital asset, KatisoBiz Nomads community, KatisoBiz free plan included |
| **Growth** | R180/month or R1,199/year | Everything above, plus campaign landing pages, performance tracking, marketing assets, monthly optimisation, growth reporting, booking and shop tools, and the KatisoBiz R49 plan included free |
| **Enterprise** | Coming soon | Not live. There is no checkout for it. **Do not sell this on air.** |

**The signup path, click by click:**

1. `growth.digitalflyersa.co.za/pricing`
2. Pick a tier, enter business name and email
3. Paystack hosted checkout, card details never touch our site
4. Paystack confirms, the account is created automatically, no admin action
5. The member lands in the intake wizard: business details, brand colours, logo, photos, page content
6. Their page is live at `growth.digitalflyersa.co.za/their-name`

**What a member gets in the dashboard:** their page and an editor for it, leads with a handled marker, photo gallery, testimonials, generated social assets, page view counts, reviews, board posts and messages, contacts, booking and shop on the Growth tier, Meta ad tracking, and an account section.

**Live today:** 34 active members, all 34 listed in the marketplace, 10 leads captured, 3 agents.

### 2.2 KatisoBiz

**What it is:** quoting and invoicing for a tradesman or solo operator, built for a phone. Its own brand, its own domain, its own audience. A member does not need Growth to use it.

**Live pricing:**

| Plan | Price | What you get |
|---|---|---|
| **Free** | R0 | 10 documents a month, one template, no logo upload, no customer database, no reports |
| **R49** | R49/month | 75 documents a month, all five templates, your own logo, customer database, reports, client statements, accountant export |
| **R89** | R89/month | Unlimited documents. Multi-user and recurring invoices are the plan's eventual promise but **are not built yet** |

**The signup path:** `katisobiz.co.za` → Start free → email and business name → straight into the app. No card for the free plan.

**What it does:** a quote in under a minute, a customer created by typing a name straight into the quote, convert a quote to an invoice when the job is done, a numbering series that continues from the member's old paper book, a PDF that goes out under their own business name, payment reminders, and reports.

**The trust decision worth stating on air:** documents go out from the member's **own WhatsApp number**, not from ours. The member presses a button, their WhatsApp opens with the message ready, and they press send. That is deliberate and it is repeated all through the product.

**Live today:** 23 accounts, 6 customers, 2 documents issued. **Be honest about that second number on air if it comes up.** The product is young and the first real member issued their first quote on 30 July.

**It installs on a phone** with its own icon, opening full screen with no browser bar and nothing to download.

### 2.3 The Board

**What it is:** a notice board where local businesses put up specials and the public asks for help, and the two find each other. Free for everyone, no account needed to use it.

**Four kinds of post, and the kind decides the form:**

| Kind | Who posts it | What it asks for |
|---|---|---|
| **Special** | A business | What is on special, details, price, photo, town |
| **Offer** | A business | What you offer, details, price, photo, town |
| **For sale** | Anybody | What you are selling, details, price, photo, town |
| **Looking for** | Anybody | What you need, details, photo, town. **No price**, because somebody looking for a plumber has no price to give |

**The identity rule, which is the thing to explain clearly:**

- **Browsing, reading and sharing:** nothing at all. No account, no email, no name.
- **Liking:** one tap, nothing asked.
- **Commenting, reviewing, posting, messaging:** a name, and an email if you want a reply. **No password, no code, no signup, and nobody leaves the screen.**
- **Only members can post a Special or an Offer.** Anybody can post For sale or Looking for.

**A member is also a person.** A member posting a Looking for, or selling their own fridge, ticks a box and it goes out under their own name rather than their business name.

**What each post gets:** its own permanent page that Google can read, a share card carrying the business name, the item and the price, an area page it belongs to, a trade page, comments with replies, likes, and a Message button that opens a WhatsApp-shaped chat.

**Both contact paths stay live, side by side.** Every post carries the member's WhatsApp button and an in-app Message button. The member can switch in-app messages off entirely and keep WhatsApp.

**Housekeeping, so nothing rots:** a public post and a chat message clear themselves after 10 days. A business post never expires, because that permanent page is the whole point.

**Two phone icons:** The Board, and Chat.

---

## PART THREE: THE FULL USER FLOWS

### Flow A: A business owner joins and gets found

1. `growth.digitalflyersa.co.za/pricing` → picks Foundation → pays on Paystack
2. Intake wizard: business details, brand, logo, photos, page copy
3. Page live at `/their-name`, and they appear in `/marketplace`
4. Dashboard → **Post to the board** → picks Special → types it, adds a photo and a price → **Post it**
5. The post is live, on the board and on their town's area page
6. They tap **Share on WhatsApp** and send it into their local group. It arrives as a card, not a link.

### Flow B: A member of the public finds a business

1. Sees the card in a WhatsApp group, taps it
2. Lands on the post. No login, no wall.
3. Taps the heart. Nothing is asked.
4. Comments "what would this cost for a double garage". Types a name. Posted, instantly.
5. Taps **Message directly**. A chat screen opens like WhatsApp. Types a message, gives a name and email, sends.
6. The business gets an email straight away. Its reply lands in the person's inbox with a link straight back into the conversation.

### Flow C: The loop that only we can close

1. The member opens **Dashboard → Post to the board** and sees the comment
2. **Reply in public**, so everybody reading the post sees the answer, marked as the owner
3. **Turn into a quote**: one tap creates a real KatisoBiz draft quote with the customer attached, the item as a line, and the price filled in
4. The member checks it, issues it, and sends it from their own WhatsApp
5. Job done, quote becomes an invoice

**Requirement for step 3:** the member's KatisoBiz account must be linked to their Growth business. **This is not linked for anybody today.** See Part Five.

### Flow D: Somebody needs a plumber

1. `/board` → **New post** → **Looking for something**
2. Types what they need, picks a town, gives a name and email
3. It appears on the board and on that town's area page for 10 days
4. Plumbers in that area see it and comment or message

---

## PART FOUR: THE LIVE SHOW PLAN

### The through line

**Get found. Get paid. Get talking.** One sentence per episode, in that order, because that is the order a real business experiences them.

### Episode 1: Get found, DigitalFlyer Growth

**Runtime: 25 to 30 minutes.**

| Segment | Minutes | What to show |
|---|---|---|
| The problem | 3 | A business with only a Facebook page. Nothing to send, nothing on Google, nothing they own |
| The marketplace | 4 | Live at `/marketplace`. Search a trade, open a real member page. **Use a real member, not a demo** |
| Signing up | 6 | Screen share the pricing page, the tiers, Paystack checkout. Stop before entering real card details |
| The intake wizard | 6 | Fill it in live. This is where viewers understand it is minutes, not weeks |
| The page appears | 4 | The finished page, on a real address, on a phone |
| Questions | 5 | |

**Have ready:** a real member page you are proud of, and a business name for the live signup.

**Do not:** promise Enterprise, quote SEO rankings, or claim numbers you have not checked that morning.

### Episode 2: Get paid, KatisoBiz

**Runtime: 25 to 30 minutes.**

| Segment | Minutes | What to show |
|---|---|---|
| The problem | 3 | A tradesman quoting on WhatsApp from memory, chasing money on paper |
| Signing up | 3 | katisobiz.co.za, free, no card. Do it live on a phone |
| The first quote | 8 | The whole point of the episode. Type a customer name straight into the quote. Add lines. Issue it |
| Sending it | 4 | **From your own WhatsApp number.** Say clearly that documents never come from us |
| Quote to invoice | 4 | Convert it when the job is done. Numbering carries on from their old book |
| The plans | 3 | Free 10 a month, R49 for 75 and the real tools, R89 unlimited |
| Questions | 5 | |

**Have ready:** a phone with the app installed on the home screen, and a believable job to quote.

**Do not:** promise multi-user or recurring invoices. Both are planned and neither is built.

### Episode 3: Get talking, The Board, and the loop

**Runtime: 30 minutes. This is the episode that sells the ecosystem.**

| Segment | Minutes | What to show |
|---|---|---|
| The problem | 4 | Your post in a Facebook group is gone in three hours and Google never saw it |
| The board | 5 | `/board` on a phone. Areas, trades, search. Add it to the home screen live |
| Posting a special | 5 | As a member. Photo, price, town. Post it |
| **The share** | 4 | Share it into a WhatsApp group **during the show** and show the card that arrives. This is the moment that lands |
| The public side | 5 | From a second phone: like it, comment on it, then post a Looking for |
| **The loop** | 5 | Answer the comment in public, then turn it into a KatisoBiz quote in one tap. **Rehearse this one** |
| Wrap | 2 | The three together, one sentence each |

**Have ready:** two phones, one signed in as a business and one not, a WhatsApp group to share into, and a KatisoBiz account **linked** to the business you are posting as.

**Do not:** open on an empty board. Put five or six real posts up beforehand.

### If you only get two episodes

Merge 1 and 2 into "Get found and get paid" at 35 minutes, and keep Episode 3 whole. The loop needs its own room.

---

## PART FIVE: WHAT MUST BE TRUE BEFORE YOU GO LIVE

**Blocking, in order:**

1. **Link at least one KatisoBiz account to its Growth business.** Zero of 23 are linked today. Without it the quote-from-a-comment demo cannot run, and that demo is the point of Episode 3.
2. **Put five or six real posts on the board**, in at least two different towns, with photos and prices. An empty board on camera teaches viewers the board is empty.
3. **Add a WhatsApp number** to whichever business you demo as, or the green WhatsApp button never appears.
4. **Flip the board public**, `NEXT_PUBLIC_BOARD_LIVE` to `true`, and tell me first so the test posts are cleared beforehand.
5. **Have a real review on a real business.** There are zero. Get one from a genuine customer.

**Worth doing, not blocking:** a second business page you can show as a contrast, and the KatisoBiz app installed on the phone you will hold up.

---

## PART SIX: WHAT NOT TO PROMISE ON AIR

Stated plainly, because a live audience remembers a promise.

| Do not say | The truth |
|---|---|
| "Enterprise tier" | Not built, no checkout |
| "Multiple users on KatisoBiz" | Planned, not built. Every account is one user |
| "Recurring invoices" | Deliberately refused. Tradesmen invoice per job |
| "Verified businesses" | No verification mechanism exists. There is no badge |
| "Live notifications" | The unread badge is correct on every page load, not in real time |
| "We message customers for you" | KatisoBiz sends from the member's own number, on purpose |
| "Pay your invoice online" | Not built. It collides with published terms clause A6.3 |
| "WhatsApp bot" | A separate build, not started |

---

## PART SEVEN: HONEST NUMBERS, 31 JULY 2026

Use these or check them again on the morning of the show. Do not round up.

- **34** active Growth members, all 34 in the marketplace
- **23** KatisoBiz accounts
- **2** documents issued, the first by a real member on 30 July
- **10** leads captured through member pages
- **3** agents
- **0** reviews
- The board opened this week

**The honest framing for a live audience:** this is a young platform with real members and a working product, not a mature one with big numbers. Say that. It is more persuasive than a number nobody believes, and every one of these figures is checkable.
