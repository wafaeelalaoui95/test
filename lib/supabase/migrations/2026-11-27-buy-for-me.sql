-- Migration: "the traveller buys the item for me"
-- Date: 2026-11-27
--
-- Additive and idempotent: three nullable / defaulted columns on each of
-- booking_intents and shipping_requests. Safe to run before the app code is
-- deployed (nothing reads them yet) and safe to re-run.
--
-- What they hold:
--   purchase_requested  the sender asked the traveller to buy the item
--   purchase_price      the price the sender gave, in euros. FIXED: the
--                       traveller is reimbursed exactly this, whatever the
--                       shop charged — Jibly cannot check a receipt.
--   purchase_url        where to buy it, optional
--
-- These columns are for DISPLAY. The money does not trust them: the amount
-- charged and the share paid out for the item come from the PaymentIntent's
-- metadata (purchaseCents), which only /api/stripe/create-payment-intent
-- writes. A browser that edits purchase_price changes what is shown, not what
-- anyone is paid. The guard trigger below still stops that on bookings, so the
-- traveller is never shown a different price from the one charged.

begin;

alter table public.booking_intents  add column if not exists purchase_requested boolean not null default false;
alter table public.booking_intents  add column if not exists purchase_price     numeric(10,2) check (purchase_price is null or purchase_price > 0);
alter table public.booking_intents  add column if not exists purchase_url       text check (purchase_url is null or length(purchase_url) <= 1000);

alter table public.shipping_requests add column if not exists purchase_requested boolean not null default false;
alter table public.shipping_requests add column if not exists purchase_price     numeric(10,2) check (purchase_price is null or purchase_price > 0);
alter table public.shipping_requests add column if not exists purchase_url       text check (purchase_url is null or length(purchase_url) <= 1000);

-- Extend the existing price guard (2026-11-23-guard-booking-price.sql) to the
-- purchase columns: set once at insert, never edited from a browser.
create or replace function public.booking_intents_guard_price()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.proposed_price     is distinct from old.proposed_price
  or new.payment_amount     is distinct from old.payment_amount
  or new.payment_status     is distinct from old.payment_status
  or new.payment_intent_id  is distinct from old.payment_intent_id
  or new.purchase_requested is distinct from old.purchase_requested
  or new.purchase_price     is distinct from old.purchase_price
  or new.purchase_url       is distinct from old.purchase_url then
    raise exception 'booking price and payment columns are server-owned';
  end if;
  return new;
end;
$$;

commit;
