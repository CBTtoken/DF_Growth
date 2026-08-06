-- Codebase health audit, 6 August 2026: missing indexes on foreign key
-- columns, found by comparing pg_constraint against pg_index (every FK
-- column with no leading index of its own). Add-only, no behaviour change.
--
-- Deliberately excludes tables belonging to modules this sprint left out of
-- scope: The Board (board_*), the WhatsApp inbox (whatsapp_conversations),
-- and jobs (jobs_candidates). Those are listed in the report instead.

create index if not exists idx_agents_comped_client_id on public.agents (comped_client_id);
create index if not exists idx_bizup_audit_log_actor_user_id on public.bizup_audit_log (actor_user_id);
create index if not exists idx_bizup_document_lines_catalogue_item_id on public.bizup_document_lines (catalogue_item_id);
create index if not exists idx_bizup_documents_customer_id on public.bizup_documents (customer_id);
create index if not exists idx_bizup_documents_superseded_by_id on public.bizup_documents (superseded_by_id);
create index if not exists idx_bizup_documents_parent_document_id on public.bizup_documents (parent_document_id);
create index if not exists idx_book_orders_growth_client_id on public.book_orders (growth_client_id);
create index if not exists idx_bookable_units_growth_client_id on public.bookable_units (growth_client_id);
create index if not exists idx_capi_events_growth_client_id on public.capi_events (growth_client_id);
create index if not exists idx_commission_ledger_agent_id on public.commission_ledger (agent_id);
create index if not exists idx_commission_ledger_referred_client_id on public.commission_ledger (referred_client_id);
create index if not exists idx_desk_ideas_became_item_id on public.desk_ideas (became_item_id);
create index if not exists idx_emag_articles_created_by on public.emag_articles (created_by);
create index if not exists idx_emag_articles_approved_by on public.emag_articles (approved_by);
create index if not exists idx_emag_assets_edition_id on public.emag_assets (edition_id);
create index if not exists idx_emag_flatplan_ad_id on public.emag_flatplan (ad_id);
create index if not exists idx_emag_flatplan_article_id on public.emag_flatplan (article_id);
create index if not exists idx_emag_members_publication_id on public.emag_members (publication_id);
create index if not exists idx_events_organizer_account_id on public.events (organizer_account_id);
create index if not exists idx_generated_assets_testimonial_id on public.generated_assets (testimonial_id);
create index if not exists idx_generated_assets_growth_client_id on public.generated_assets (growth_client_id);
create index if not exists idx_growth_clients_hero_photo_id on public.growth_clients (hero_photo_id);
create index if not exists idx_growth_clients_referred_by_agent_id on public.growth_clients (referred_by_agent_id);
create index if not exists idx_growth_members_growth_client_id on public.growth_members (growth_client_id);
create index if not exists idx_leads_growth_client_id on public.leads (growth_client_id);
create index if not exists idx_leads_landing_page_id on public.leads (landing_page_id);
create index if not exists idx_moxie_access_codes_redeemed_by on public.moxie_access_codes (redeemed_by);
create index if not exists idx_moxie_billing_events_subscription_id on public.moxie_billing_events (subscription_id);
create index if not exists idx_moxie_editions_emag_edition_id on public.moxie_editions (emag_edition_id);
create index if not exists idx_moxie_purchases_edition_id on public.moxie_purchases (edition_id);
create index if not exists idx_page_poster_queue_evergreen_id on public.page_poster_queue (evergreen_id);
create index if not exists idx_reservations_growth_client_id on public.reservations (growth_client_id);
create index if not exists idx_reviews_reviewer_account_id on public.reviews (reviewer_account_id);
create index if not exists idx_shop_product_variants_growth_client_id on public.shop_product_variants (growth_client_id);
create index if not exists idx_testimonials_growth_client_id on public.testimonials (growth_client_id);
