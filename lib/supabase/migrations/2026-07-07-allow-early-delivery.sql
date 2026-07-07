-- Migration: allow early delivery confirmation
-- Date: 2026-07-07
--
-- The app now lets a traveler confirm delivery before their flight date via
-- the "Delivering early?" confirmation (they tick a box AND give a reason,
-- which is recorded on the delivery proof). A leftover database trigger still
-- hard-blocked this with:
--   DELIVERY_BEFORE_FLIGHT: la livraison ne peut être confirmée avant le <date>
--
-- The trigger function `enforce_delivery_proof_after_flight()` is single
-- purpose (it only raises that exception — confirmed by inspecting its
-- definition), so we drop the trigger and the function. The client-side
-- confirmation + recorded reason is the gate now.
--
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.

begin;

drop trigger if exists trg_enforce_delivery_proof_after_flight on public.booking_intents;
drop function if exists public.enforce_delivery_proof_after_flight();

commit;
