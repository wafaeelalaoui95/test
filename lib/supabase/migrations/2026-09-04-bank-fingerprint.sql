-- One bank account per traveler.
--
-- Two connected accounts under different names pointing at the same IBAN is
-- one of the signals Stripe acts on: it verifies that the bank account belongs
-- to the verified person, and restricts both accounts when it doesn't. That is
-- what happened while testing — two accounts disabled hours after they had been
-- shown as enabled, with no actionable reason beyond 'other'.
--
-- It is worth stopping regardless of Stripe. Paying traveler A into traveler
-- B's bank account is what the identity checks exist to prevent, and the
-- platform is the party that has to answer for it.
--
-- Stripe returns a `fingerprint` on every external account: a stable hash of
-- the bank details, the same for the same account across Stripe objects. It is
-- not the IBAN and cannot be turned back into one, so storing it holds nothing
-- sensitive.

alter table public.profiles
  add column if not exists stripe_bank_fingerprint text;

-- The constraint itself. Nulls don't collide, so this only binds profiles that
-- have actually attached a bank account.
create unique index if not exists profiles_stripe_bank_fingerprint_key
  on public.profiles (stripe_bank_fingerprint)
  where stripe_bank_fingerprint is not null;

-- Server-owned, like every other Stripe column here (see
-- 2026-08-24-stripe-connect.sql). A user who could write this could either
-- free up a fingerprint or squat someone else's.
revoke update (stripe_bank_fingerprint) on public.profiles from authenticated, anon;

-- Check: empty until the next traveler adds a bank account.
select count(*) as profiles_with_bank
from public.profiles
where stripe_bank_fingerprint is not null;
