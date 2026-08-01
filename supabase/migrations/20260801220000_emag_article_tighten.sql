-- Copyfitting, held on the article.
--
-- Dewald, 1 August 2026: "what can we do when there is literally only three
-- lines pushed onto a new page?" This is the answer a designer would reach
-- for: squeeze the line spacing of the whole article by a fraction nobody
-- can see until the stranded lines come back.
--
-- On the article rather than the page, because a page set fractionally
-- tighter than the page facing it is visible even when neither is visible
-- on its own.
alter table public.emag_articles
  add column if not exists tighten numeric not null default 0
  check (tighten >= 0 and tighten <= 0.06);
