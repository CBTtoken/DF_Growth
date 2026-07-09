"use server";

import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/schemas/lead";
import { sendCapiEvent } from "@/lib/meta/capi";

type LeadState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// CLAUDE.md Section 7.2.
export async function captureLead(
  growthClientId: string,
  landingPageId: string,
  pageUrl: string,
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
