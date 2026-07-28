-- Chasing an overdue invoice.
--
-- "Who still owes me?" is one of the four problems the landing page leads
-- with, and until now the product could show a member they were owed money
-- and then offer them nothing to do about it. Reports made that worse, not
-- better: it now shows exactly which invoices are over 90 days and still
-- has no next step.
--
-- This records only that a reminder was prepared. KatisoBiz never sends
-- anything to a customer by itself: it opens WhatsApp on the member's own
-- phone with the message written, and the member presses send. Same rule as
-- quotes and invoices, and the reason is the same. A tool that messages
-- your customers on your behalf is a trust problem, and a wrongly timed
-- automatic dunning message damages a relationship the member owns and we
-- do not.

alter table public.bizup_documents
  add column if not exists last_reminded_at timestamptz;

comment on column public.bizup_documents.last_reminded_at is
  'When the member last prepared a payment reminder for this invoice. Not proof it was sent: the member presses send in WhatsApp themselves. Used to show "reminded 3 days ago" so a member does not nag a customer twice in a morning.';

alter table public.bizup_documents
  add column if not exists reminder_count integer not null default 0;
