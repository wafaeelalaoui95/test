-- URGENT. booking_intents.proposed_price is what the SENDER pays, and it is
-- not a whole number of euros.
--
-- It is priceBreakdown().total — the traveller's price plus 15% plus a 0.50 €
-- flat fee. A 20 € parcel comes to 23.50. The column is `integer`, so Postgres
-- refused the insert with "invalid input syntax for type integer" and the
-- sender could not pay at all.
--
-- Eleven of the fifteen prices the slider can produce between 10 and 80 € are
-- fractional: 15, 20, 25, 35, 40, 45, 55, 60, 65, 75, 80. Only 10, 30, 50 and
-- 70 ever worked. It went unnoticed because the old default was 30 and the old
-- guidance said "around 50" — both of which land clean.
--
-- Rounding was the wrong fix and was not taken. The traveller must receive
-- exactly the price on their listing, and splitAmount() recovers that by
-- inverting the same formula; round the total and the inverse stops landing on
-- their number. So the column holds the real figure instead.
--
-- No money is affected by this either way: Stripe is charged in cents from
-- payment_amount, and transferToTraveler pays out from that same value. This
-- column is the record, and the record was the thing that could not be written.

alter table public.booking_intents
  alter column proposed_price type numeric(10,2);

-- The check travelled with the column; restate it against the new type.
alter table public.booking_intents
  drop constraint if exists booking_intents_proposed_price_check;

alter table public.booking_intents
  add constraint booking_intents_proposed_price_check
  check (proposed_price >= 0);

-- Same shape, same reason: it holds an agreed total, not a typed-in amount.
alter table public.matches
  alter column agreed_compensation type numeric(10,2);

-- Check: existing rows are untouched by the widening, and fractional totals
-- can now be stored. Nothing here writes.
select
  count(*) as bookings,
  count(*) filter (where proposed_price <> round(proposed_price)) as with_cents
from public.booking_intents;
