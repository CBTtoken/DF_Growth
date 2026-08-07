-- Write with AI (pre-launch handoff Job 3): the model DRAFTS the CV's
-- prose from the person's structured facts, distinct from the existing
-- polish pass which only tidies text they already wrote. Its own counter
-- (both features are capped separately), and the generated draft is
-- stored so redisplay never re-runs the model. The draft column is
-- cleared when the person accepts or discards it.

alter table jobs_candidates
  add column ai_write_count int not null default 0,
  add column ai_written_draft jsonb;
