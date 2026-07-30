-- The printer says the run is ready. That is the moment a date becomes real.
--
-- Dewald, 2026-07-30, describing how Standing 365 actually ships: "our
-- orders will always be shipped by our printer and will as such use their
-- collections address, the printer will provide the packaged individual
-- books with the buyers delivery address, Bob Go will pick it up there,
-- always... we won't deliver ourselves or know the exact delivery schedule
-- until the printer has actioned that they ready for collection."
--
-- The batch flow had one step, "sent to the printer", and asked for an
-- expected delivery date at that moment. By his description that date
-- cannot be known yet: the run has only just left, and how long it takes is
-- the printer's business. Asking for it there invited a guess, and a guess
-- typed into that box was emailed to every buyer in the run as a promise.
--
-- So the milestone the seller actually learns about gets its own step. Two
-- events, two emails, and the only one that carries a date is the one where
-- a date exists.
alter table public.order_batches
  add column if not exists ready_for_collection_at timestamptz;

comment on column public.order_batches.ready_for_collection_at is
  'When the printer or supplier confirmed the run is packed and waiting for courier collection. The first point at which a delivery date can honestly be given to a buyer, so expected_delivery_date is only set alongside this.';

comment on column public.order_batches.sent_to_printer_at is
  'When the seller sent the run off to be produced. Carries no delivery date on purpose: nothing is known about timing yet at this point.';
