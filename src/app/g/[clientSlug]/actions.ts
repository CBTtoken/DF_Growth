"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/schemas/lead";
import { sendCapiEvent } from "@/lib/meta/capi";

type LeadState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// CLAUDE.md Section 7.2.
export async function captureLead(
  growthClientId: string,
  landingPageId: string,
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

  // Fire-and-forget: a slow or failed CAPI call should never block the lead
  // confirmation the visitor sees. Silently skips if the client hasn't
  // connected Meta (no pixel/token) — that's expected, not an error.
  sendCapiEvent({
    growthClientId,
    eventName: "Lead",
    email: parsed.data.email,
    phone: parsed.data.phone,
    fbclid,
    eventId,
  }).catch((err) => console.error("CAPI send failed", err));

  return { success: true };
}
