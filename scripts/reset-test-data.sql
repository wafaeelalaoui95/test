-- Clear the demo and test trips, parcels and bookings, keeping ONE booking.
--
-- Run this in the Supabase SQL editor, section by section, reading each result
-- before moving on. It is deliberately not a single paste-and-run script: it
-- deletes rows that record real card payments, and a mistake here is not
-- recoverable from the app.
--
-- WHAT IT DOES NOT TOUCH: profiles, and therefore identity verification,
-- Stripe account ids and payout setup. Only the marketplace content.

-- ---------------------------------------------------------------------------
-- 1. FIND THE BOOKING TO KEEP
-- ---------------------------------------------------------------------------
-- The live end-to-end test — the one with a real Stripe payment behind it.
-- Everything with a payment_intent_id represents money that actually moved, so
-- read this list carefully before deciding what is demo data and what isn't.

select id,
       created_at::date        as day,
       pickup_city || ' → ' || destination_city as route,
       payment_status,
       payment_amount / 100.0  as paid_eur,
       transfer_amount / 100.0 as sent_to_traveler_eur,
       payment_intent_id
from public.booking_intents
order by created_at desc;

-- Copy the id of the row you are keeping. It goes in EVERY query below,
-- in place of PASTE_ID_HERE. Do not skip one — an id left as the placeholder
-- makes that statement delete everything.

-- ---------------------------------------------------------------------------
-- 2. PREVIEW WHAT WOULD GO
-- ---------------------------------------------------------------------------
-- Run this before deleting anything. If a row you care about appears here,
-- stop.

select 'booking' as kind, count(*)
from public.booking_intents
where id <> 'PASTE_ID_HERE'
union all
select 'trip', count(*)
from public.traveler_trips
where id not in (
  select traveler_trip_id from public.booking_intents
  where id = 'PASTE_ID_HERE' and traveler_trip_id is not null
)
union all
select 'request', count(*)
from public.shipping_requests
where id not in (
  select shipping_request_id from public.booking_intents
  where id = 'PASTE_ID_HERE' and shipping_request_id is not null
);

-- ---------------------------------------------------------------------------
-- 3. DELETE, CHILDREN FIRST
-- ---------------------------------------------------------------------------
-- Order matters: a trip cannot go while a booking still points at it. Run
-- these one at a time, in this order.

begin;

-- Reviews hang off matches, so they go first.
delete from public.reviews;

-- Conversations and their messages: nothing here is worth keeping, and they
-- reference bookings.
delete from public.messages;
delete from public.conversations;

delete from public.notifications;
delete from public.disputes;
delete from public.reports;

-- The bookings themselves, except the one being kept.
delete from public.booking_intents
where id <> 'PASTE_ID_HERE';

-- Matches reference trips and requests; none belongs to the kept booking's
-- flow (that booking was made directly), so they can all go.
delete from public.matches;

-- Trips and parcels, except the two the kept booking points at.
delete from public.traveler_trips
where id not in (
  select traveler_trip_id from public.booking_intents
  where traveler_trip_id is not null
);

delete from public.shipping_requests
where id not in (
  select shipping_request_id from public.booking_intents
  where shipping_request_id is not null
);

-- Read the row counts above before committing. rollback; if anything looks
-- wrong — everything in this block undoes together.
commit;

-- ---------------------------------------------------------------------------
-- 4. CHECK
-- ---------------------------------------------------------------------------
select (select count(*) from public.booking_intents)  as bookings,
       (select count(*) from public.traveler_trips)   as trips,
       (select count(*) from public.shipping_requests) as requests;
-- Expect: 1 booking, and the trip and/or request it belongs to.
