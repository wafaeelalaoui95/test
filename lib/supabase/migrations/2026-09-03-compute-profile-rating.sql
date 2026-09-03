-- Compute profiles.rating and profiles.trips_completed from real data.
--
-- 2026-07-03-lock-profile-columns.sql revoked both from clients and noted they
-- should come "from reviews/bookings (triggers or service-role jobs)". The
-- trigger was never written, so every star on the site showed a number nobody
-- had earned — a seeded score on old rows and a flat 0.0 on real users, which
-- reads as a bad review rather than no review. The UI now hides ratings
-- entirely; this is what lets them come back.
--
-- A trigger rather than application code on purpose: reviews are inserted
-- straight from the client (RLS lets a participant review a delivered booking),
-- so there is no server route to hook. A trigger cannot be bypassed or
-- forgotten, and it stays correct if a review is ever edited or deleted.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- rating: the average of every review this person received
-- ---------------------------------------------------------------------------
create or replace function public.refresh_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  -- On delete the row is in OLD; on insert/update it is in NEW.
  target := coalesce(new.reviewed_user_id, old.reviewed_user_id);

  update public.profiles p
  set rating = coalesce(
    (select round(avg(r.rating)::numeric, 2)
     from public.reviews r
     where r.reviewed_user_id = target),
    0
  )
  where p.id = target;

  return null;
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
after insert or update or delete on public.reviews
for each row execute function public.refresh_profile_rating();

-- ---------------------------------------------------------------------------
-- trips_completed: deliveries this person carried to confirmation
-- ---------------------------------------------------------------------------
-- Counted on the TRAVELER side only, and only once the recipient confirmed —
-- an accepted parcel is not a completed trip, and the whole point of the
-- number is that it is hard to inflate.
create or replace function public.refresh_trips_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.traveler_user_id, old.traveler_user_id);
  if target is null then
    return null;
  end if;

  update public.profiles p
  set trips_completed = (
    select count(*)
    from public.booking_intents b
    where b.traveler_user_id = target
      and b.received_confirmed_at is not null
      and b.status <> 'cancelled'
  )
  where p.id = target;

  return null;
end;
$$;

drop trigger if exists bookings_refresh_trips_completed on public.booking_intents;
create trigger bookings_refresh_trips_completed
after insert or update or delete on public.booking_intents
for each row execute function public.refresh_trips_completed();

-- ---------------------------------------------------------------------------
-- Backfill, so existing rows stop showing whatever was seeded into them
-- ---------------------------------------------------------------------------
update public.profiles p
set rating = coalesce(
  (select round(avg(r.rating)::numeric, 2)
   from public.reviews r where r.reviewed_user_id = p.id),
  0
),
trips_completed = (
  select count(*)
  from public.booking_intents b
  where b.traveler_user_id = p.id
    and b.received_confirmed_at is not null
    and b.status <> 'cancelled'
);

-- Check: every rating should now match its reviews, and be 0 where there are
-- none.
select p.full_name, p.rating, p.trips_completed,
       (select count(*) from public.reviews r where r.reviewed_user_id = p.id) as nb_avis
from public.profiles p
order by p.trips_completed desc, p.rating desc
limit 20;
