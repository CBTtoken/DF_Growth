-- Take the password out of leaving a review.
--
-- The review system has been live since mid July and has zero reviews. Not
-- few, zero. It asks a customer to create an account with a password before
-- they may say a plumber did a good job, then emails them a code to confirm
-- it. That is three steps and two screens to pay somebody a compliment.
--
-- The board hit the same wall last night and the fix worked: a name, an
-- invisible bot check, and an optional email. Reviews now use the same
-- identity, which also means one person is one person across a comment, a
-- message and a review rather than three unrelated records.
--
-- Nothing existing breaks. reviewer_accounts stays, the column that points
-- at it stays, and the handful of reviews that ever used it would still
-- resolve. It simply stops being the only way in.

alter table public.reviews
  alter column reviewer_account_id drop not null;

alter table public.reviews
  add column if not exists identity_id uuid references public.board_identities(id) on delete cascade;

-- Exactly one author, the same rule the board posts and comments follow.
alter table public.reviews
  add constraint reviews_one_author check (
    (reviewer_account_id is not null and identity_id is null)
    or (identity_id is not null and reviewer_account_id is null)
  );

-- One review per person per business, which the old unique constraint
-- enforced on the account column and could not see the new one.
create unique index if not exists reviews_one_per_identity_idx
  on public.reviews (business_id, identity_id)
  where identity_id is not null;

create index if not exists reviews_identity_idx on public.reviews (identity_id);
