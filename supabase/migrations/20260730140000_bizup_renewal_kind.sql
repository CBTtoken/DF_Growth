-- Recording subscription renewals.
--
-- A real gap, and the same one already fixed on the Growth side on 17
-- July for annual clients. Paystack sends a monthly renewal as an ordinary
-- charge.success whose metadata is a bare 0, not the custom bag set at
-- checkout. The KatisoBiz branch of the webhook keys off
-- metadata.product = 'bizup', so every renewal fell straight past it and
-- was silently dropped.
--
-- Nothing broke for the member: their plan was already set and nothing
-- downgrades them. What was lost was the money. No billing event was
-- written, so revenue was understated and every paying member would have
-- looked like they churned after a single month.
--
-- 'renewal' is a distinct kind rather than reusing 'subscription' because
-- the admin metrics count distinct accounts with a 'subscription' event to
-- derive who is paying. Filing renewals under the same name would still
-- work for that count, but would make it impossible to tell a new sale
-- from a repeat one, which is the difference between growth and churn.

alter table public.bizup_billing_events
  drop constraint if exists bizup_billing_events_kind_check;

alter table public.bizup_billing_events
  add constraint bizup_billing_events_kind_check
  check (kind in ('subscription', 'topup', 'renewal'));

comment on column public.bizup_billing_events.kind is
  'subscription: a member started or upgraded a paid plan. renewal: Paystack charged an existing subscription again, resolved by plan code because a renewal carries no metadata. topup: 75 extra documents.';
