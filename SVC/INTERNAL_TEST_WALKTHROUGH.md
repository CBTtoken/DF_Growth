# SMART VALUE CLUB: INTERNAL TEST WALKTHROUGH

**For the project team | August 2026 | Private build, test mode**

The test site is:
**https://df-growth-git-svc-sprint-1-digital-flyer.vercel.app/svc**

Everything you do on it is test data. Payments are simulated (no card is
ever asked for and no money moves), one-time codes arrive by EMAIL for
now (SMS comes later), and nothing here is public or indexed.

Use your REAL email address when you sign up, because the one-time code
and the welcome mail genuinely get sent to it. Cell numbers can be your
real one or any valid-looking SA number (start with 0, ten digits), but
each number can only join once.

There are two hats to test in: MEMBER (anyone) and ADMIN (only accounts
on the admin list; ask Dewald to add your email if you need it).

---

## PART 1: THE PUBLIC SITE (5 minutes, no account needed)

1. Open the site ON YOUR PHONE first; it is built phone-first.
2. Walk the pages from the burger menu: Home, How it works, Packages,
   About, FAQ, Contact. Check: no sideways scrolling, every button a
   clear rectangle, nothing red anywhere.
3. On Packages, note the package, its price and every benefit's value
   come from the database, and the total face value is stated as face
   value, deliberately never as "you will save this much".
4. Open The monthly draw page (linked from the home page draw section):
   the mechanics in plain language, and published results once a draw
   has run.
5. Send a message through Contact; it should confirm, and the message
   lands in the configured inbox.

What SHOULD be true and is worth catching if not: reading the whole site,
nowhere does it promise R2,000+ savings, claim coupons are "verified with
retailers", show member counts, or show testimonials. It also says
coupons are "designed to work alongside" your store loyalty card, never
"stack on top", until the supplier confirms stacking in writing per
retailer.

## PART 2: BECOMING A MEMBER (10 minutes)

1. Join from any Join button. Fill in your name, surname, cell, email,
   password. Note the POPIA consent is required, the marketing tick box
   is separate and optional.
2. Submit. A six digit code arrives in your EMAIL (this is the interim
   channel until an SMS provider is chosen). Enter it.
3. The payment step appears. In this environment it is one button,
   "Activate my membership (test mode, no payment)". Press it.
4. You land on a welcome page; a welcome email arrives; your dashboard
   shows the membership as Active.

## PART 3: THE MEMBER DASHBOARD (15 minutes)

The dashboard is empty-ish until the monthly issue has run for you. An
admin pressing "Run the issue now" (Part 5) fills it; issues also run
automatically every morning. Once issued:

1. **The savings counter** at the top starts by showing the face value
   waiting in your account, and the words are honest: your real savings
   are counted only from what you actually use.
2. **Your benefits for the month**: the three retailer coupon packs, the
   e-course, the e-book, and Moxie Magazine. Each card walks a state:
   Show/Open it, then take it, then "I used this". Try this on one
   benefit and enter an amount (say 37.50): the savings counter moves by
   exactly that amount. That is the whole honesty machine working.
3. **My coupons** (link above the benefits) is the coupon-specific view.
   Note: codes shown are test data until the coupon supplier integration
   goes live; the screens will not change when it does.
