-- Three things the Marketplace Terms and the Cancellation Policy assume exist.
--
-- 1. A declared item value, with a maximum. §9.iv lets Jibly require one and
--    impose a cap; §12.viii and §19.v then use it in dispute handling. Nothing
--    recorded a value, so the existing rule banning luxury goods "above €500"
--    had no number to measure against.
-- 2. A parcel size the sender actually states. The traveller picks a capacity
--    (envelope 200g / pouch 500g / small bag 1.5kg); the sender stated nothing
--    at all, so the two sides of the same marketplace were never comparable.
--    §4.ii and §7.i require the sender to provide it.
-- 3. The sender's express request for immediate performance (Cancellation §14).
--    That clause is what lets Jibly retain a proportionate fee inside the
--    statutory withdrawal period, and it only holds if the request was actually
--    made — so it is recorded the way the other declarations are.

-- ---------------------------------------------------------------------------
-- 1. Declared value, capped at €500
-- ---------------------------------------------------------------------------
-- Stored in whole euros: a replacement-value estimate is not a price, and
-- inviting cents invites false precision about a guess.
--
-- €500 is not an arbitrary number — it is the threshold already used by the
-- prohibited-items rules, which exclude jewellery and luxury goods above it.
-- One limit, so the two cannot contradict each other later.

alter table public.shipping_requests
  add column if not exists declared_value_eur integer;

alter table public.booking_intents
  add column if not exists declared_value_eur integer;

alter table public.shipping_requests
  drop constraint if exists shipping_requests_declared_value_check;
alter table public.shipping_requests
  add constraint shipping_requests_declared_value_check
  check (declared_value_eur is null or (declared_value_eur > 0 and declared_value_eur <= 500));

alter table public.booking_intents
  drop constraint if exists booking_intents_declared_value_check;
alter table public.booking_intents
  add constraint booking_intents_declared_value_check
  check (declared_value_eur is null or (declared_value_eur > 0 and declared_value_eur <= 500));

-- ---------------------------------------------------------------------------
-- 2. Parcel weight, capped at the largest traveller capacity
-- ---------------------------------------------------------------------------
-- booking_intents never had the column at all: a parcel booked straight onto a
-- trip carried no weight anywhere.

alter table public.booking_intents
  add column if not exists weight_kg numeric;

alter table public.booking_intents
  drop constraint if exists booking_intents_weight_check;
alter table public.booking_intents
  add constraint booking_intents_weight_check
  check (weight_kg is null or (weight_kg > 0 and weight_kg <= 1.5));

-- NOT VALID on this one, deliberately. shipping_requests.weight_kg has existed
-- as a free optional number since the beginning, so there may be rows above
-- 1.5 that were perfectly legitimate when they were written. Constraining new
-- writes is the point; retroactively invalidating somebody's old parcel is not,
-- and a migration that fails halfway through is worse than either.
alter table public.shipping_requests
  drop constraint if exists shipping_requests_weight_check;
alter table public.shipping_requests
  add constraint shipping_requests_weight_check
  check (weight_kg is null or (weight_kg > 0 and weight_kg <= 1.5)) not valid;

-- ---------------------------------------------------------------------------
-- 3. A third kind of declaration
-- ---------------------------------------------------------------------------
-- Reusing booking_attestations rather than adding a timestamp column, because
-- this one has to answer the same question the other two do: not "did they
-- tick a box" but "what did the box say, in which language, on what day".
-- A bare immediate_performance_ack_at would prove only that something was
-- clicked, which is the weaker half of what Cancellation §14 relies on.

alter table public.booking_attestations
  drop constraint if exists booking_attestations_kind_check;

alter table public.booking_attestations
  add constraint booking_attestations_kind_check
  check (kind in (
    'sender_certification',
    'traveler_inspection',
    'sender_immediate_performance'
  ));

-- ---------------------------------------------------------------------------
-- Checks
-- ---------------------------------------------------------------------------
-- Anything already over the new parcel limit, which the NOT VALID constraint
-- leaves alone. Expect none, or a handful of early test rows.
select id, weight_kg, created_at
from public.shipping_requests
where weight_kg > 1.5
order by created_at desc;

-- What the attestation table will now accept.
select pg_get_constraintdef(oid) as attestation_kinds
from pg_constraint
where conname = 'booking_attestations_kind_check';
