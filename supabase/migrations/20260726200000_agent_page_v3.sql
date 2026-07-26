-- Agent page v3 (docs/agent-page-v3-final.md).
--
-- The page becomes five sections of mostly standard copy written in the
-- agent's voice, so the three free-text fields v1 asked every agent to fill
-- in are replaced by one optional bio. The old columns are kept rather than
-- dropped: Losaan actually wrote hers, it is the strongest copy either
-- agent has produced, and the v3 document itself wants her second paragraph
-- reused as her bio. Deleting the source of that to tidy up a schema would
-- be the wrong trade.
alter table public.agents
  -- v3: "Four curated themes, no free colour picker. The agent picks a
  -- theme, not a colour." accent_color stays for now so nothing breaks
  -- mid-deploy, but nothing reads it after this.
  add column page_theme text not null default 'slate'
    check (page_theme in ('slate', 'forest', 'clay', 'plum')),
  -- Section 5. Optional, 400 character cap enforced in the form. Null
  -- means the designed standard fallback renders instead, which is the
  -- whole point: an agent who uploads nothing still gets a complete page.
  add column bio text,
  -- v3 slug rules: "A live slug never changes without a permanent
  -- redirect. These links live in WhatsApp threads forever." Business
  -- pages already have exactly this (growth_clients.previous_slugs); agent
  -- pages had nothing, so a rename would have silently broken every link
  -- an agent had ever shared.
  add column previous_page_slugs text[] not null default '{}';

create index agents_previous_page_slugs_idx on public.agents using gin (previous_page_slugs);
