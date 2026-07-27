-- BizUp Sec 10, the "Trade" template: "space for a job reference, site
-- address, and technician name".
--
-- Those are three real facts about a job, not styling, so they need
-- somewhere to live. Putting them in the existing notes field would mean
-- the Trade template parsing free text, which breaks the moment a member
-- types something unexpected.
--
-- Nullable and optional on every template. Sec 10 is explicit that all
-- five skins render one data structure, so these are simply blank on the
-- four skins that do not show them, and a member who switches templates
-- never loses what they typed.

alter table public.bizup_documents
  -- The member's own reference for the job, whatever they already use:
  -- a work order number, a claim number, a job card.
  add column job_reference text,
  -- Where the work happened, which is often not the billing address. A
  -- landlord is invoiced at home for work done at a rental property, and
  -- getting those two confused is a real cause of disputed invoices.
  add column site_address text,
  -- Who actually did the work. Matters as soon as a member has one other
  -- person on the road, and it is the field a body corporate or insurer
  -- most often asks for.
  add column technician_name text;
