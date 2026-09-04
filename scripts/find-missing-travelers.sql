-- Who was the traveler on a booking whose traveler_user_id went null?
--
-- booking_intents.traveler_user_id is `on delete set null`, so deleting a
-- profile silently detaches them from every booking they carried — including
-- ones still holding their money. This walks the paths that may still know.

-- 1. Does the trip still exist? (traveler_trips.user_id is `on delete cascade`,
--    so a surviving trip means the profile was NOT deleted and the booking
--    simply never recorded the traveler.)
select
  b.id                 as booking,
  b.traveler_trip_id,
  t.id is not null     as trip_still_exists,
  t.user_id            as traveler_from_trip,
  p.full_name          as traveler_name,
  b.payment_status,
  b.transfer_id
from public.booking_intents b
left join public.traveler_trips t on t.id = b.traveler_trip_id
left join public.profiles p       on p.id = t.user_id
where b.traveler_user_id is null
  and b.payment_status <> 'unpaid'
order by b.created_at desc;

-- 2. Was a profile deleted around then? The retention table survives deletion
--    on purpose, so if the traveler was removed they are still named here.
select user_id, full_name, email, deleted_at, purge_after::date
from public.deleted_account_records
order by deleted_at desc;

-- 3. The conversation for each booking still names both parties, and is not
--    subject to the same `set null`. Run separately — this table isn't in the
--    repo's schema, so adjust the column names if Supabase disagrees.
-- select c.booking_intent_id, c.sender_id, c.traveler_id
-- from public.conversations c
-- where c.booking_intent_id in (
--   select id from public.booking_intents
--   where traveler_user_id is null and payment_status <> 'unpaid'
-- );
