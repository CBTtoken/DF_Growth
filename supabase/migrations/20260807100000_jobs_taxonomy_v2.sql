-- KatisoBiz Jobs, Sprint 1 polish pass (Dewald's walkthrough, 7 August
-- 2026): the role question becomes two-step (field first, then position),
-- candidates can pick up to three positions, "Other" lets them type,
-- availability gains the very-common one-month-notice case, the CV gets a
-- choice of PDF templates, and an AI wording pass gets capped columns.

-- ============================================================
-- Taxonomy: category becomes free text
-- ============================================================

-- The check constraint forced a migration for every new category, which is
-- exactly how a curated list stops growing (same reasoning as
-- board_moderation_log's free-text action/rule columns). Categories are
-- only ever written by us in the SQL editor, so the constraint was
-- protecting against nobody.
alter table public.jobs_taxonomy drop constraint if exists jobs_taxonomy_category_check;

-- ============================================================
-- Candidates: up to three positions, other-text, notice period,
-- template choice, AI polish cap
-- ============================================================

-- primary_role_id stays the headline and the browse index driver; the
-- second and third choices ride here. jsonb array of jobs_taxonomy ids,
-- capped at 2 in application code (first choice + two more = three).
alter table public.jobs_candidates
  add column if not exists secondary_role_ids jsonb not null default '[]'::jsonb;

-- What they typed when their kind of work was not on the list. Sanitised
-- application-side like every other free-text field, and reviewed by us to
-- grow the taxonomy -- Dewald: "we will have to build up one".
alter table public.jobs_candidates
  add column if not exists other_role_text text;

-- One month's notice, extremely common for anyone currently employed.
alter table public.jobs_candidates drop constraint if exists jobs_candidates_availability_check;
alter table public.jobs_candidates
  add constraint jobs_candidates_availability_check
  check (availability is null or availability in ('immediately', 'within_2_weeks', 'one_month_notice', 'flexible'));

-- Which PDF skin renders their CV. Same shape as bizup_accounts.template_id.
alter table public.jobs_candidates
  add column if not exists cv_template text not null default 'clean'
  check (cv_template in ('clean', 'bold', 'compact'));

-- The AI wording pass: capped per CV (spec: "AI cost in the CV builder
-- scales with unemployment, not with revenue. Cap regenerations per CV."),
-- and its recommendations stored so displaying them never re-runs a model.
alter table public.jobs_candidates
  add column if not exists ai_polish_count integer not null default 0,
  add column if not exists ai_recommendations jsonb;

-- ============================================================
-- Taxonomy seed v2: the fields Dewald named as missing (Marketing, Sales,
-- IT and friends) plus a much fuller position list per field. Idempotent
-- on slug so re-running never duplicates.
-- ============================================================

insert into public.jobs_taxonomy (slug, label, category, sort_order) values
  -- Trades, additions
  ('aircon_refrigeration', 'Aircon and refrigeration', 'trade', 92),
  ('solar_installer', 'Solar installer', 'trade', 93),
  ('boilermaker', 'Boilermaker', 'trade', 94),
  ('fitter_turner', 'Fitter and turner', 'trade', 95),
  ('diesel_mechanic', 'Diesel mechanic', 'trade', 96),
  ('panel_beater', 'Panel beater', 'trade', 97),
  -- Construction, new field
  ('tiler', 'Tiler', 'construction', 330),
  ('roofer', 'Roofer', 'construction', 331),
  ('plasterer', 'Plasterer', 'construction', 332),
  ('paver', 'Paver', 'construction', 333),
  ('scaffolder', 'Scaffolder', 'construction', 334),
  ('site_foreman', 'Site foreman', 'construction', 335),
  -- Domestic and care, additions
  ('au_pair', 'Au pair', 'domestic', 125),
  ('nurse', 'Nurse', 'care', 135),
  ('nursing_assistant', 'Nursing assistant', 'care', 136),
  -- Driving and logistics, additions
  ('forklift_driver', 'Forklift driver', 'driving_logistics', 171),
  ('taxi_driver', 'Taxi driver', 'driving_logistics', 172),
  ('courier_driver', 'Courier driver', 'driving_logistics', 173),
  ('picker_packer', 'Picker and packer', 'driving_logistics', 174),
  ('stock_controller', 'Stock controller', 'driving_logistics', 175),
  -- Security, additions
  ('armed_response_officer', 'Armed response officer', 'security', 181),
  ('control_room_operator', 'Control room operator', 'security', 182),
  -- Hospitality, additions
  ('barista', 'Barista', 'hospitality', 221),
  ('kitchen_assistant', 'Kitchen assistant', 'hospitality', 222),
  ('events_staff', 'Events staff', 'hospitality', 223),
  ('lodge_staff', 'Game lodge staff', 'hospitality', 224),
  -- Retail, additions
  ('butchery_assistant', 'Butchery assistant', 'retail', 251),
  ('baker', 'Baker', 'retail', 252),
  ('shelf_packer', 'Shelf packer', 'retail', 253),
  ('store_manager', 'Store manager', 'retail', 254),
  -- Admin and office, additions
  ('personal_assistant', 'Personal assistant', 'admin_office', 291),
  ('data_capturer', 'Data capturer', 'admin_office', 292),
  ('hr_administrator', 'HR administrator', 'admin_office', 293),
  ('office_manager', 'Office manager', 'admin_office', 294),
  -- Sales and marketing, new field
  ('sales_rep', 'Sales representative', 'sales_marketing', 340),
  ('promoter', 'Promoter', 'sales_marketing', 341),
  ('telesales_agent', 'Telesales agent', 'sales_marketing', 342),
  ('marketing_assistant', 'Marketing assistant', 'sales_marketing', 343),
  ('social_media_manager', 'Social media manager', 'sales_marketing', 344),
  ('real_estate_agent', 'Real estate agent', 'sales_marketing', 345),
  ('insurance_sales', 'Insurance sales', 'sales_marketing', 346),
  -- IT and technology, new field
  ('it_support_technician', 'IT support technician', 'it_tech', 350),
  ('computer_technician', 'Computer technician', 'it_tech', 351),
  ('web_developer', 'Web developer', 'it_tech', 352),
  ('software_developer', 'Software developer', 'it_tech', 353),
  ('network_technician', 'Network technician', 'it_tech', 354),
  ('cctv_installer', 'CCTV installer', 'it_tech', 355),
  ('graphic_designer', 'Graphic designer', 'it_tech', 356),
  -- Finance and accounting, new field (bookkeeper stays under admin_office
  -- where it already lives; moving it would orphan existing CVs' choices)
  ('accountant', 'Accountant', 'finance_accounting', 360),
  ('payroll_administrator', 'Payroll administrator', 'finance_accounting', 361),
  ('credit_controller', 'Credit controller', 'finance_accounting', 362),
  -- Education and training, new field
  ('teacher', 'Teacher', 'education_training', 370),
  ('teaching_assistant', 'Teaching assistant', 'education_training', 371),
  ('tutor', 'Tutor', 'education_training', 372),
  ('ecd_practitioner', 'ECD practitioner', 'education_training', 373),
  ('sports_coach', 'Sports coach', 'education_training', 374),
  -- Beauty and wellness, new field
  ('hairdresser', 'Hairdresser', 'beauty_wellness', 380),
  ('barber', 'Barber', 'beauty_wellness', 381),
  ('nail_technician', 'Nail technician', 'beauty_wellness', 382),
  ('beauty_therapist', 'Beauty therapist', 'beauty_wellness', 383),
  ('massage_therapist', 'Massage therapist', 'beauty_wellness', 384),
  ('personal_trainer', 'Personal trainer', 'beauty_wellness', 385),
  -- Farming, new field
  ('farm_worker', 'Farm worker', 'agriculture', 390),
  ('farm_manager', 'Farm manager', 'agriculture', 391),
  -- Factory and manufacturing, new field
  ('machine_operator', 'Machine operator', 'manufacturing', 395),
  ('factory_worker', 'Factory worker', 'manufacturing', 396),
  ('quality_controller', 'Quality controller', 'manufacturing', 397),
  ('seamstress_tailor', 'Seamstress or tailor', 'manufacturing', 398)
on conflict (slug) do nothing;
