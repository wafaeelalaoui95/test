-- Migration: booking prices are server-owned
-- Date: 2026-11-23
--
-- Apply on the live Supabase database (SQL editor) AFTER the matching app code
-- (branch test/server-side-price) is deployed. Idempotent — safe to re-run.
--
-- Why: /api/stripe/create-payment-intent now charges a traveller's proposal at
-- booking_intents.proposed_price, read from the database. That only holds if a
-- client cannot edit proposed_price after the row exists. RLS lets either party
-- UPDATE their bookings, and the earlier column-level `revoke update (...)`
-- (2026-07-02-lock-money-columns.sql) does not bite while the role still holds
-- the table-wide UPDATE grant Supabase gives `authenticated` by default — a
-- column REVOKE cannot subtract from a table GRANT. A trigger can.
--
-- Columns guarded on UPDATE from a browser session (anon / authenticated):
--   proposed_price, payment_amount, payment_status, payment_intent_id
-- Server routes (service_role) and the SQL editor (postgres) are unaffected.
-- No browser code updates these columns (checked: client updates touch only
-- status and received_confirmed_at).

begin;

create or replace function public.booking_intents_guard_price()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.proposed_price    is distinct from old.proposed_price
  or new.payment_amount    is distinct from old.payment_amount
  or new.payment_status    is distinct from old.payment_status
  or new.payment_intent_id is distinct from old.payment_intent_id then
    raise exception 'booking price and payment columns are server-owned';
  end if;
  return new;
end;
$$;

drop trigger if exists booking_intents_guard_price_upd on public.booking_intents;
create trigger booking_intents_guard_price_upd
  before update on public.booking_intents
  for each row execute function public.booking_intents_guard_price();

commit;

-- Check after applying (as a logged-in user this must now fail):
--   update public.booking_intents set proposed_price = 1 where id = '<one of yours>';
