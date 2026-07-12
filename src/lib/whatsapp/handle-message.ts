import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp/graph-api";
import type { IncomingWhatsAppMessage } from "@/lib/whatsapp/parse-webhook";

// Stage 1 of Sec 32: proves the webhook can receive, persist (keyed on
// bsuid — see the migration's own comment), and reply to a real message.
// The full step 1-7 conversation flow (business info through Paystack
// payment link) is deliberately not built in this same pass — a state
// machine that size needs its own dedicated build and review, not to be
// rushed alongside the webhook plumbing it depends on.
export async function handleIncomingWhatsAppMessage(message: IncomingWhatsAppMessage): Promise<void> {
  const admin = createAdminClient();

  const { data: conversation, error } = await admin
    .from("whatsapp_conversations")
    .upsert(
      { bsuid: message.bsuid, phone_number: message.phoneNumber, last_message_at: new Date().toISOString() },
      { onConflict: "bsuid" }
    )
    .select("id, current_step, step_data, growth_client_id")
    .single();

  if (error || !conversation) {
    console.error("Failed to upsert whatsapp_conversations row", error);
    return;
  }

  await sendWhatsAppText(
    message.bsuid,
    "Hi, thanks for messaging DigitalFlyer SA! WhatsApp signup is being finished up, check back soon."
  );
}
