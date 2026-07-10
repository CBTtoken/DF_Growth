"use server";

import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/schemas/lead";
import { sendCapiEvent } from "@/lib/meta/capi";
import { sendEmail } from "@/lib/email/resend";

type LeadState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// CLAUDE.md Section 7.2.
export async function captureLead(
  growthClientId: string,
  landingPageId: string,
  pageUrl: string,
  businessName: string,
  ownerEmail: string | null,
  _prevState: LeadState,
  formData: FormData
): Promise<LeadState> {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const eventId = crypto.randomUUID();
  const admin = createAdminClient();
  const cookieStore = await cookies();
  const fbclid = cookieStore.get("fbclid")?.value ?? null;
  const userAgent = (await headers()).get("user-agent") ?? "";

  const { error } = await admin.from("leads").insert({
    growth_client_id: growthClientId,
    landing_page_id: landingPageId,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    fbclid,
    event_id: eventId,
  });

  if (error) {
    return { error: { _form: ["Could not save your details, please try again."] } };
  }

  // Found via real UAT: leads were being saved with no way for the business
  // owner to ever find out one came in — no dashboard view read them back
  // and nothing notified anyone. This is best-effort on purpose: a failed
  // notification email must never make the visitor think their submission
  // failed, since it didn't — the lead is already saved above.
  if (ownerEmail) {
    try {
      await sendEmail({
        to: ownerEmail,
        subject: `New lead: ${parsed.data.name}`,
        html: `
          <p>You've got a new lead from your DigitalFlyer Growth page, <strong>${businessName}</strong>.</p>
          <p>
            <strong>Name:</strong> ${parsed.data.name}<br>
            <strong>Email:</strong> ${parsed.data.email}<br>
            <strong>Phone:</strong> ${parsed.data.phone ?? "not given"}
          </p>
          <p>View all your leads in your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">dashboard</a>.</p>
        `,
      });
    } catch (err) {
      console.error("Lead notification email failed", err);
    }
  }

  // Deliberately awaited, not fire-and-forget. Tried a bare unawaited
  // promise (never completed — leads saved, capi_events stayed empty) and
  // next/server's after() (still never completed after 100+ seconds of
  // polling, with no Vercel log access available here to see why). Awaiting
  // directly is the one approach proven to actually finish: Meta's API is
  // normally sub-second, and errors inside sendCapiEvent are caught so a
  // slow/failed CAPI call still can't break the lead confirmation itself —
  // it just means the visitor waits slightly longer for it.
  try {
    await sendCapiEvent({
      growthClientId,
      eventName: "Lead",
      email: parsed.data.email,
      phone: parsed.data.phone,
      fbclid,
      eventId,
      eventSourceUrl: pageUrl,
      clientUserAgent: userAgent,
    });
  } catch (err) {
    console.error("CAPI send failed", err);
  }

  return { success: true };
}
