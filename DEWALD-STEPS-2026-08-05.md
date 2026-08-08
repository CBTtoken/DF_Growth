# What's left, 5 August 2026 (updated after both merges)

Both branches are merged and live on main now. This replaces the earlier
version of this file, everything already done has been taken off the
list. What's genuinely left is short.

---

## 1. SIP Happens

- **Grant her free month.** Admin → her client record → the free month
  toggle.
- **Send her the handover email.** Fully drafted in
  `docs/Report_SIPHappens.md`, search "DRAFT HANDOVER EMAIL". Copy, edit
  if you like, send.

## 2. Page poster

- Nothing left from you on the connection itself, that's done.
- **Approve the first batch of queued posts** once they appear on
  `/admin/page-poster`. Nothing publishes before you do.
- **Write a few evergreen posts, if you feel like it.** Optional, not
  blocking, there's a plain text box for it on that same screen.

## 3. Growth Subscribe tracking — DONE

Fixed and live on main (you said "yes to 3"). The webhook now sends Meta
a server-side `Subscribe` event the moment a Growth/Enterprise signup's
first payment succeeds, using the Paystack reference as its id, and
`/pricing/success` gives the browser pixel that same id so Meta counts
the sale once rather than relying on the pixel alone. Nothing left here.

## 4. Search Console, only you can check this

Go to search.google.com/search-console and confirm both
`growth.digitalflyersa.co.za` and `katisobiz.co.za` show as verified
properties. If either's missing, add it as a URL-prefix property and
pick the HTML file method, the file it needs is already live on both
domains.

## 5. Meta audiences (costs nothing, no campaign created)

In business.facebook.com → Audiences → Create Audience → Custom
Audience:

- **Website**, URL contains `growth.digitalflyersa.co.za`, 180 days.
  Name it "Growth site visitors".
- **Website**, URL contains `katisobiz.co.za`, 180 days. Name it
  "KatisoBiz site visitors".
- **Facebook Page**, DigitalFlyer SA, "Everyone who engaged with your
  Page", 365 days. Name it "Page and profile engagement".

A fourth one ("visitors to any member page") was asked for but can't be
built: member pages only ever carry the member's own pixel, never ours,
by design, so there's no data for our account to draw that audience
from. The only way to get it is putting DigitalFlyer's own pixel on
member pages too, which is a real decision about what members were told
at signup, not mine to make quietly. Say the word if you want that one
properly considered.

---

That's genuinely everything. Reply whenever, in any order, "yes to 3"
is the only one that unblocks further work on my end.
