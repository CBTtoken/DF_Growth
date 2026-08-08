#!/usr/bin/env node
// One-off "your shop is open" email to Elize at WeCare Products, following
// scripts/send-buffelskop-client-email.js. Plain CommonJS + raw fetch against
// Resend's HTTP API, matching src/lib/email/resend.ts's pattern and
// src/lib/email/footer.ts's footer by hand, since this is a standalone script.
//
// The body is docs/WeCare_Client_Email_v2.md, client-facing half only. The
// "NOTES FOR YOU, NOT FOR HER" section of that document is deliberately not
// reproduced anywhere below.
//
// Usage:
//   node scripts/send-wecare-shop-live-email.js          (dry run, sends nothing)
//   node scripts/send-wecare-shop-live-email.js --live    (sends for real)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "DigitalFlyer SA <onboarding@resend.dev>";
const SITE_URL = "https://growth.digitalflyersa.co.za";

const LIVE = process.argv.includes("--live");

// Confirmed twice: her growth_clients.contact_email, and her own WeCare
// pamphlet and Soup and Sherry poster.
const TO = "elize.wecare@gmail.com";
const PAGE_URL = `${SITE_URL}/wecare-products`;
const SHOP_URL = `${SITE_URL}/wecare-products/shop`;

const EMAIL_FOOTER_HTML = `
  <hr style="margin-top:32px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:13px;line-height:1.6;color:#4b5563;margin:0 0 12px;">
    Kind Regards<br />
    Your DigitalFlyer SA Team<br />
    Visibility and Accessibility<br />
    WhatsApp: +27(0)72 311 0570<br />
    Our Marketplace: <a href="https://growth.digitalflyersa.co.za/marketplace" style="color:#4b5563;">growth.digitalflyersa.co.za/marketplace</a>
  </p>
  <p style="font-size:11px;line-height:1.5;color:#9ca3af;margin:0;">
    This email is confidential and may also be privileged. The recipient is responsible for virus
    checking this email and any attachments. If you are not the intended recipient please
    immediately notify us and delete this email, you must not use, disclose, distribute, copy,
    print or rely on this email. DigitalFlyer SA does not accept any liability for any loss or
    damage from your receipt or use of this email.
  </p>
`;

const SUBJECT = "Your WeCare shop is open, 22 products live";

const HTML = `
  <p>Good day Elize,</p>
  <p>Thank you for everything you sent. That was the lot, and it has made all the difference. Your shop is open.</p>
  <p><a href="${SHOP_URL}"><strong>${SHOP_URL}</strong></a></p>
  <p>What is on it now:</p>
  <ul>
    <li><strong>22 products, all priced</strong>, split into three sections a buyer can jump straight to: Wellness and supplements, Fragrance, and Skincare and body</li>
    <li><strong>Photographs on nearly all of them</strong>, from the pictures you sent. Your suppliers' photography is good and it shows</li>
    <li><strong>The whole Bella Vita perfume range</strong>, 51 fragrances for her and 49 for him, with a search box so somebody looking for one scent finds it in a second instead of scrolling</li>
    <li>Your collagen at R599 in all three flavours, and the full moringa range</li>
    <li>Six photographs from your evenings on <a href="${PAGE_URL}">your page</a>, which do more for the events side than anything I could write</li>
  </ul>
  <p>On the perfumes: I have set them up the way I suggested, under the Bella Vita name, with the designer names as the choice inside each page rather than as 130 separate pages on Google. Nothing is lost, everything is still findable, and it keeps you well clear of trouble. Have a look and tell me if it reads right to you.</p>
  <p>There are four small things left.</p>

  <p><strong>1. Four products still have no photograph</strong></p>
  <p>The gummies, the moringa for pets, Revive Your Roots and the wound spray. Everything you sent for those four is an advertising poster with wording printed over it, which cannot be used as a product picture.</p>
  <p>SPLITEQ will have the real ones. Ask them for <em>"product images on a white background, no text or wording over them"</em> and I will put them straight on. Or a phone photo on a plain white surface in good light does the job.</p>

  <p><strong>2. Your town</strong></p>
  <p>Your page says Gauteng. Adding the town is what puts you in front of somebody searching nearby. It is one word and it is worth a lot.</p>

  <p><strong>3. Revive Your Roots</strong></p>
  <p>I have it listed as a spray and a serum at R120 each, which is what your price list says. But I have nothing describing what it does. Two sentences from you and I will put them on.</p>

  <p><strong>4. The wound spray</strong></p>
  <p>I have listed the Just Heal It wound spray without a price, because it was not on any of your price lists. Send me the price and I will add it.</p>
  <p>One thing I would rather raise than leave: the wording on that label mentions diabetic ulcers, burns and skin grafts. That is a good deal stronger than anything else you sell, and in South Africa a product making wound-treatment claims sits close to being regulated as a medical device. I have described it narrowly on the page, as a wound cleanser. Worth checking with your supplier what they are registered for before we push it.</p>

  <p><strong>And the one that would change things most</strong></p>
  <p><strong>Your own Paystack account.</strong> At the moment every order comes through and you phone the buyer to arrange payment. That worked when there was one product on the shop. With 21 orderable products it is going to be a lot of phone calls, and some people will not wait.</p>
  <p>Paystack is free to open, there is no monthly fee, and the money goes straight to your account. Nothing routes through us. Say the word and I will send you the steps, they take about fifteen minutes.</p>
`;

async function main() {
  console.log(LIVE ? `LIVE run, this will send a real email to ${TO}\n` : "DRY RUN, printing the email, sending nothing.\n");
  console.log("To:", TO);
  console.log("Subject:", SUBJECT);
  console.log("\n--- HTML body ---\n");
  console.log(HTML);

  if (!LIVE) {
    console.log("\nDry run complete. Re-run with --live to actually send.");
    return;
  }

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY env var.");
    process.exit(1);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: TO, subject: SUBJECT, html: `${HTML}${EMAIL_FOOTER_HTML}` }),
  });

  if (!res.ok) {
    console.error(`Resend ${res.status}:`, await res.text());
    process.exit(1);
  }

  console.log("\nSent.", JSON.stringify(await res.json()));
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
