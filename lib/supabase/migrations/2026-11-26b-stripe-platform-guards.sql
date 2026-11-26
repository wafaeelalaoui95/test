-- Migration: guards for the two Stripe platforms
-- Date: 2026-11-26 (after 2026-11-26-two-stripe-platforms.sql)
--
-- Apply on the live Supabase database (SQL editor). Idempotent — safe to re-run.
--
-- Three fixes from review:
--
-- 1. A booking's platform must be where its PaymentIntent WAS MADE, not where
--    the traveller happens to be when the booking row is written. The browser
--    inserts some bookings itself, minutes after the PaymentIntent was created;
--    if the traveller changed platform in between, the booking would point at
--    a platform that has never heard of its PaymentIntent. So
--    /api/stripe/create-payment-intent now records each PaymentIntent's
--    platform in payment_intent_platforms (server-only), and the trigger reads
--    it there first.
--
-- 2. Server routes (service_role) set stripe_platform themselves and are
--    trusted; only browser writes are recomputed.
--
-- 3. profiles' Stripe columns could be changed from the browser: a column
--    REVOKE does nothing while `authenticated` holds Supabase's table-wide
--    UPDATE grant (see 2026-11-23-guard-booking-price.sql). Changing
--    stripe_platform by hand would make the server look a finished account up
--    on the wrong platform, take it for dead and throw it away. A guard
--    trigger now refuses browser changes to every Stripe column.

begin;

create table if not exists public.payment_intent_platforms (
  payment_intent_id text primary key,
  platform text not null check (platform in ('gb', 'ae')),
  traveler_user_id uuid,
  created_at timestamptz not null default now()
);

alter table public.payment_intent_platforms enable row level security;
revoke all on public.payment_intent_platforms from anon, authenticated;

create index if not exists payment_intent_platforms_traveler_idx
  on public.payment_intent_platforms (traveler_user_id, created_at);

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
  -- SQL editor (no JWT) and server routes (service_role) set it themselves.
  if auth.role() is null or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.payment_intent_id is null
       or new.payment_intent_id is not distinct from old.payment_intent_id then
      new.stripe_platform := old.stripe_platform;
      return new;
    end if;
  end if;

  if new.payment_intent_id is not null then
    select platform into v_platform
    from public.payment_intent_platforms
    where payment_intent_id = new.payment_intent_id;
  end if;

  if v_platform is null then
    v_traveler := new.traveler_user_id;
    if v_traveler is null and new.traveler_trip_id is not null then
      select user_id into v_traveler from public.traveler_trips where id = new.traveler_trip_id;
    end if;
    select stripe_platform into v_platform from public.profiles where id = v_traveler;
  end if;

  new.stripe_platform := coalesce(v_platform, 'gb');
  return new;
end;
$$;

create or replace function public.profiles_guard_stripe_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() in ('authenticated', 'anon') and (
       new.stripe_platform        is distinct from old.stripe_platform
    or new.stripe_customer_id     is distinct from old.stripe_customer_id
    or new.stripe_customer_id_ae  is distinct from old.stripe_customer_id_ae
    or new.stripe_account_id      is distinct from old.stripe_account_id
    or new.stripe_charges_enabled is distinct from old.stripe_charges_enabled
    or new.stripe_payouts_enabled is distinct from old.stripe_payouts_enabled
    or new.stripe_onboarded_at    is distinct from old.stripe_onboarded_at
    -- NOT stripe_bank_fingerprint: 2026-09-04-bank-fingerprint.sql was never
    -- applied in production, and naming a missing column here made EVERY
    -- profile update fail (fixed in prod 2026-11-26).
  ) then
    raise exception 'Stripe columns are managed by the server'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_stripe_columns on public.profiles;
create trigger profiles_guard_stripe_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_stripe_columns();

commit;

-- Check: should return 0 rows (the table starts empty).
select count(*) as payment_intents_recorded from public.payment_intent_platforms;
