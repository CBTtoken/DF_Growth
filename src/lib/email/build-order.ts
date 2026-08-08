import { sendEmail } from "@/lib/email/resend";
import { BUILD_ORDER_WORKING_DAYS } from "@/lib/growth-client/build-order";

// Sprint "Onboarding two doors" item 1.
//
// A build-order member must never get the ordinary welcome email. That one
// is subject-lined "Your page is live!" and links straight at /{slug},
// which for these members is a page nobody has built yet: the wizard never
// ran, there is no published landing_pages row, and the link 404s. Sending
// it would mean the first thing a customer sees after paying R630 is a
// broken promise. This is what they get instead.
//
// House style: "Good day {name}," never "Hi there", and no em dashes.
export async function sendBuildOrderEmail({
  businessName,
  contactEmail,
  dueAt,
}: {
  businessName: string;
  contactEmail: string | null;
  dueAt: Date;
}): Promise<void> {
  if (!contactEmail) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const dashboardUrl = `${siteUrl}/dashboard`;

  const dueLabel = dueAt.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const result = await sendEmail({
    to: contactEmail,
    subject: "We have your details, your page is being built",
    html: `
      <p>Good day ${businessName},</p>
      <p>Thank you, your payment came through and we have everything we need to start.</p>
      <p>We are building your page now. It will be live by <strong>${dueLabel}</strong>, which is ${BUILD_ORDER_WORKING_DAYS} working days from today, and we will email you the moment it is up.</p>
      <p><strong>One thing that helps us:</strong> your own photos. Real photos of your work, your shop or your food make a bigger difference than anything else on the page. You can upload them yourself from your dashboard:</p>
      <p><a href="${dashboardUrl}">Go to your dashboard</a></p>
      <p>If it is easier, send them to us on WhatsApp instead and we will load them for you. Either way, do not worry if you have none yet, we will build your page around what you have.</p>
      <p>If we need anything else, we will message you.</p>
      <p>DigitalFlyer SA</p>
    `,
  });

  if (!result.ok) {
    console.error("Failed to send build order email", result.error, { contactEmail });
  }
}
