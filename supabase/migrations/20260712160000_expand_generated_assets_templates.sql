-- Combined spec Sec 25: expands the testimonial-only social graphic
-- generator into a broader one — special offers, announcements,
-- before/after, new-arrival spotlights, alongside the existing testimonial
-- card. generated_assets.template had a check constraint allowing only
-- ('testimonial-square', 'quote-story', 'promo-banner') — 'testimonial-
-- square' is the only one ever actually used; the other two look like
-- placeholders from an earlier plan that was never built out. Replacing
-- the constraint with the real set this feature needs, keeping the
-- existing value so no historical row is invalidated.
alter table public.generated_assets drop constraint generated_assets_template_check;
alter table public.generated_assets add constraint generated_assets_template_check
  check (template in ('testimonial-square', 'special-offer-square', 'announcement-square', 'before-after-square', 'new-arrival-square'));
