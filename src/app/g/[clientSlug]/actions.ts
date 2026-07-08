"use server";

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/schemas/lead";

type LeadState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// CLAUDE.md Section 7.2, minus the CAPI dispatch — Section 9's Meta
// Conversions API pipeline is Sprint 5 scope, not built yet. eventId is
// still generated and stored now so it's ready to reuse for Pixel/CAPI
// dedup once that pipeline exists, instead of retrofitting it later.
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

  const { error } = await admin.from("leads").insert({
    growth_client_id: growthClientId,
    landing_page_id: landingPageId,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    event_id: eventId,
  });

  if (error) {
    return { error: { _form: ["Could not save your details, please try again."] } };
  }

  return { success: true };
}
