import { sendEmail } from "@/lib/email/resend";

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
}: {
  businessName: string;
  email: string;
  origin: string;
}): Promise<void> {
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;">
    <p style="font-size:16px;line-height:1.6;color:${INK};margin:0 0 14px;">
      Good day ${businessName},
    </p>

    <p style="font-size:16px;line-height:1.6;color:${INK};margin:0 0 6px;font-weight:700;">
      Right, let us get your quoting and invoicing looking like a champion.
    </p>

    <p style="font-size:15px;line-height:1.6;color:#4a5b6b;margin:0 0 22px;">
      You are in. No card, nothing to install, and ten free documents a month to prove it works
      before you spend a cent. Here is the whole thing in three steps, and the two bits that trip
      people up so they do not trip you up.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${step(
        "1",
        "Build the quote where you are standing",
        "Tap in the labour, the parts, the callout. Anything you type can be saved to your price list, so the second quote is faster than the first."
      )}
      ${step(
        "2",
        "Add the customer, and this is the one that catches people",
        "A quote needs a name on it before it can go out, because a document with nobody on it is not a document. If they are not on your list yet, press <strong>Add a new customer</strong> right there in the quote. You will not lose your work and you will not have to start again."
      )}
      ${step(
        "3",
        "Send it on WhatsApp, from your own number",
        "One tap opens WhatsApp with the message ready. Your customer sees a name they recognise, not a stranger. When they open it, we will tell you."
      )}
    </table>

    <div style="border-left:3px solid ${ORANGE};background:#fdf6ef;padding:14px 16px;margin:6px 0 22px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${INK};">
        One thing to do before your first invoice
      </p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#4a5b6b;">
        Add your banking details under Settings. They print on every invoice automatically, with
        your invoice number as the payment reference, so the money that lands in your account is
        money you can actually match to a job. Without them your customer gets an invoice and no
        way to pay it, which helps nobody. You only ever do this once.
      </p>
    </div>

    <p style="margin:0 0 26px;">
      <a href="${origin}/help" style="display:inline-block;background:${ORANGE};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:999px;">
        See how it all works
      </a>
    </p>

    <p style="font-size:15px;line-height:1.6;color:#4a5b6b;margin:0 0 8px;">
      Two more things worth knowing. If you are not registered for VAT, KatisoBiz never mentions
      VAT at all, so there is nothing to get wrong. And if you send an invoice with a mistake on
      it, there is a <strong>Fix this invoice</strong> button that sorts it out properly in the
      background, the way SARS expects, without you needing to know what a credit note is.
    </p>

    <p style="font-size:15px;line-height:1.6;color:${INK};margin:22px 0 0;">
      If something does not make sense, or does not work, reply to this email and tell us. A real
      person reads it, and at this stage we would genuinely rather hear it than not.
    </p>
  </div>`;

  const result = await sendEmail({
    to: email,
    subject: "Welcome to KatisoBiz, let us get your first quote out",
    html,
    fromName: "KatisoBiz",
  });

  if (!result.ok) {
    console.error("KatisoBiz welcome email failed", email, result.error);
  }
}
