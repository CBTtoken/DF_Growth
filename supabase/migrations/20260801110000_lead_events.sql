-- Handoff 02 C: lead event tracking.
--
-- Until now a member page had exactly one action, the lead form, and the
-- visitor had to submit it before any contact detail appeared. That gate
-- existed so leads could be counted. It taxed conversion hardest where the
-- money is: nobody with a burst pipe at eleven at night fills in a form to
-- reveal a phone number, they go back and phone the next business.
--
-- This table is what replaces the gate. Contact details go public, and the tap
-- is recorded instead of the reveal being withheld. The measurement survives,
-- the conversion tax does not.
--
-- One row per action. The counts a member sees on their dashboard are grouped
-- out of here, the same shape page_views already uses, and for the same
-- reason: at this traffic level a row per event is cheap, and a single counter
-- column could never answer "how does this month compare to last".
create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,

  -- The three actions a member page offers. 'form' is the existing lead form,
  -- kept as the third option for non-urgent enquiries and after hours.
  action text not null check (action in ('call', 'whatsapp', 'form')),

  -- Deliberately coarse. Handoff 02 C: "Store enough to be useful and no more."
  -- Whether the visitor was on a phone changes how a member reads the number
  -- (a tel: tap on a desktop often does nothing), and that is the entire
  -- reason this column exists. Nothing finer is collected: no user agent
  -- string, no screen size, no fingerprint.
  device text not null default 'unknown' check (device in ('mobile', 'desktop', 'unknown')),

  -- Where the visitor came from, host only, never a full URL with its query
  -- string. A full referrer can carry search terms and campaign identifiers
  -- that amount to personal data; the host answers "is this Google, Facebook,
  -- or someone typing the address" and stops there. Null means a direct visit.
  source text,

  -- POPIA, and the reason this table has no ip column, no visitor id and no
  -- cookie: an event here is not linkable to a person. The lead form collects
  -- a name and an email because the visitor typed them knowing why. A tap on
  -- a WhatsApp button carries no such consent, so it is counted and nothing
  -- more. Deduplication below works on time alone, not on identity.
  created_at timestamptz not null default now()
);

-- Every read is "this member, this month, grouped by action", which is exactly
-- this index.
create index lead_events_client_created_idx
  on public.lead_events (growth_client_id, created_at desc);

-- Handoff 02 C: "Deduplicate obvious double-taps within a short window so the
-- counts are not inflated by accident."
--
-- Done in the database rather than in application code on purpose. The insert
-- comes from a public route on a page cached at the edge, so there is no
-- session to hold a "just counted this" flag in, and two rapid taps can land
-- on two different serverless instances that know nothing about each other.
-- A partial unique index cannot express "within N seconds", so this is a
-- trigger: a second event for the same member and action inside the window is
-- silently dropped rather than raising an error, because a tracking write must
-- never be able to fail the action it is attached to.
--
-- 10 seconds is chosen to catch a double-tap and an impatient re-tap while
-- still counting a visitor who genuinely calls, gets no answer, and tries
-- WhatsApp a minute later. It cannot distinguish two different visitors
-- tapping the same button within 10 seconds, which at 34 members and this
-- traffic is a rounding error against the inflation it prevents.
create or replace function public.drop_duplicate_lead_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.lead_events
    where growth_client_id = new.growth_client_id
      and action = new.action
      and created_at > now() - interval '10 seconds'
  ) then
    return null;
  end if;
  return new;
end;
$$;

create trigger lead_events_dedupe
  before insert on public.lead_events
  for each row
  execute function public.drop_duplicate_lead_event();

alter table public.lead_events enable row level security;

-- Written by the public tracking route and read by the dashboard, both through
-- the admin client, so no RLS policy is needed. The grant is not optional and
-- not implied: on this project a new table gives service_role nothing by
-- default, and the failure mode is a silently empty dashboard rather than an
-- error. Same note as page_views and board_posts.
grant select, insert on public.lead_events to service_role;
