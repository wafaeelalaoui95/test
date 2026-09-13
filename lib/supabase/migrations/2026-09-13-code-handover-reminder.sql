-- Remember that we already reminded a sender to pass the delivery code on.
--
-- The code reaches the sender once, at booking, in an email they read days
-- before the trip. If someone else collects the parcel at the other end, that
-- person needs the code and cannot obtain it themselves — and the failure only
-- surfaces with traveller and recipient standing together, unable to close the
-- delivery.
--
-- A nightly sweep re-sends it on the eve of departure. This column is what
-- stops it arriving again every night for a trip that keeps being postponed.

alter table public.booking_intents
  add column if not exists code_reminder_sent_at timestamptz;

-- Written by the cron with the service-role key. Client-writable, it would be
-- a way to suppress your own reminder — or to make someone else's fire again.
revoke update (code_reminder_sent_at) on public.booking_intents
  from authenticated, anon;

-- Partial index over exactly what the sweep looks for: confirmed, not yet
-- handed over, never reminded. Stays small however many bookings settle
-- behind it.
create index if not exists booking_intents_needs_code_reminder_idx
  on public.booking_intents (traveler_trip_id)
  where status = 'confirmed'
    and pickup_confirmed_at is null
    and code_reminder_sent_at is null;

-- Check: who the next run would email. Confirmed bookings on a trip leaving
-- tomorrow, parcel not yet handed over, never reminded.
select
  b.id,
  b.pickup_city || ' -> ' || b.destination_city as route,
  t.departure_date,
  b.delivery_code is not null as has_code
from public.booking_intents b
join public.traveler_trips t on t.id = b.traveler_trip_id
where b.status = 'confirmed'
  and b.pickup_confirmed_at is null
  and b.code_reminder_sent_at is null
  and t.departure_date = current_date + 1;
