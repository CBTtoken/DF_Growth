-- The Moxie eMag builder.
--
-- Replaces "export to PDF, import into Adobe Express, repair the layout by
-- hand for five days". Everything an edition is made of lives here, and the
-- one thing this schema is designed around is that page numbers are derived
-- and never typed.
--
-- Built for one publication. Not multi-tenant, and deliberately not: there
-- is one row in emag_publications and everything hangs off it. What it does
-- avoid is making a second publication impossible later, which is why the
-- publication is a row rather than a constant.

-- ---------------------------------------------------------------------------
-- The publication
-- ---------------------------------------------------------------------------

-- Settings the publisher can change without a deploy. The defaults come from
-- the Editorial and Design Reference 2026 and are seeded at the bottom of
-- this file.
--
-- Pillars and sections are jsonb rather than tables because Dewald has said
-- the pillars are guidelines he expects to edit, and because they are read
-- as a whole list every single time and never joined against. A table would
-- buy referential integrity over a list that one person edits on one screen,
-- and cost a migration every time the shape changes.
create table public.emag_publications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  definition text,
  site text,
  contact text,
  footer_credit text,

  logo_path text,
  palette jsonb not null default '{}'::jsonb,
  pillars jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

-- Uses the existing Supabase auth. No new auth system, no self-signup:
-- accounts are created by the publisher, so a row here is the whole
-- permission model.
--
--   writer     creates and edits articles, submits for approval
--   publisher  everything, including the flatplan and publishing
create table public.emag_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  publication_id uuid not null references public.emag_publications (id) on delete cascade,
  role text not null check (role in ('writer', 'publisher')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (user_id, publication_id)
);

-- ---------------------------------------------------------------------------
-- Editions
-- ---------------------------------------------------------------------------

create table public.emag_editions (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.emag_publications (id) on delete cascade,

  -- "July 2026". What the reader sees.
  title text not null,
  -- 1, 2, 3. What the cover prints as "Edition 02".
  edition_no int,
  -- The first of the publication month, because Moxie publishes on the 1st.
  published_for date,
  -- The stable URL segment. Set once and then left alone: changing it breaks
  -- every link already sent to a reader.
  slug text not null,

  status text not null default 'draft'
    check (status in ('draft', 'ready', 'published')),

  -- The PDF export toggle. Off by default.
  --
  -- This is a convenience control and nothing more. Anything a browser can
  -- display can be captured, so it must never be described anywhere in the
  -- interface as preventing sharing, and there is no DRM here to back such a
  -- claim up.
  pdf_enabled boolean not null default false,

  -- The teaser printed at the base of the contents page.
  next_edition_title text,
  next_edition_note text,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (publication_id, slug)
);

create index emag_editions_publication_idx on public.emag_editions (publication_id, status);

-- ---------------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------------

