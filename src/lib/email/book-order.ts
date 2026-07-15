import { sendEmail } from "@/lib/email/resend";

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 5: "expected batch
// information" per the spec — batch_number is still null at this point
// (Sprint 3 assigns it manually), so this confirms the order and sets
// expectations about batching generally rather than naming a number that
// doesn't exist yet. Contact details per Sec 7.
export async function sendBookOrderConfirmationEmail({
  buyerName,
  email,
  edition,
}: {
  buyerName: string;
  email: string;
  edition: string;
}): Promise<void> {
  const editionLabel = edition === "personalised" ? "Personalised Paperback" : "Standard Paperback";

  const result = await sendEmail({
    to: email,
    subject: "Your Standing 365 order is confirmed",
    html: `
      <p>Good day ${buyerName},</p>
      <p>Thank you for your order — your <strong>${editionLabel}</strong> copy of Standing 365 is confirmed.</p>
      <p>Paperbacks are printed and shipped in batches of 50. We'll email you as soon as your order is
      assigned to a batch, and keep you updated until it ships.</p>
      <p>Questions in the meantime? Reach us at
      <a href="mailto:dewald@digitalflyer.co.za">dewald@digitalflyer.co.za</a> or WhatsApp
      <a href="https://wa.me/27723110570">+27 72 311 0570</a>.</p>
    `,
  });

  if (!result.ok) {
    console.error("Book order confirmation email failed", email, result.error);
  }
}

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sprint 3: "Batch notification
// email when a customer's order is assigned or reassigned a batch number."
// Fired from OrdersSection's assignBatch action, not the webhook — batch
// assignment is a manual, later step (Dewald in the dashboard), unrelated
// to payment succeeding.
export async function sendBatchAssignedEmail({
  buyerName,
  email,
  batchNumber,
}: {
  buyerName: string;
  email: string;
  batchNumber: number;
}): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: "Your Standing 365 order has a batch number",
    html: `
      <p>Good day ${buyerName},</p>
      <p>Your Standing 365 order has been assigned to <strong>batch ${batchNumber}</strong> — printed and
      shipped together in batches of 50. We'll email you again the moment it ships.</p>
      <p>Questions in the meantime? Reach us at
      <a href="mailto:dewald@digitalflyer.co.za">dewald@digitalflyer.co.za</a> or WhatsApp
      <a href="https://wa.me/27723110570">+27 72 311 0570</a>.</p>
    `,
  });

  if (!result.ok) {
    console.error("Batch assigned email failed", email, result.error);
  }
}

// Sprint 3: "mark orders as shipped."
export async function sendShippedEmail({ buyerName, email }: { buyerName: string; email: string }): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: "Your Standing 365 order has shipped",
    html: `
      <p>Good day ${buyerName},</p>
      <p>Good news — your Standing 365 order is on its way.</p>
      <p>Questions? Reach us at <a href="mailto:dewald@digitalflyer.co.za">dewald@digitalflyer.co.za</a> or
      WhatsApp <a href="https://wa.me/27723110570">+27 72 311 0570</a>.</p>
    `,
  });

  if (!result.ok) {
    console.error("Shipped email failed", email, result.error);
  }
}
