-- "One free post, once EVER" (Dewald, 7 Aug) cannot stay derived from
-- counting jobs_vacancies: the cleanup cron deletes those rows about 30
-- days after expiry, so the count silently resets and every free employer
-- would get a fresh free post each cycle. Derive-don't-store only works
-- when the source survives; here the purge destroys it by design, so the
-- one fact gets a durable stamp, set the first time a free-plan post goes
-- live.

alter table jobs_employers
  add column free_post_used_at timestamptz;

-- Any free-plan employer with a non-draft post today has spent theirs.
update jobs_employers e
set free_post_used_at = now()
where e.plan = 'free'
  and free_post_used_at is null
  and exists (
    select 1 from jobs_vacancies v
    where v.employer_id = e.id and v.status <> 'draft'
  );
