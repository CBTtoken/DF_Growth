import { createAdminClient } from "@/lib/supabase/admin";

export type BetaEventType = "onboarding_completed" | "first_lead_received" | "trial_converted";

// Public Beta Polish Sprint Sec 13.6: fire-and-forget by design — a
// metrics write must never be able to fail or slow down the real action
// it's attached to (an onboarding wizard finishing, a lead being saved, a
// payment converting). Errors are logged, never thrown.
export async function trackBetaEvent(eventType: BetaEventType): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("beta_events").insert({ event_type: eventType });
    if (error) console.error("Failed to record beta event", eventType, error);
  } catch (err) {
    console.error("Failed to record beta event", eventType, err);
  }
}