create table public.emag_articles (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.emag_editions (id) on delete cascade,

  -- The section label bar. Pillar prints left in orange, section right in
  -- charcoal. Held as text rather than as a foreign key because the pillar
  -- list is editable configuration, and renaming a pillar must not orphan
  -- an article that has already been published.
  pillar text not null,
  section text not null,

  title text not null,
  writer text,
  layout text not null default 'hero-opener',

  -- The masthead: kicker, headline, the accent word, the standfirst, the
  -- hero settings. One object because it is written and read as one.
  opener jsonb not null default '{}'::jsonb,

  -- The authored body, as a list of blocks. Paragraph text inside these is
  -- stored exactly as pasted, with emphasis recorded as character offsets
  -- beside it rather than as markup, so what comes out is byte for byte
  -- what went in.
  blocks jsonb not null default '[]'::jsonb,

  -- The frozen result: the finished pages with their page breaks already
  -- decided. Written once, when the article is approved, and replayed by the
  -- renderer from then on.
  --
  -- This is the whole reason the same article renders identically every
  -- time. Nothing recomputes a page break at render time, so nothing can
  -- disagree with the contents page about how long an article is.
  pages jsonb,
  page_count int not null default 0,

  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved')),

  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index emag_articles_edition_idx on public.emag_articles (edition_id, status);

-- An approved article must carry its frozen pages, and a draft must not
-- claim a page count it has not earned. Enforced here rather than in the
-- application because the contents page trusts page_count absolutely: a
-- single article with a stale count silently renumbers everything after it.
alter table public.emag_articles add constraint emag_articles_approved_has_pages
  check (status <> 'approved' or (pages is not null and page_count > 0));

-- ---------------------------------------------------------------------------
-- Images
-- ---------------------------------------------------------------------------

-- Every field here is a control in the editor. None of it is inferred and no
-- model is asked where a picture should go.
create table public.emag_assets (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.emag_articles (id) on delete cascade,
  edition_id uuid references public.emag_editions (id) on delete cascade,

  storage_path text not null,
  alt text not null default '',
  caption text,

  slot text not null default 'inline' check (slot in ('banner', 'inline', 'cover', 'writer')),
  side text not null default 'full' check (side in ('left', 'right', 'full')),
  wrap boolean not null default false,
  width_pct numeric,
  height_mm numeric,

  -- Optional text set over the image, with its own colour.
  overlay jsonb,

  sort int not null default 0,
  created_at timestamptz not null default now(),

  -- An asset belongs to an article or to an edition, never to neither.
  -- A cover image has no article; an inline photograph has no business
  -- floating free of one.
  constraint emag_assets_has_owner check (article_id is not null or edition_id is not null)
);

create index emag_assets_article_idx on public.emag_assets (article_id, sort);

-- ---------------------------------------------------------------------------
-- Advertisements
-- ---------------------------------------------------------------------------

-- Advertisers supply finished artwork. The builder places it into a slot and
-- never designs anything inside it.
create table public.emag_ads (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.emag_editions (id) on delete cascade,

  advertiser text not null,
  format text not null check (format in ('full', 'half-h', 'half-v', 'quarter')),
  -- OBC, IFC, IBC, ROM. Advisory: where it actually lands is the flatplan's
  -- business, and the flatplan is the thing page numbers come from.
  position_code text check (position_code in ('OBC', 'IFC', 'IBC', 'ROM')),

  artwork_path text,
  link text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index emag_ads_edition_idx on public.emag_ads (edition_id);

-- ---------------------------------------------------------------------------
-- The flatplan
-- ---------------------------------------------------------------------------

-- The spine of an edition, and the only place running order is recorded.
--
-- One row per block in the edition, in order. Page numbers are produced by
-- walking this table and adding up page counts, which is what makes
-- reordering two blocks renumber everything correctly and rebuild the
-- contents page to match. Nothing anywhere stores a page number.
--
-- Articles and advertisements share this table rather than each carrying
-- their own position, because two independent orderings of the same
-- sequence disagree the first time something moves between them.
create table public.emag_flatplan (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.emag_editions (id) on delete cascade,

  -- Sparse on purpose. Inserting between two blocks is then an arithmetic
  -- problem rather than a rewrite of every row after the insertion point.
  position int not null,

  kind text not null check (kind in ('cover', 'contents', 'article', 'ad', 'back_cover')),
  article_id uuid references public.emag_articles (id) on delete cascade,
  ad_id uuid references public.emag_ads (id) on delete cascade,

  -- How many pages this block occupies. For an article this mirrors
  -- emag_articles.page_count and is refreshed on approval; for everything
  -- else it is the block's own fixed extent, which is why it lives here.
  pages int not null default 1,

  created_at timestamptz not null default now(),

  unique (edition_id, position),

  -- A block points at exactly the thing its kind says it does.
  constraint emag_flatplan_target check (
    (kind = 'article' and article_id is not null and ad_id is null)
    or (kind = 'ad' and ad_id is not null and article_id is null)
    or (kind in ('cover', 'contents', 'back_cover') and article_id is null and ad_id is null)
  )
);

create index emag_flatplan_edition_idx on public.emag_flatplan (edition_id, position);

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

alter table public.emag_publications enable row level security;
alter table public.emag_members enable row level security;
alter table public.emag_editions enable row level security;
alter table public.emag_articles enable row level security;
alter table public.emag_assets enable row level security;
alter table public.emag_ads enable row level security;
alter table public.emag_flatplan enable row level security;

-- Read and written through the admin client, which checks emag_members on
-- every request. The grant is not optional and not implied: a new table gets
-- service_role nothing by default on this project, and the failure mode is a
-- silently empty screen rather than an error.
grant select, insert, update, delete on public.emag_publications to service_role;
grant select, insert, update, delete on public.emag_members to service_role;
grant select, insert, update, delete on public.emag_editions to service_role;
grant select, insert, update, delete on public.emag_articles to service_role;
grant select, insert, update, delete on public.emag_assets to service_role;
grant select, insert, update, delete on public.emag_ads to service_role;
grant select, insert, update, delete on public.emag_flatplan to service_role;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

-- Moxie itself. Palette, pillars and sections come from the Editorial and
-- Design Reference 2026. Re-runnable: the publication is keyed on its slug
-- and an existing row is left alone, so applying this twice does not wipe
-- settings the publisher has since changed.
insert into public.emag_publications
  (slug, name, tagline, definition, site, contact, footer_credit, palette, pillars, sections)
values (
  'moxie',
  'Moxie Magazine',
  'Have the Moxie.',
  'South Africa''s family discovery magazine',
  'moxiemag.co.za',
  'editor@moxiemag.co.za',
  'A Smart Value Club Publication',
  '{
    "orange": "#c85a1e",
    "teal": "#0b6e6e",
    "charcoal": "#1e2020",
    "cream": "#f7f3ee",
    "border": "#e0d8d0",
    "mint": "#a8d0d0",
    "caption": "#888888"
  }'::jsonb,
  '[
    {"key":"discover","label":"Discover","territory":"Curiosity, science, the unexpected"},
    {"key":"explore","label":"Explore","territory":"Deep South African history with modern relevance"},
    {"key":"roam","label":"Roam","territory":"Parks, travel, place, events"},
    {"key":"gather","label":"Gather","territory":"Food, recipes, the table"},
    {"key":"thrive","label":"Thrive","territory":"People doing quiet, remarkable work"},
    {"key":"believe","label":"Believe","territory":"Faith, reflection, the Word of the Month","teal":true},
    {"key":"think","label":"Think","territory":"Science, tech, society, ideas"},
    {"key":"play","label":"Play","territory":"Family puzzles, quizzes, games"},
    {"key":"open","label":"Open","territory":"Editor''s Letter and reader submissions","structural":true},
    {"key":"personality","label":"Personality","territory":"The SA Personality feature","structural":true},
    {"key":"partner","label":"Partner","territory":"Advertorials, always clearly labelled","structural":true},
    {"key":"savings","label":"Savings","territory":"The Smart Value Club spread","structural":true},
    {"key":"cover","label":"Cover","territory":"Front and back covers","structural":true}
  ]'::jsonb,
  '[]'::jsonb
)
on conflict (slug) do nothing;
