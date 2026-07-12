import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp/graph-api";
import { advanceConversation } from "@/lib/whatsapp/conversation";
import type { IncomingWhatsAppMessage } from "@/lib/whatsapp/parse-webhook";

const WELCOME_MESSAGE =
  "Hi, welcome to DigitalFlyer SA! Let's get your business online. What's your business name?";

// Combined spec Sec 32.3/32.4: resumability keyed on bsuid (see the
// migration's own comment for why, not phone number). A genuinely new
// conversation gets a welcome message and the first real question — it
// must NOT run the very first message a person ever sends (which could be
// anything, "Hi", a sticker caption, whatever) through advanceConversation
// as if it were their answer to "what's your business name". Existence is
// checked explicitly (select before insert) rather than inferred from
// current_step/step_data being at their initial values, since a genuine
// first real answer to that same question would look identical.
export async function handleIncomingWhatsAppMessage(message: IncomingWhatsAppMessage): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("whatsapp_conversations")
    .select("id, bsuid, phone_number, current_step, step_data, growth_client_id")
    .eq("bsuid", message.bsuid)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await admin
      .from("whatsapp_conversations")
      .insert({ bsuid: message.bsuid, phone_number: message.phoneNumber, last_message_at: new Date().toISOString() });

    if (insertError) {
      console.error("Failed to create whatsapp_conversations row", insertError);
      return;
    }

    await sendWhatsAppText(message.bsuid, WELCOME_MESSAGE);
    return;
  }

  const result = await advanceConversation(existing, message);

  const { error: updateError } = await admin
    .from("whatsapp_conversations")
    .update({
      current_step: result.nextStep,
      step_data: result.stepData,
      growth_client_id: result.growthClientId,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    console.error("Failed to persist whatsapp_conversations progress", updateError);
  }

  await sendWhatsAppText(message.bsuid, result.reply);
}
