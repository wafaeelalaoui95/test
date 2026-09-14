-- Remember that we already reminded a traveller what they are carrying.
--
-- The sender gets a reminder on the eve of departure (code_reminder_sent_at).
-- The traveller got nothing. They agreed to carry a parcel days or weeks ago,
-- in an email read once, and the next thing that happens is somebody expecting
-- them at an airport — for a handover the traveller may not have planned their
-- morning around.
--
-- A parcel forgotten is not a small failure: the sender's money is already
-- captured, the trip goes ahead without the parcel, and the first person to
-- find out is the recipient who is not handed anything.
--
-- This column is what stops the reminder arriving again every night for a trip
-- whose date keeps moving.

alter table public.traveler_trips
  add column if not exists departure_reminder_sent_at timestamptz;

-- Written by the cron with the service-role key. Client-writable, it would be
-- a way to silence your own reminder — or to make someone else's fire again.
revoke update (departure_reminder_sent_at) on public.traveler_trips
  from authenticated, anon;

-- Partial index over exactly what the sweep looks for: a live trip that has
-- never been reminded. Stays small however many trips are flown behind it.
create index if not exists traveler_trips_needs_departure_reminder_idx
  on public.traveler_trips (departure_date)
  where status <> 'cancelled'
    and departure_reminder_sent_at is null;

-- ---------------------------------------------------------------------------
-- Check: who the next run would email, and what it would list.
--
-- A trip leaving tomorrow, not cancelled, never reminded, that is actually
-- carrying something not yet collected. Trips with nothing to carry are
-- skipped — a reminder about no parcels is just noise.
-- ---------------------------------------------------------------------------
select
  t.id                                            as trip,
  p.full_name                                     as traveler,
  t.departure_city || ' -> ' || t.arrival_city    as route,
  t.departure_date,
  count(b.id)                                     as parcels
from public.traveler_trips t
left join public.profiles p on p.id = t.user_id
join public.booking_intents b
  on b.traveler_trip_id = t.id
 and b.status = 'confirmed'
 and b.pickup_confirmed_at is null
where t.status <> 'cancelled'
  and t.departure_reminder_sent_at is null
  and t.departure_date = current_date + 1
group by t.id, p.full_name, t.departure_city, t.arrival_city, t.departure_date
order by t.departure_date;
