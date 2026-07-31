// Public Beta Polish Sprint Sec 12: exact required footer, applied inside
// sendEmail() itself (resend.ts) rather than at each call site, which
// guarantees every current and future transactional email gets it
// automatically with no risk of a new email being added later without it.
//
// The WhatsApp number came out on 29 July 2026 at Dewald's request, ahead
// of a dedicated support bot replacing it. Publishing a number that is
// about to change, in the footer of every email the platform sends, would
// keep pulling people to the old one long after the bot exists. It goes
// back in here, once, when the new number is live.
//
// Email remains the contact route and is genuinely read. The full company
// disclosure required by ECTA lives in the site footer, not here, so
// nothing legally required is lost by this.
// Which sign-off an email carries.
//
// "platform" is anything DigitalFlyer SA sends in its own name. "document" is
// a quote, invoice or credit note a KatisoBiz member sends to their OWN
// customer under their own business name.
//
// Found live on 31 July 2026: every KatisoBiz document was going out with the
// platform footer, so a member's invoice to their customer was signed "Your
// DigitalFlyer SA Team", carried our email address and linked to our
// marketplace. The customer could reasonably have replied to us about their
// own payment, or wondered who they were dealing with. Reply-To was always
// correct, this was purely the sign-off.
//
// The document footer is what the spec always specified: one small line,
// "Generated via KatisoBiz, DigitalFlyer SA", which is the acquisition loop
// (every document a member sends is seen by another business owner) without
// pretending we are party to their invoice.
export type EmailFooterKind = "platform" | "document";

export const DOCUMENT_FOOTER_HTML = `
  <hr style="margin-top:32px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:11px;line-height:1.5;color:#9ca3af;margin:0;">
    Generated via <a href="https://katisobiz.co.za" style="color:#9ca3af;">KatisoBiz</a>, DigitalFlyer SA.
    Quotes and invoices from your phone.
  </p>
`;

export const EMAIL_FOOTER_HTML = `
  <hr style="margin-top:32px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:13px;line-height:1.6;color:#4b5563;margin:0 0 12px;">
    Kind Regards<br />
    Your DigitalFlyer SA Team<br />
    Visibility and Accessibility<br />
    <a href="mailto:info@digitalflyer.co.za" style="color:#4b5563;">info@digitalflyer.co.za</a><br />
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
