-- Combined spec Sec 17: the required legal checkbox (Privacy Policy /
-- Terms & Conditions) and marketing consent are now two separate
-- checkboxes on signup, the second optional and unticked by default. This
-- is the one that needs its own record — consented_at already covers the
-- required legal agreement, but there was previously nowhere to record
-- whether someone actually opted into marketing emails/WhatsApp, which
-- matters for honoring an unsubscribe correctly later.
alter table public.growth_clients
  add column marketing_consent boolean not null default false;
