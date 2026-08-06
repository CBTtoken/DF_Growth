-- The Board, structural moderation (handoff scripts/handoff-board-moderation.md).
--
-- Job 4: "auto-enforce anything countable, hold anything needing judgement...
-- every rule individually toggleable in admin, sensible defaults on."
--
-- A toggle and a label per rule, not a general feature-flag framework --
-- kept small on purpose. Two things the handoff also lists under job 4 are
-- deliberately NOT rows here: required fields (job 1) and posting a kind
-- you are not entitled to (job 2, "not negotiable"). Making either
-- switchable would let an admin accidentally turn off the two things this
-- whole handoff exists to build, so those stay permanently on and outside
-- this table.

create table public.board_moderation_rules (
  rule_key text primary key,
  category text not null check (category in ('auto', 'hold')),
  label text not null,
  description text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.board_moderation_rules enable row level security;
grant select, insert, update on public.board_moderation_rules to service_role;

insert into public.board_moderation_rules (rule_key, category, label, description) values
  ('post_frequency_cap', 'auto', 'Post frequency cap', 'Blocks a poster who exceeds the per-period post limit (5/24h, 20/30 days).'),
  ('duplicate_near_duplicate', 'auto', 'Duplicate posts', 'Blocks a post that closely repeats one the same poster already has live.'),
  ('post_link_reject', 'auto', 'Links in a new post', 'Blocks a post body containing a link not on the allowlist.'),
  ('comment_link_hold', 'auto', 'Links in a comment', 'Holds a comment containing a link not on the allowlist.'),
  ('banned_goods_keywords', 'auto', 'Banned goods and services', 'Blocks a post matching the banned list shown at the point of posting.'),
  ('report_auto_hold', 'auto', 'Report threshold', 'Holds a comment reported by its post''s own owner, or by two distinct people.'),
  ('payment_details_hold', 'hold', 'Payment details', 'Holds a post or comment containing banking details or a payment link, anywhere.'),
  ('suspected_scam_patterns', 'hold', 'Suspected scam wording', 'Holds content matching common scam phrasing, for a human to judge.'),
  ('health_medical_income_claims', 'hold', 'Health, medical or income claims', 'Holds content making a health, medical or income claim, for a human to judge.');
