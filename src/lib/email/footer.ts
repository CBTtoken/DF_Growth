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
