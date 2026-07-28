-- Secure expiring download links for the accountant export package.
--
-- Spec Sec 12: "Deliver as a secure expiring download link, not as a raw
-- email attachment. The ZIP contains third-party personal information and
-- should not sit indefinitely in an inbox."
--
-- The link has to work for someone who is not logged in, because the whole
-- point is that the member sends it to their accountant. So it is
-- authenticated by an unguessable token rather than by a session, and the
-- token expires.
--
-- Deliberately stores no ZIP. The archive is built on demand when the link
-- is opened, so a member's customer list never sits at rest in a storage
-- bucket waiting to be forgotten about. It also means a revoked or expired
-- link leaves nothing behind to clean up.

create table public.bizup_export_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts (id) on delete cascade,

  -- 32 random bytes, base64url. Long enough that guessing is not a threat
  -- model, which matters because this is the only thing standing between
  -- the internet and a member's customer list.
  token text not null unique,

  period_from date not null,
  period_to date not null,

  expires_at timestamptz not null,
  created_at timestamptz not null default now(),

  -- Recorded so a member can see whether their accountant actually opened
  -- it, and so an unexpected download is visible after the fact.
  first_downloaded_at timestamptz,
  download_count integer not null default 0
);

create index bizup_export_links_account_idx
  on public.bizup_export_links (account_id, created_at desc);

alter table public.bizup_export_links enable row level security;

create policy "members read own bizup export links"
  on public.bizup_export_links for select
  using (
    exists (
      select 1 from public.bizup_accounts a
      where a.id = bizup_export_links.account_id
        and a.owner_user_id = auth.uid()
    )
  );

-- A member may revoke a link they created. There is no insert policy: the
-- token is generated server side, because a client-chosen token would let
-- a member pick a guessable one.
create policy "members revoke own bizup export links"
  on public.bizup_export_links for delete
  using (
    exists (
      select 1 from public.bizup_accounts a
      where a.id = bizup_export_links.account_id
        and a.owner_user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.bizup_export_links to service_role;
