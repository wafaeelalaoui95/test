-- Migration: two Stripe platforms — Jibly Limited (gb) and WEF Technologies FZE LLC (ae)
-- Date: 2026-11-26
--
-- Apply on the live Supabase database (SQL editor). Idempotent — safe to re-run.
-- MUST be applied BEFORE the code that reads these columns is deployed.
--
-- Why: a UK Stripe platform cannot pay a UAE bank account, and a UAE platform
-- can pay only UAE bank accounts. So a traveller paid in the UAE is onboarded
-- on the UAE platform, and the money for their bookings is charged, captured,
-- refunded and transferred there. Everything else stays on the UK platform,
-- exactly as before: every existing row gets 'gb'.
--
--   profiles.stripe_platform        — where the traveller's Connect account is.
--                                     null = none yet = treated as 'gb'.
--   profiles.stripe_customer_id_ae  — the sender's customer on the UAE platform
--                                     (customers do not cross platforms).
--   booking_intents.stripe_platform — where THIS booking's money is. Decided by
--                                     the trigger below at the moment a payment
--                                     is attached, from the traveller's platform,
--                                     and frozen after. Never by the browser.

begin;

alter table public.profiles
  add column if not exists stripe_platform text,
  add column if not exists stripe_customer_id_ae text;

alter table public.profiles drop constraint if exists profiles_stripe_platform_check;
alter table public.profiles
  add constraint profiles_stripe_platform_check
  check (stripe_platform is null or stripe_platform in ('gb', 'ae'));

create unique index if not exists profiles_stripe_customer_id_ae_key
  on public.profiles (stripe_customer_id_ae)
  where stripe_customer_id_ae is not null;

revoke update (stripe_platform, stripe_customer_id_ae) on public.profiles from authenticated, anon;

alter table public.booking_intents
  add column if not exists stripe_platform text not null default 'gb';

alter table public.booking_intents drop constraint if exists booking_intents_stripe_platform_check;
alter table public.booking_intents
  add constraint booking_intents_stripe_platform_check
  check (stripe_platform in ('gb', 'ae'));

revoke update (stripe_platform) on public.booking_intents from authenticated, anon;

-- The booking's platform = its traveller's platform, taken when a payment is
-- attached (insert with a payment_intent_id, or payment_intent_id changing to a
-- new value). Otherwise it never moves. The browser inserts some bookings
-- itself (/envoyer, /u/[id]), so this cannot be left to the routes.
-- Only the SQL editor (no JWT: auth.role() is null) may set it by hand.
create or replace function public.booking_intents_set_stripe_platform()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_traveler uuid;
  v_platform text;
begin
  if auth.role() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.payment_intent_id is null
       or new.payment_intent_id is not distinct from old.payment_intent_id then
      new.stripe_platform := old.stripe_platform;
      return new;
    end if;
  end if;

  v_traveler := new.traveler_user_id;
  if v_traveler is null and new.traveler_trip_id is not null then
    select user_id into v_traveler from public.traveler_trips where id = new.traveler_trip_id;
  end if;

  select stripe_platform into v_platform from public.profiles where id = v_traveler;
  new.stripe_platform := coalesce(v_platform, 'gb');
  return new;
end;
$$;

drop trigger if exists booking_intents_set_stripe_platform on public.booking_intents;
create trigger booking_intents_set_stripe_platform
  before insert or update of payment_intent_id, stripe_platform on public.booking_intents
  for each row execute function public.booking_intents_set_stripe_platform();

commit;

-- Check: every booking should be 'gb' right after applying.
select stripe_platform, count(*) from public.booking_intents group by stripe_platform;
