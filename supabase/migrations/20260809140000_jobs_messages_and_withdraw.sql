-- Messages on an application, and letting a seeker withdraw.
--
-- Dewald, 9 August 2026, walking both sides:
--
--   "When they applied for a job, they should be able to change the status,
--    cancel it, or unsuccessful or something like that?"
--
--   "What happens if the employer, ok wait nothing happens, maybe we should
--    enable a messaging option, employer can message the seeker, sorry it
--    was not a fit, or could you please supply us with more information, or
--    a general message and on general message seeker should be able to
--    respond?"
--
-- He is describing the hole in the middle of the product. An employer could
-- mark somebody Declined and the person only ever saw a status word change
-- on their dashboard. Everything else had to happen by phone or by email,
-- outside anything we can see, log, or protect either side with.
--
-- 1. 'withdrawn' joins the application status set. It is the seeker's own
--    word for "I am no longer available", and it is deliberately NOT the
--    same as the employer's 'declined': who ended it matters, to both of
--    them, and collapsing the two would lie on somebody's dashboard.
--
-- 2. jobs_application_messages is one thread per application, both
--    directions. sender_role says who wrote it rather than a user id
--    join, because the two sides are different tables (jobs_candidates and
--    jobs_employers) and every read already knows which side is asking.
--
-- Deleting a CV cascades the application and its messages away with it,
-- which is the same "something never held cannot leak" rule the
-- application table already follows.

alter table public.jobs_applications
  drop constraint if exists jobs_applications_status_check;

alter table public.jobs_applications
  add constraint jobs_applications_status_check
  check (status in ('new', 'reviewing', 'shortlisted', 'declined', 'withdrawn'));

create table if not exists public.jobs_application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.jobs_applications(id) on delete cascade,
  sender_role text not null check (sender_role in ('employer', 'candidate')),
  body text not null,
  -- When the other side was emailed about this message. Null means the
  -- alert has not gone out; a timestamp means it has and must not repeat.
  notified_at timestamptz,
  -- When the other side actually opened the thread after this arrived.
  -- Drives the unread count on both dashboards.
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists jobs_application_messages_thread
  on public.jobs_application_messages (application_id, created_at);

-- Same zero-policy posture as every other jobs_* table: all reads and
-- writes go through Server Actions with the service role, so RLS is on
-- with no policies (default-deny for anon and authenticated) and
-- service_role is granted explicitly.
alter table public.jobs_application_messages enable row level security;

grant select, insert, update, delete on public.jobs_application_messages to service_role;

comment on table public.jobs_application_messages is
  'Messages between an employer and an applicant, on one application. Both directions. Never a channel to somebody who has not applied.';
