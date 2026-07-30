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
      <p>Thank you for your order. Your <strong>${editionLabel}</strong> copy of Standing 365 is confirmed.</p>
      <p>Paperbacks are printed and shipped in batches of 50. We'll email you as soon as your order is
      assigned to a batch, and keep you updated until it ships.</p>
      <p>Questions in the meantime? Reach us at
      <a href="mailto:dewald@digitalflyer.co.za">dewald@digitalflyer.co.za</a>.</p>
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
      <p>Your Standing 365 order has been assigned to <strong>batch ${batchNumber}</strong>. Batches are printed and
      shipped together, fifty at a time. We'll email you again the moment it ships.</p>
      <p>Questions in the meantime? Reach us at
      <a href="mailto:dewald@digitalflyer.co.za">dewald@digitalflyer.co.za</a>.</p>
    `,
  });

  if (!result.ok) {
    console.error("Batch assigned email failed", email, result.error);
  }
}

/**
 * The batch has gone to the printer, and now there is a real date.
 *
 * Dewald, 31 July: "there is no set date yet, only once we send it to the
 * printer can we set an expected delivery date? Should we add a 3rd
 * trigger, Sent for Printing?"
 *
 * This is the email that makes a batch number mean something. Until now a
 * buyer was told "you are in batch 1", which could honestly mean tomorrow
 * or six weeks, and gave them nothing to plan around. A date only becomes
 * truthful once the run has actually gone off, which is why this is a
 * separate step rather than something promised at checkout.
 */
export async function sendSentForPrintingEmail({
  buyerName,
  email,
  batchNumber,
  expectedDeliveryDate,
}: {
  buyerName: string;
  email: string;
  batchNumber: number;
  /** Already formatted for a human, for example "14 August 2026". */
  expectedDeliveryDate: string | null;
}): Promise<void> {
  // No date, no promise. Saying "soon" is worse than saying nothing,
  // because it sets an expectation nobody agreed to.
  const dateLine = expectedDeliveryDate
    ? `<p>We expect it to reach you around <strong>${expectedDeliveryDate}</strong>. We will email you again the moment it ships.</p>`
    : `<p>We will email you again the moment it ships.</p>`;

  const result = await sendEmail({
    to: email,
    subject: "Your Standing 365 order is at the printer",
    html: `
      <p>Good day ${buyerName},</p>
      <p>Your copy of Standing 365 is part of <strong>batch ${batchNumber}</strong>, which has just
      gone off to the printer.</p>
      ${dateLine}
      <p>Questions in the meantime? Reach us at
      <a href="mailto:dewald@digitalflyer.co.za">dewald@digitalflyer.co.za</a>.</p>
    `,
  });

  if (!result.ok) {
    console.error("Sent for printing email failed", email, result.error);
  }
}

// Sprint 3: "mark orders as shipped."
export async function sendShippedEmail({ buyerName, email }: { buyerName: string; email: string }): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: "Your Standing 365 order has shipped",
    html: `
      <p>Good day ${buyerName},</p>
      <p>Good news, your Standing 365 order is on its way.</p>
      <p>Questions? Reach us at <a href="mailto:dewald@digitalflyer.co.za">dewald@digitalflyer.co.za</a>.</p>
    `,
  });

  if (!result.ok) {
    console.error("Shipped email failed", email, result.error);
  }
}