4. **The draw panel** (appears once the month's draw exists): your 5
   free entries, earned entries, and the live line telling you how much
   more redeemed value earns your next entry. Note the self-confirmed
   cap is stated openly. There is deliberately NO way to buy entries
   anywhere; that stays off until legal clearance.
5. **Read Moxie**: from the Moxie benefit card, open the magazine site
   and log in with the SAME email and password you just created. Your
   SVC membership entitles you; that is one account across both brands.
6. **Tell a friend**: copy your referral link, open it in a private
   window, and sign up a second test account (a second real inbox you
   own). Back on your first account, Level 1 shows 1. Earnings show R0
   for now, correct until the monthly referral run happens (Part 5).
   The full referral rules with a worked example are on How it works;
   check the dashboard never promises anything beyond them.
7. **Which shop next?**: answer the demand question at the bottom; your
   answer appears in the admin demand view.
8. **Cancel** (optional, use your second account): one reason box, no
   fees, benefits stay to the end of the paid period, and rejoin works.

## PART 4: WHAT A MEMBER MUST NOT BE ABLE TO DO (5 minutes)

Try these on purpose; they should all fail politely:

- Reuse a cell number that already joined (second signup refused).
- Reach /svc/admin without being on the admin list (bounced to login).
- Buy draw entries anywhere (no control exists while the flag is off).
- Use a wrong one-time code five times (the code dies; resend works,
  with a cooldown).

## PART 5: THE ADMIN SIDE (20 minutes, admin emails only)

**Getting admin access as a tester:** there is no admin username and
password, and no shared login. Admin is an allowlist of email addresses.
Sign up as a normal member first (Part 2) with your real email, then ask
Dewald to add that email to the admin list; after the next redeploy your
own login also opens /svc/admin. (Dewald: Vercel, Environment Variables,
edit the Preview SVC_ADMIN_EMAILS entry, add the tester's email comma
separated, redeploy the preview.) Remove testers the same way afterwards.

Open /svc/admin on the test site. Seven sections plus the day-one tools:

1. **The issue run**: press "Run the issue now". Every paid-up member
   gets the month's benefits; pressing it twice issues nothing twice.
   Members get a "your benefits are ready" email.
2. **Members**: search yourself; open your ledger and see every state
   change you made in Part 3 with its timestamp; see who referred whom.
   Try Comp on a test account (an active month, marked as comped, no
   payment pretended), Suspend (a suspended member is skipped by issue
   runs), and issue a single benefit by hand. The members list also does
   a group giveaway with the same guarantees.
3. **Partners**: open the coupon supplier; see its benefits, its rate
   history (rates are dated; changing a rate never rewrites a past
   month), voucher batches with remaining stock (a batch of 500 can
   never issue 501), and DOWNLOAD THE MONTHLY PDF REPORT. That PDF is
   the partner-facing product: what they received, opened, selected and
   used, honest about which numbers are member-self-reported. There is
   deliberately no partner login; we email them the report.
4. **Packages**: open the package builder. Tick benefits on and off and
   watch the margin move live, including the R9 full referral exposure
   inside the cost. Change the price and watch the percentage. The
   warnings fire when a package loses money or leans its headline value
   on a benefit a partner could withdraw. Saving creates a NEW VERSION;
   existing members stay on theirs.
5. **Payouts**: pick the month, run the partner payout and the referral
   run. Lines appear per partner and per referring member, none of it
   moves money, each line takes a mark-paid with a reference, and the
   month exports as CSV. After the referral run, the member dashboards
   show this month's earnings.
6. **Referrals and fraud**: look up any member's referral picture; the
   fraud section flags shared payment instruments, suspicious clusters
   of similar cell numbers, and chains growing unusually fast. Flags
   only; nothing auto-suspends.
7. **Demand**: the answers from Part 3 item 7, counted by category,
   biggest ask first.
8. **Draws**: create the month's draw (prize text, value, cutoff,
   leave purchases OFF). Watch the member dashboards grow their draw
   panel. At month end (or with the Freeze button): freeze, draw the
   winner, publish (winner gets an email; the public results page shows
   the seed and total entries so anyone can check it), and record the
   prize in the winner's ledger.

## WHAT IS DELIBERATELY NOT THERE YET

So nobody reports these as bugs:

- **Real coupons from the supplier**: waiting on their API credentials
  and documentation. The manual path above is the designed fallback and
  works end to end.
- **SMS one-time codes**: email until an SMS provider is chosen.
- **Real payments**: simulated in this environment on purpose; the real
  Paystack path exists and switches on with SVC's own account.
- **Buying draw entries**: built, switched off until legal clearance.
- **WhatsApp anything**: Sprint 5, needs SVC's own number.
- **A partner login**: by design; the PDF report is the partner product.
- **Final legal text**: terms, privacy and POPIA pages carry marked
  placeholders until the legal team delivers.

## REPORTING WHAT YOU FIND

Send whatever you find to Dewald in one line each: where you were, what
you did, what you expected, what happened. Screenshots welcome. Nothing
you can break in here matters; that is what it is for.
