-- Sprint 1, Build Item 3: lets Dewald flag a real client testimonial (from
-- the existing per-client testimonials feature) as a homepage credibility
-- example. No admin UI for this per the spec's own wording ("a simple
-- admin toggle or direct database update") - flipped by hand as real
-- testimonials come in worth featuring.
alter table public.testimonials add column featured_on_homepage boolean not null default false;
