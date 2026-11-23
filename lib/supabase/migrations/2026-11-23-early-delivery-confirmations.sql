-- Migration: record the two early-delivery confirmations
-- Date: 2026-11-23
--
-- Run in the Supabase SQL editor. Idempotent: safe to re-run.
--
-- When a traveller marks a parcel delivered before their flight date, the
-- "Livraison en avance ?" popup makes them tick two boxes:
--   1. they handed the parcel to the recipient;
--   2. they told the sender about the early delivery.
-- Until now the ticks only unlocked the button and were thrown away, so in a
-- dispute we could not show the traveller had declared either. The reason they
-- typed is already kept in delivery_early_reason (2026-07-07 migration).
--
-- Each column holds the moment the server received the declaration together
-- with the delivery proof. Null = not an early delivery (or before this change).
--
-- The app code is deployed before this runs and writes these columns in a
-- separate, non-fatal update, so a missing column never blocks a proof upload.
-- Run this soon anyway: until it runs, the declarations are lost (logged only).

begin;

alter table public.booking_intents
  add column if not exists delivery_early_handed_over_at timestamptz,
  add column if not exists delivery_early_sender_informed_at timestamptz;

-- A declaration is evidence only if its author cannot rewrite it afterwards.
-- Same approach as booking_intents_guard_price: a column REVOKE does not bite
-- while `authenticated` holds the table-wide UPDATE grant, a trigger does.
-- delivery_early_reason is guarded too: it is written once by the server.
create or replace function public.booking_intents_guard_early_delivery()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.delivery_early_reason             is distinct from old.delivery_early_reason
  or new.delivery_early_handed_over_at     is distinct from old.delivery_early_handed_over_at
  or new.delivery_early_sender_informed_at is distinct from old.delivery_early_sender_informed_at then
    raise exception 'early-delivery declarations are server-owned';
  end if;
  return new;
end;
$$;

drop trigger if exists booking_intents_guard_early_delivery_upd on public.booking_intents;
create trigger booking_intents_guard_early_delivery_upd
  before update on public.booking_intents
  for each row execute function public.booking_intents_guard_early_delivery();

commit;

-- Check: early deliveries and what the traveller declared.
select
  id,
  delivery_proof_uploaded_at,
  delivery_early_reason,
  delivery_early_handed_over_at,
  delivery_early_sender_informed_at
from public.booking_intents
where delivery_early_reason is not null
order by delivery_proof_uploaded_at desc
limit 20;
