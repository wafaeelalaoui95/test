-- Migration: a trip with a delivered parcel leaves the search results
-- Date: 2026-11-24
--
-- Run in the Supabase SQL editor. Idempotent: safe to re-run.
--
-- From now on the app marks a trip 'completed' as soon as its traveller
-- uploads a delivery proof (or confirms a delivery with the recipient's code).
-- This backfills the trips delivered before that change, which are still
-- 'open' and so still show up in searches.

update public.traveler_trips t
set status = 'completed'
where t.status in ('open', 'matched', 'in_transit')
  and exists (
    select 1 from public.booking_intents b
    where b.traveler_trip_id = t.id
      and (b.delivery_proof_url is not null or b.received_confirmed_at is not null)
  );
