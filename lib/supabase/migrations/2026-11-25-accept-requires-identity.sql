-- Migration: accepting a booking requires a verified identity
-- Date: 2026-11-25
--
-- Apply on the live Supabase database (SQL editor). Idempotent — safe to re-run.
--
-- Why: travellers can now publish a trip BEFORE the Stripe Identity check (ID
-- document + selfie), so we don't lose them at the first step. The check moves
-- to the match: a traveller cannot accept a booking until verified. The app
-- blocks it on screen (/me) and /api/booking/negotiate refuses it server-side;
-- this trigger closes the remaining path — a browser session setting
-- booking_intents.status to 'confirmed' directly through the Supabase client.
--
-- Only browser sessions (anon / authenticated) are checked. Server routes
-- (service_role) and the SQL editor (postgres) are unaffected. Declining
-- ('cancelled') is never blocked.

begin;

create or replace function public.booking_intents_accept_requires_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.role() reads the JWT: 'authenticated'/'anon' for a browser session,
  -- 'service_role' for server routes, null in the SQL editor. (current_user is
  -- the function owner here because of security definer, so it can't be used.)
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and identity_verified_at is not null
    ) then
      raise exception 'identity_required';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists booking_intents_accept_requires_identity_upd on public.booking_intents;
create trigger booking_intents_accept_requires_identity_upd
  before update of status on public.booking_intents
  for each row execute function public.booking_intents_accept_requires_identity();

commit;

-- Check after applying, logged in as an UNVERIFIED traveller (must fail):
--   update public.booking_intents set status = 'confirmed' where id = '<a pending one of yours>';
