-- Migration: lock down booking_intents money columns
-- Date: 2026-07-02
--
-- Apply this on the live Supabase database (SQL editor). It makes the server
-- the single source of truth for payment_status / payment_amount and the
-- handover timestamps. It is safe to run only AFTER the matching app code is
-- deployed (the code writes these columns via the service-role client and no
-- longer from the browser). Idempotent — safe to re-run.
--
-- Prerequisite app changes (already in the codebase):
--   - getAdminClient() writes payment_status/payment_amount in
--     /api/stripe/capture, /api/stripe/cancel, /api/confirm-receipt
--   - /api/booking/record-authorization (proposal payment authorisation)
--   - /api/booking/confirm-pickup and the delivery-code check in
--     /api/confirm-receipt (handover codes verified server-side)

begin;

-- Clients may no longer UPDATE the money / handover columns. Updates that
-- touch only other columns (e.g. status) still work.
revoke update (payment_status, payment_amount, pickup_confirmed_at, pickup_confirmed_by, received_confirmed_at)
  on public.booking_intents from authenticated, anon;

-- Block clients from INSERTing an already-captured or pre-confirmed row.
create or replace function public.booking_intents_guard_money()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if new.payment_status not in ('unpaid', 'authorized') then
    raise exception 'payment_status % not allowed on client insert', new.payment_status;
  end if;
  new.pickup_confirmed_at := null;
  new.pickup_confirmed_by := null;
  new.received_confirmed_at := null;
  return new;
end;
$$;

drop trigger if exists booking_intents_guard_money_ins on public.booking_intents;
create trigger booking_intents_guard_money_ins
  before insert on public.booking_intents
  for each row execute function public.booking_intents_guard_money();

commit;
