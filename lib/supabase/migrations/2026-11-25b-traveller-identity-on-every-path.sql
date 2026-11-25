-- Migration: the TRAVELLER must be identity-verified on every path to a match
-- Date: 2026-11-25 (replaces the function from 2026-11-25-accept-requires-identity.sql)
--
-- Apply on the live Supabase database (SQL editor). Idempotent — safe to re-run.
--
-- Why: the first version only checked the CALLER, and only from a browser
-- session. A test showed an unverified traveller still ending up with a
-- confirmed booking. Two holes:
--   1. Server routes (service_role) confirm bookings too — the sender paying a
--      traveller's proposal (/api/booking/record-authorization). The old
--      trigger let every service_role write through.
--   2. A traveller could PROPOSE on a request from the homepage
--      ("Je peux le prendre") with no identity check at all; the sender's
--      payment then confirmed it server-side.
--
-- Now, whoever makes the change (browser or server), the booking's traveller
-- — traveler_user_id, or the trip owner — must have identity_verified_at:
--   * when a booking becomes 'confirmed' (insert or update), and
--   * when a traveller creates a proposal (insert with initiated_by='traveler').
-- Only the SQL editor (no JWT, auth.role() is null) bypasses it, for manual
-- fixes by an operator. Declining / cancelling is never blocked.

begin;

create or replace function public.booking_intents_accept_requires_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  traveller uuid;
begin
  if auth.role() is null then
    return new;  -- SQL editor / maintenance
  end if;

  if (new.status = 'confirmed'
        and (tg_op = 'INSERT' or old.status is distinct from 'confirmed'))
     or (tg_op = 'INSERT' and new.initiated_by = 'traveler') then
    traveller := coalesce(
      new.traveler_user_id,
      (select user_id from public.traveler_trips where id = new.traveler_trip_id)
    );
    if traveller is null or not exists (
      select 1 from public.profiles
      where id = traveller and identity_verified_at is not null
    ) then
      raise exception 'identity_required';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists booking_intents_accept_requires_identity_upd on public.booking_intents;
create trigger booking_intents_accept_requires_identity_upd
  before insert or update of status on public.booking_intents
  for each row execute function public.booking_intents_accept_requires_identity();

commit;

-- Check after applying: this lists confirmed bookings whose traveller is NOT
-- verified (any created before today's change). Should be empty, or only the
-- test booking you just accepted.
--   select b.id, b.status, b.created_at, p.full_name
--   from booking_intents b
--   left join traveler_trips t on t.id = b.traveler_trip_id
--   join profiles p on p.id = coalesce(b.traveler_user_id, t.user_id)
--   where b.status = 'confirmed' and p.identity_verified_at is null
--   order by b.created_at desc;
