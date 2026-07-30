-- A promised commission rate that the standard ladder would not give.
--
-- Dewald agreed to honour Natasha's first referral (Buffelskop) at 40%
-- rather than the standard first-referral 25%. Until now the only plan for
-- that was a note in a provisioning script telling whoever read it to
-- correct the ledger row by hand, at some unknown future moment when
-- Buffelskop's payment happens to clear.
--
-- That is not a plan, it is a reminder with no owner. The payment fires a
-- webhook, the webhook writes 25%, and nobody is watching at that moment.
-- By the time anyone looks, the agent has already been emailed "your
-- referral converted at 25%".
--
-- So the promise lives on the row it applies to, and the code that
-- calculates commission reads it. Per client rather than per agent,
-- because what was promised was about this referral, not about Natasha
-- forever.
alter table public.growth_clients
  add column if not exists commission_rate_override smallint;

alter table public.growth_clients
  drop constraint if exists growth_clients_commission_rate_override_check;

-- A rate outside this range is a typo, and a typo here pays a real person
-- the wrong amount of real money.
alter table public.growth_clients
  add constraint growth_clients_commission_rate_override_check
  check (commission_rate_override is null or (commission_rate_override between 1 and 100));

comment on column public.growth_clients.commission_rate_override is
  'Percentage commission promised for this specific referral, overriding the standard ladder in lib/agents/commission.ts. Null means the normal rules apply, which is the case for almost everybody. Set only where a rate was agreed by hand.';
