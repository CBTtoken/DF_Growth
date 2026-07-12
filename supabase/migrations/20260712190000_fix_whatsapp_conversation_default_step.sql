-- Combined spec Sec 32.3: the original migration's default ('business_info')
-- was a placeholder written before the actual step-id scheme in
-- lib/whatsapp/conversation.ts was finalized ('business_name' is the real
-- first step). No real rows exist yet (this feature hasn't received a
-- verified live message), so a straight default change is safe — nothing
-- to backfill.
alter table public.whatsapp_conversations
  alter column current_step set default 'business_name';
