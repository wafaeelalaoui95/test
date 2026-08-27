-- Forget every Stripe Connect account the app has on file.
--
-- Run this AFTER scripts/reset-connect-accounts.mjs. Order matters only in one
-- direction: an account deleted at Stripe but still referenced here is what
-- produces "not connected to your platform or does not exist" at the account
-- link step. Clearing here first is harmless; the reverse is not.
--
-- After this, the next traveler who clicks "Recevoir mes paiements" gets a
-- brand-new account, and the app's idempotency key is already bucketed so
-- Stripe won't replay a dead one.

begin;

-- What is about to be cleared. Read it before committing.
-- full_name, not email: profiles has no email column — the address lives in
-- auth.users, which the SQL editor can join to if you need it.
select id, full_name, stripe_account_id, stripe_payouts_enabled, stripe_onboarded_at
from public.profiles
where stripe_account_id is not null;

update public.profiles
set stripe_account_id      = null,
    stripe_charges_enabled = false,
    stripe_payouts_enabled = false,
    stripe_onboarded_at    = null
where stripe_account_id is not null;

commit;

-- ---------------------------------------------------------------------------
-- OPTIONAL, and separate on purpose: payout history on bookings.
--
-- Only run this if you also want to forget that money ever moved. It does NOT
-- undo a real Stripe transfer — it erases the record that one happened, which
-- would let the app pay the same booking a second time. transfer_id IS NOT
-- NULL is the guard that makes payouts idempotent.
--
-- Safe only while every transfer_id below belongs to a deleted test account.
-- Check first:
--
--   select id, transfer_id, transfer_amount, transferred_at
--   from public.booking_intents
--   where transfer_id is not null;
--
-- update public.booking_intents
-- set transfer_id         = null,
--     transfer_amount     = null,
--     platform_fee_amount = null,
--     transferred_at      = null
-- where transfer_id is not null;
