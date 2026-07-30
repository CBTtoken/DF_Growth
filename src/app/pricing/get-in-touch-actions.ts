"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { homepageInquirySchema } from "@/lib/schemas/lead";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";

// Where DigitalFlyer's own enquiry notifications go. A real address (Dewald's
// inbox), not an invented one, so this never triggers a bounce to a fake test
// address.
const ADMIN_NOTIFY_EMAIL = "info@digitalflyer.co.za";

type InquiryState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// Public Beta Polish Sprint Sec 5: the marketing homepage's own "Get in
// Touch" block. Separate from captureLead (g/[clientSlug]/actions.ts) since
// this enquiry is about DigitalFlyer itself, not any specific client — it
// lands in homepage_inquiries and surfaces in the admin Support tab, never
// a business owner's leads list.
export async function submitHomepageInquiry(_prevState: InquiryState, formData: FormData): Promise<InquiryState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`homepage-inquiry:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many submissions, please wait a few minutes and try again."] } };
  }

  const parsed = homepageInquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("homepage_inquiries").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    message: parsed.data.message ?? null,
  });

  if (error) {
    return { error: { _form: ["Could not save your details, please try again."] } };
  }

  // Notify DigitalFlyer so an enquiry is never missed by waiting to be spotted
  // in the admin Support tab. Best-effort: the enquiry is already saved, so a
  // failed notification must not make the visitor think their submission failed.
  try {
    await sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `New enquiry: ${parsed.data.name}`,
      html: `
        <p>Good day,</p>
        <p>A new enquiry came in through the DigitalFlyer SA site.</p>
        <p>
          <strong>Name:</strong> ${parsed.data.name}<br>
          <strong>Email:</strong> ${parsed.data.email}<br>
          <strong>Phone:</strong> ${parsed.data.phone ?? "not given"}
        </p>
        ${parsed.data.message ? `<p><strong>Message:</strong><br>${parsed.data.message.replace(/\n/g, "<br>")}</p>` : ""}
        <p>See it in your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/support">Support tab</a>.</p>
      `,
    });
  } catch (err) {
    console.error("Homepage inquiry notification email failed", err);
  }

  return { success: true };
}
