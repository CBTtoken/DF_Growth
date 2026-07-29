-- Giving the admin Support inbox somewhere for a message to go.
--
-- The inbox shipped with a single mark-read toggle, which was enough while
-- nothing was arriving. It is not enough now: an enquiry that has been
-- answered, an enquiry that is spam, and an enquiry still waiting on a
-- reply all looked identical, so the list only ever grows and the one
-- number on it (unread) stops meaning anything.
--
-- Three states, not a workflow: read, archived, deleted. Archive is the
-- normal end of an enquiry's life and is reversible. Delete is for spam
-- and is not.
--
-- Replies get their own table rather than a last_reply column on the
-- inquiry, because the useful record is what we actually said and when,
-- and a second reply must not erase the first. It also keeps a record of
-- which admin answered, which a single column could not.

alter table public.homepage_inquiries
  add column if not exists archived_at timestamptz,
  add column if not exists replied_at timestamptz;

comment on column public.homepage_inquiries.archived_at is
  'Set when an admin files the enquiry away as dealt with. Null means it is still in the open list. Reversible.';
comment on column public.homepage_inquiries.replied_at is
  'Time of the most recent reply sent from the admin inbox. The replies themselves live in homepage_inquiry_replies.';

create table if not exists public.homepage_inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.homepage_inquiries(id) on delete cascade,
  admin_email text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists homepage_inquiry_replies_inquiry_idx
  on public.homepage_inquiry_replies (inquiry_id, created_at);

-- Same reasoning as homepage_inquiries itself: only the service-role admin
-- panel ever touches this, so RLS is on with no policies (default-deny for
-- anon and authenticated) and service_role is granted explicitly.
alter table public.homepage_inquiry_replies enable row level security;

grant delete on public.homepage_inquiries to service_role;
grant select, insert, delete on public.homepage_inquiry_replies to service_role;
