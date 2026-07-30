import { sendEmail } from "@/lib/email/resend";
import { bizupUnsubscribeUrl } from "@/lib/bizup/unsubscribe";

// The welcome email a new KatisoBiz member gets, and until now the only
// email they would ever have received was the six digit login code.
//
// Written against what the live data actually showed on 29 July 2026, not
// against a guess. Ten accounts, eight drafts, and not a single document
// ever issued. Seven of those eight drafts were stopped on the same thing:
// line items typed in, real money on them, and no customer chosen. One of
// them was worth R55,020.
//
// So this email has one job, and it is not to be charming. It is to get a
// member from signup to one issued document, by naming in advance the two
// things that stop people:
//
//   1. A quote needs a customer before it can be issued
//   2. An invoice needs banking details before anyone can pay it
//
// Everything else is deliberately left out. A member reading this is
// standing somewhere with a phone, not sitting at a desk, and a thesis
// gets closed. The tone is South African and warm without being matey:
// these are people running real businesses and the fastest way to lose
// them is to sound like a startup talking down to them.

const BRAND_BLUE = "#1081b8";
const ORANGE = "#e8821a";
const INK = "#1c2b3a";

function step(n: string, title: string, body: string): string {
  return `
    <tr>
      <td style="padding:0 0 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="34" valign="top" style="padding-top:2px;">
              <div style="width:26px;height:26px;border-radius:999px;background:${BRAND_BLUE};color:#ffffff;font-size:14px;font-weight:700;text-align:center;line-height:26px;">${n}</div>
            </td>
            <td valign="top">
              <p style="margin:0;font-size:15px;font-weight:700;color:${INK};">${title}</p>
              <p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:#4a5b6b;">${body}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export async function sendKatisoBizWelcomeEmail({
  businessName,
  email,
  origin,
  accountId,
}: {
  businessName: string;
  email: string;
  origin: string;
  /** Identifies exactly one account for the unsubscribe link. */
  accountId: string;
}): Promise<void> {
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;">
    <p style="font-size:16px;line-height:1.6;color:${INK};margin:0 0 14px;">
      Good day ${businessName},
    </p>

    <p style="font-size:16px;line-height:1.6;color:${INK};margin:0 0 12px;font-weight:700;">
      Super excited to have you on board.
    </p>

    <p style="font-size:15px;line-height:1.6;color:#4a5b6b;margin:0 0 18px;">
      Let us get you quoting and invoicing like a champ, and keep both your customers and your
      accountant happy while we are at it. You are in already. No card needed, nothing to install,
      and ten free documents every month.
    </p>

    <p style="font-size:15px;line-height:1.6;color:#4a5b6b;margin:0 0 22px;">
      Below is your first quote from start to finish. Follow it exactly and you will have one sent
      in about a minute. Every button we mention is written the way you will see it on your screen.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${step(
        "1",
        "Press New quote",
        "It is the big blue button on your home screen, under <strong>Get to work</strong>."
      )}
      ${step(
        "2",
        "Enter what you are charging for",
        "Under <strong>What you are charging for</strong>, enter the job in your own words, for example <em>Replace geyser</em>. Enter the price next to it and press <strong>Add</strong>. Do that again for each item: labour, parts, callout, whatever the job needs. Anything you enter can be saved to your price list, so next time it is already there."
      )}
      ${step(
        "3",
        "Say who the quote is for",
        "Scroll to <strong>Who is this quote for?</strong> If the customer is already saved, press <strong>Choose someone</strong> and pick them. If this is a new customer, press <strong>Add a new customer</strong>, enter their name, and press <strong>Save customer</strong>. You come straight back to your quote with their name on it and nothing lost."
      )}
      ${step(
        "4",
        "Press Issue this quote",
        "This gives the quote its number and locks the amounts. Until you do this it is only a draft and cannot be sent. Nothing is emailed to anyone at this point."
      )}
      ${step(
        "5",
        "Press Send on WhatsApp",
        "Your own WhatsApp opens with the message already written and a link to the quote. You press send yourself, so it comes from your number and your customer sees a name they know. When they open it, we email you to let you know."
      )}
    </table>

    <div style="border-left:3px solid ${ORANGE};background:#fdf6ef;padding:14px 16px;margin:6px 0 22px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${INK};">
        One thing to do before your first invoice
      </p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#4a5b6b;">
        Press <strong>Settings</strong> in the menu, then <strong>Banking details</strong>, and
        enter your bank, account number and branch code. You only ever do this once. After that
        they print on every invoice automatically, with your invoice number as the reference, so
        the money landing in your account is money you can match to a job. Without them your
        customer receives an invoice with no way to pay you.
      </p>
      <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#4a5b6b;">
        While you are in <strong>Settings</strong>, press <strong>Business details</strong> and
        enter your business name, address and phone number. That is what prints at the top of
        every quote and invoice you send.
      </p>
    </div>

    <p style="margin:0 0 26px;">
      <a href="${origin}/help" style="display:inline-block;background:${ORANGE};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:999px;">
        See how it all works
      </a>
    </p>

    <p style="font-size:15px;line-height:1.6;color:#4a5b6b;margin:0 0 8px;">
      Two more things worth knowing, and then we will leave you alone. If you are not registered
      for VAT, KatisoBiz never mentions VAT at all, so there is nothing for you to get wrong. And
      if you send an invoice with a mistake on it, press <strong>Fix this invoice</strong> and
      answer one question. It sorts the rest out properly behind the scenes, the way SARS expects,
      without you needing to know what a credit note is.
    </p>

    <p style="font-size:15px;line-height:1.6;color:${INK};margin:22px 0 8px;font-weight:700;">
      Stuck at any point? Please ask.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#4a5b6b;margin:0 0 22px;">
      The <a href="${origin}/help" style="color:${BRAND_BLUE};font-weight:700;">Help page</a> walks
      through every screen with the buttons named, and answers the questions we get asked most. If
      it does not cover what you need, just hit reply to this email, or write to
      <a href="mailto:info@digitalflyer.co.za" style="color:${BRAND_BLUE};">info@digitalflyer.co.za</a>.
      A real person reads it and we would honestly rather hear from you than have you give up on
      something small.
    </p>

    <div style="border-top:1px solid #e5e7eb;padding-top:18px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${INK};">
        When ten documents a month is not enough
      </p>
      <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#4a5b6b;">
        <strong>R49 a month</strong> gives you 75 documents, your own logo on every quote and
        invoice, all five document styles, your customer list, reports, and a one tap export for
        your accountant.
      </p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#4a5b6b;">
        <strong>R89 a month</strong> is the same thing with no limit on documents at all.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#4a5b6b;">
        And if you also need a proper web page so that new customers can find you in the first
        place, have a look at
        <a href="https://growth.digitalflyersa.co.za/pricing" style="color:${BRAND_BLUE};font-weight:700;">DigitalFlyer Growth</a>.
        It builds you a professional page, puts your business on our marketplace, and the R49
        KatisoBiz plan is included in it at no extra cost.
      </p>
    </div>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
      Would rather not get emails from us?
      <a href="${bizupUnsubscribeUrl(accountId)}" style="color:#9ca3af;">Unsubscribe</a>.
      It only stops emails to you. The quotes and invoices you send your own customers are not
      affected.
    </p>
  </div>`;

  const result = await sendEmail({
    to: email,
    subject: "Welcome to KatisoBiz, let us get your first quote out",
    html,
    fromName: "KatisoBiz",
    // Without this, a reply goes to the sending subdomain, which nobody
    // reads. The email invites people to reply and tells them a real
    // person sees it, so that has to be true.
    replyTo: "info@digitalflyer.co.za",
  });

  if (!result.ok) {
    console.error("KatisoBiz welcome email failed", email, result.error);
  }
}
