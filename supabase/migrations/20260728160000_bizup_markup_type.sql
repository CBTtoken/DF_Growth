-- Markup as a flat rand amount, not only a percentage.
--
-- Dewald: "the markup on the price list, should be a % or flat figure?"
-- Both. A plumber buying a geyser at cost marks it up by a percentage; one
-- who adds a fixed handling fee per part wants rands. Forcing the second
-- case through a percentage means doing arithmetic on a phone, which is
-- exactly where wrong prices come from.
--
-- The existing default_markup_pct column is left alone and keeps its
-- meaning. Every row already in the table is a percentage markup, so the
-- new type column defaults to 'percent' and nothing needs backfilling or
-- reinterpreting.

alter table public.bizup_catalogue_items
  add column if not exists markup_type text not null default 'percent'
    check (markup_type in ('percent', 'amount'));

-- Integer cents, same as every other money column in this schema. Nullable
-- and null-means-none, matching how default_markup_pct already behaves, so
-- "no markup" is one concept with one representation rather than a zero
-- that has to be told apart from an unset value.
alter table public.bizup_catalogue_items
  add column if not exists default_markup_amount_cents integer
    check (default_markup_amount_cents is null or default_markup_amount_cents >= 0);

comment on column public.bizup_catalogue_items.markup_type is
  'Which of the two markup columns applies: percent reads default_markup_pct, amount reads default_markup_amount_cents. Only one is ever in force.';
