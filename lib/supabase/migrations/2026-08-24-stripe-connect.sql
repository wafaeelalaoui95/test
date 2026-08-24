-- Migration: Stripe Connect — traveler payout accounts + transfer bookkeeping
-- Date: 2026-08-24
--
-- Until now money was captured into the Jibly platform balance and stopped
-- there: travelers had no account to be paid into. This adds the two halves
-- of that missing path.
--
-- 1) profiles.*  — the traveler's Connect (Express) account and its capability
--    flags, mirrored from Stripe by the account.updated webhook. We store the
--    flags rather than calling Stripe on every render: publishing a trip needs
--    to check "can this user be paid?" on a hot path.
--
-- 2) booking_intents.* — what we actually transferred and what we kept. Stored
--    so a payout can be reconciled against a booking without replaying the
--    Stripe API, and so the transfer is idempotent (transfer_id NOT NULL means
--    "already sent, don't send twice").
--
-- Model: separate charges and transfers. The sender is charged to the platform
-- account (unchanged), and on capture we create a Transfer to the traveler with
-- source_transaction set to the charge, so the funds tracking is exact.
-- Idempotent-safe; run on the live DB.

alter table public.profiles
  add column if not exists stripe_account_id      text,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_onboarded_at    timestamptz;

-- One Connect account per profile. Partial index so the many NULLs (users who
-- never onboarded, i.e. every sender) don't collide with each other.
create unique index if not exists profiles_stripe_account_id_key
  on public.profiles (stripe_account_id)
  where stripe_account_id is not null;

alter table public.booking_intents
  add column if not exists transfer_id          text,
  add column if not exists transfer_amount      integer,
  add column if not exists platform_fee_amount  integer,
  add column if not exists transferred_at       timestamptz,
  add column if not exists refunded_amount      integer not null default 0,
  add column if not exists refunded_at          timestamptz;

-- Same lockdown rationale as 2026-07-03-lock-profile-columns.sql: a user must
-- not be able to mark themselves payable from the browser console and have the
-- trip-publishing gate wave them through. These are written by the Connect
-- webhook and the onboarding route, both service-role.
revoke update (
  stripe_account_id,
  stripe_charges_enabled,
  stripe_payouts_enabled,
  stripe_onboarded_at
) on public.profiles from authenticated, anon;

-- Money columns are server-owned, same as payment_status / payment_amount.
revoke update (
  transfer_id,
  transfer_amount,
  platform_fee_amount,
  transferred_at,
  refunded_amount,
  refunded_at
) on public.booking_intents from authenticated, anon;

-- The refund route needs a terminal state that 'captured' and 'canceled' don't
-- express: money was taken and then given back. The original inline check
-- (schema.sql:188) predates refunds existing, so widen it.
alter table public.booking_intents
  drop constraint if exists booking_intents_payment_status_check;

alter table public.booking_intents
  add constraint booking_intents_payment_status_check
  check (payment_status in ('unpaid','authorized','captured','canceled','failed','refunded'));
