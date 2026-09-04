-- Give every sender a stable Stripe customer.
--
-- Payments were created without a `customer`, so Stripe minted a throwaway
-- guest customer (gcus_…) for each one and had nothing to put on it: the
-- Customers list showed opaque IDs, no name, no email, and a country guessed
-- from the card BIN. A refund request or a chargeback could not be traced back
-- to a Jibly account without opening the PaymentIntent and reading its
-- metadata.
--
-- One customer per user also gives us, later and for free, the thing repeat
-- senders will expect: a saved card instead of re-typing it every trip.
--
-- Existing guest customers are left alone. They hold real, captured payments,
-- so deleting them would detach live charges from any customer at all, and
-- nothing recorded which user each belonged to. Their PaymentIntents still
-- carry metadata.userId, so they stay traceable — just not from the Customers
-- list.

alter table public.profiles
  add column if not exists stripe_customer_id text;

-- One profile per Stripe customer, both directions. Nulls don't collide, so
-- this only constrains rows that have actually been through a payment.
create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Same lockdown as every other Stripe column on this table (see
-- 2026-08-24-stripe-connect.sql). RLS is row-level, so without this a user
-- could point their own profile at another person's customer from the browser
-- console and have their payments filed under that person's name. Written by
-- the payment route, service-role.
revoke update (stripe_customer_id) on public.profiles from authenticated, anon;

-- Check: the column exists and is empty. It fills on the next payment.
select count(*) as profiles_with_customer
from public.profiles
where stripe_customer_id is not null;
