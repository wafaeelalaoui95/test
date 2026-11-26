-- Migration: remove the second (UAE) Stripe platform
-- Date: 2026-11-26
--
-- Apply on the live Supabase database (SQL editor) ONLY AFTER the code revert
-- is deployed: the code that reads these columns must be gone first.
-- Idempotent — safe to re-run.
--
-- Why: Stripe in the UAE only onboards companies (llc, sole_establishment,
-- free_zone_llc, free_zone_establishment), never private individuals, so a
-- UAE-banked traveller cannot be paid there. The two-platform build
-- (2026-11-26-two-stripe-platforms.sql and 26b) is reverted.
--
-- KEPT on purpose: profiles_guard_stripe_columns. Before it, a column REVOKE did
-- nothing while `authenticated` holds the table-wide UPDATE grant, so a user
-- could edit their own Stripe columns (e.g. mark themselves payable) from the
-- browser console. It is redefined here without the UAE columns.

begin;

create or replace function public.profiles_guard_stripe_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() in ('authenticated', 'anon') and (
       new.stripe_customer_id     is distinct from old.stripe_customer_id
    or new.stripe_account_id      is distinct from old.stripe_account_id
    or new.stripe_charges_enabled is distinct from old.stripe_charges_enabled
    or new.stripe_payouts_enabled is distinct from old.stripe_payouts_enabled
    or new.stripe_onboarded_at    is distinct from old.stripe_onboarded_at
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

drop trigger if exists booking_intents_set_stripe_platform on public.booking_intents;
drop function if exists public.booking_intents_set_stripe_platform();

alter table public.booking_intents drop constraint if exists booking_intents_stripe_platform_check;
alter table public.booking_intents drop column if exists stripe_platform;

alter table public.profiles drop constraint if exists profiles_stripe_platform_check;
drop index if exists public.profiles_stripe_customer_id_ae_key;
alter table public.profiles drop column if exists stripe_platform;
alter table public.profiles drop column if exists stripe_customer_id_ae;

drop table if exists public.payment_intent_platforms;

commit;

-- Check: both should be 0.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and column_name in ('stripe_platform', 'stripe_customer_id_ae')) as uae_columns_left,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'payment_intent_platforms') as uae_tables_left;
