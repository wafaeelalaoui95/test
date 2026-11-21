-- Travellers verify on match, not on publish
--
-- Travellers may now publish a trip before verifying their identity — asking
-- for an ID before anyone had shown interest is where they gave up. The check
-- moves to the moment it matters: a booking cannot become 'confirmed' while
-- the traveller carrying it is unverified.
--
-- The page checks first (/me) and /api/stripe/capture refuses too, but the
-- status is written from the browser under RLS, so only the database can make
-- the rule hold for every path. Existing confirmed bookings are untouched: the
-- trigger only fires on the change TO 'confirmed'.
--
-- Senders are unaffected — they still verify before publishing or paying.

create or replace function public.require_verified_traveler_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  traveler uuid;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    return new;
  end if;

  traveler := new.traveler_user_id;
  if traveler is null and new.traveler_trip_id is not null then
    select user_id into traveler from public.traveler_trips where id = new.traveler_trip_id;
  end if;
  if traveler is null then
    return new;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = traveler and identity_verified_at is not null
  ) then
    raise exception 'identity_required: the traveller must verify their identity before this booking can be confirmed'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_require_verified_traveler_on_confirm on public.booking_intents;
create trigger trg_require_verified_traveler_on_confirm
before insert or update of status on public.booking_intents
for each row execute function public.require_verified_traveler_on_confirm();
