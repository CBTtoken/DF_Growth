-- Public launch changes for KatisoBiz Jobs (Dewald, 7 August walkthrough).
--
-- Three small additions, no destructive changes.
--
-- 1. cover_message on an application. Dewald asked for "a short cover
--    message the seeker can type in" alongside the one-tap apply. It is
--    nullable because applying with no message must stay one tap: the
--    message is the optional part, the CV is the application.
--
-- 2. notified_at on an application. The employer gets one email per
--    application, and this column is what makes that "one" true even if a
--    retry or a double submit reaches the send path twice. Null means the
--    alert has not gone out; a timestamp means it has and must not repeat.
--
-- 3. source on homepage_inquiries. The Jobs questions form lands in the
--    same admin Support inbox as the homepage enquiry form, and without
--    this the admin cannot tell a job seeker's question from a marketplace
--    lead. Defaulted so every existing row keeps meaning what it meant.

alter table public.jobs_applications
  add column if not exists cover_message text,
  add column if not exists notified_at timestamptz;

comment on column public.jobs_applications.cover_message is
  'Optional short note the applicant typed when applying. Free text, sanitised for ID and bank numbers on the way in, same rule as every other free-text field in Jobs.';

comment on column public.jobs_applications.notified_at is
  'When the employer alert email was sent for this application. Null means not yet sent. Guards against sending the same alert twice.';

alter table public.homepage_inquiries
  add column if not exists source text not null default 'homepage';

comment on column public.homepage_inquiries.source is
  'Which form the enquiry arrived through: homepage, or jobs for the KatisoBiz Jobs questions form. The admin Support inbox reads it to label the row.';
