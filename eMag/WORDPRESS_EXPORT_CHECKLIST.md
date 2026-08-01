# Before you point moxiemag.co.za at the new site

Do this first. Once the domain moves, the WordPress site is unreachable and
anything still only living inside it is gone.

None of it is urgent. The new site works today on the Growth domain and can
take memberships there. Take your time with this list.

---

## 1. Sign in to WordPress

1. Go to `moxiemag.co.za/wp-admin`
2. Sign in with your WordPress username and password

If you cannot remember the password, use "Lost your password?" on that screen
before doing anything else. Do not leave this until the day you want to
switch.

---

## 2. Save the customer and order records

These are the people who paid you for issues 6, 7 and 8.

1. Left sidebar, click **WooCommerce**
2. Click **Orders**
3. Top of the screen, look for an **Export** button and click it
4. Choose **CSV**, then **Generate CSV**
5. Save the file somewhere you will find it again, alongside this checklist

Then the customer list:

1. Left sidebar, click **Users**
2. If there is an **Export** option at the top, use it the same way
3. If there is not, that is fine. The order export above already carries every
   paying customer's name and email

**Why it matters:** these are real people who gave you money. You said you
would email them directly and bring them across, and this file is the list you
will need to do that.

---

## 3. Save any subscriber or mailing list

1. Left sidebar, look for **Mailchimp**, **Newsletter**, **Contact Form 7**,
   or anything similar
2. If one of these exists, open it and look for **Export** or **Subscribers**
3. Save whatever it gives you

If none of those are there, skip this. Not every WordPress site collects
addresses.

---

## 4. Save every edition file

I already have June and July from the PDFs you gave me, and they are on the
new site. This step is about anything I have not seen.

1. Left sidebar, click **Media**
2. Click **Library**
3. Switch the view to **List** using the small icons at the top left
4. Look for any PDF, and any cover image, that is not June or July 2026
5. Click each one, then right click the **File URL** and choose
   **Save link as**

**Worth knowing:** the previous owner's issues are in here too. We agreed not
to republish those, but download them anyway. They cost nothing to keep and
you cannot get them back later.

---

## 5. Write down the page addresses

This is so nothing that is already on Google breaks.

1. Open `moxiemag.co.za/sitemap.xml` or `moxiemag.co.za/wp-sitemap.xml` in
   your browser
2. Save the page: **Ctrl+S**, choose **Webpage, complete**
3. Send it to me

I have already set up redirects for the obvious ones: the shop, the product
pages, the cart, the checkout and the my-account area all send visitors to the
right place on the new site. This step catches anything unusual I could not
have guessed.

---

## 6. Tell me when you are done

Send me the order CSV and the sitemap file, and say the word. Then I will:

- add `moxiemag.co.za` to Vercel
- give you the exact DNS records to change at your registrar
- check the site answers correctly on the real domain
- confirm Google is being told the new site can be indexed

**Do not change the DNS yourself before telling me.** Not because anything
terrible happens, but because there is a five minute window where I need to
confirm the certificate and the redirects came up correctly, and it is much
easier if I know it is happening.

---

## What you do not need to do

- You do not need to cancel the WordPress hosting on the same day. Leave it
  running for a month in case something turns up that we missed.
- You do not need to move any content by hand. The new site is already built
  and already has June, July and the August placeholder.
- You do not need to warn customers before the switch. The old addresses
  redirect, so nothing they have breaks.
