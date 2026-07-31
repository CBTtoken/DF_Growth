-- Favourites on a conversation, and the last message on the row.
--
-- Dewald's ask: make the messenger behave like WhatsApp. Two things in that
-- are worth building and one is not. A conversation list showing who wrote
-- last and when, with a star for the ones you keep coming back to, is
-- worth it. Scraping a phone's contacts is not possible for a web app and
-- pretending otherwise would be a worse experience than not having it.
--
-- Starred from either side, because a business wants its regulars at the
-- top just as much as a customer wants their plumber there.
alter table public.board_threads
  add column if not exists favourite_member boolean not null default false,
  add column if not exists favourite_public boolean not null default false;

comment on column public.board_threads.favourite_member is
  'Starred by the business. Pins the conversation to the top of its own list only.';
comment on column public.board_threads.favourite_public is
  'Starred by the person. Pins the conversation to the top of their own list only.';

-- The preview line on a conversation row. Denormalised deliberately: the
-- list would otherwise need one query per conversation to find the last
-- message, which is the classic way a chat list gets slow the moment
-- somebody has twenty of them.
alter table public.board_threads
  add column if not exists last_message_preview text,
  add column if not exists last_message_sender text check (last_message_sender in ('public', 'member'));
