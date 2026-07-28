-- Telling a member what their customer just did.
--
-- The product goes silent between a member sending a quote and remembering
-- to check it. These columns support three emails, all of them to the
-- member and never to the member's customer. That distinction is the same
-- rule the reminder feature follows: KatisoBiz does not message a
-- member's customers on their behalf.
--
-- Each notification records its own timestamp rather than sharing a
-- "notified_at", because the three fire at different moments in a
-- document's life and one must never suppress another. They are also the
-- idempotency guard: the daily job filters on the column being null, so a
-- retry, a double cron run or a redeploy mid-run cannot email twice.

alter table public.bizup_accounts
  add column if not exists notify_by_email boolean not null default true;

comment on column public.bizup_accounts.notify_by_email is
  'Whether the member wants email when a customer opens a document, a quote is about to expire, or an invoice goes overdue. On by default: these are the messages that bring a member back to the product, and a member who does not want them can switch them off in Settings.';

alter table public.bizup_documents
  add column if not exists notified_opened_at timestamptz;

comment on column public.bizup_documents.notified_opened_at is
  'When the member was emailed that their customer first opened this document. Set once, in the same guarded write that sets first_viewed_at, so it cannot fire twice however many times the link is opened.';

alter table public.bizup_documents
  add column if not exists notified_expiring_at timestamptz;

comment on column public.bizup_documents.notified_expiring_at is
  'When the member was emailed that this quote is about to pass its valid_until date. Null means not yet sent, which is what the daily job filters on.';

alter table public.bizup_documents
  add column if not exists notified_overdue_at timestamptz;

comment on column public.bizup_documents.notified_overdue_at is
  'When the member was emailed that this invoice passed its due date. Null means not yet sent. Sent once only: chasing beyond that is the member''s call, using the reminder feature that opens their own WhatsApp.';

-- The daily job scans for documents needing each email. Without these it
-- would be a full table scan per account per day, which is fine at seven
-- members and not at a thousand.
create index if not exists bizup_documents_notify_expiring_idx
  on public.bizup_documents (valid_until)
  where doc_type = 'quote' and notified_expiring_at is null;

create index if not exists bizup_documents_notify_overdue_idx
  on public.bizup_documents (due_date)
  where doc_type = 'invoice' and notified_overdue_at is null;
