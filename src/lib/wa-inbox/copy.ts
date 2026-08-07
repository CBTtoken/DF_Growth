import type { SupabaseClient } from "@supabase/supabase-js";

// Every string the system can send lives in wa_bot_copy, edited and
// approved by Dewald in /admin/whatsapp/answers. Nothing is generated;
// missing rows fall back to an empty string, which the flow treats as
// "do not send".
export type BotCopy = Record<string, string>;

export async function getBotCopy(admin: SupabaseClient): Promise<BotCopy> {
  const { data } = await admin.from("wa_bot_copy").select("slug, body");
  const map: BotCopy = {};
  for (const row of data ?? []) map[row.slug] = row.body;
  return map;
}
