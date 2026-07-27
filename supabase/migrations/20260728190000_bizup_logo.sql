-- A member's own logo on their documents.
--
-- Sold on the landing page and in the R49 tier ("Your own logo") and never
-- built, so the pricing table was promising something that did not exist.
-- entitlements.ts has had an `ownLogo` capability all along with nothing
-- reading it.

alter table public.bizup_accounts
  add column if not exists logo_path text;

comment on column public.bizup_accounts.logo_path is
  'Path in the bizup-logos storage bucket. Null means no logo, which is the free tier and also any paid member who has not uploaded one.';

-- Public bucket, deliberately.
--
-- A logo on a quote is public by its nature: it is printed on a document
-- the member emails and WhatsApps to customers, and the customer opens
-- that document on a link with no login. Making the bucket private would
-- mean signing a URL for every render including the customer's own copy,
-- which buys nothing, because anyone holding the document link can see the
-- logo anyway.
--
-- This is the opposite of bizup_bank_details, which is encrypted precisely
-- because it is not meant to be world-readable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bizup-logos',
  'bizup-logos',
  true,
  2097152, -- 2MB, enforced by the storage layer as well as in the action
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Reads are open, matching the public bucket above.
drop policy if exists "bizup logos are publicly readable" on storage.objects;
create policy "bizup logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'bizup-logos');

-- No insert, update or delete policy for anon or authenticated on purpose.
-- Uploads go through a Server Action running as the service role, which
-- checks the member's plan and account ownership first. Without that check
-- a free member could write a logo their tier does not include, and any
-- member could write into another member's folder.
