-- Business profile fields captured during onboarding (mirrors what the
-- WhatsApp onboarding flow already collects). growth_clients holds the raw
-- facts a client tells us about their business (used for ad-campaign context
-- later, and as AI grounding for landing copy); landing_pages gets the
-- polished output an AI drafts and the client edits, sitting alongside the
-- existing headline/subheadline as the actual rendered page copy.
alter table public.growth_clients
  add column province text check (province in (
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  )),
  add column industry text,
  add column business_address text,
  add column business_description text,
  add column tagline text,
  add column products_services text,
  add column additional_notes text,
  -- Holds the AI-drafted {headline, subheadline, aboutText, servicesText}
  -- suggestion until the client reaches and confirms the Landing Copy step.
  -- Deliberately kept separate from `landing_pages` rather than upserting
  -- the draft directly there: a `landing_pages` row existing is the wizard's
  -- resume signal for "the client has confirmed their copy" (see
  -- src/app/onboard/page.tsx) — writing the unconfirmed draft into that same
  -- table would make an in-progress client (who's only finished the business
  -- profile step) look, on refresh, like they'd already finished the whole
  -- wizard.
  add column ai_landing_draft jsonb;

alter table public.landing_pages
  add column about_text text,
  add column services_text text;
