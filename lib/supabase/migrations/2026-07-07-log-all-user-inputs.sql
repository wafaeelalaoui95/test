-- Migration: persist previously-unstored user inputs
-- Date: 2026-07-07
--
-- Closes three audit gaps so every user-entered value is kept for later
-- (disputes / compliance). Run in the Supabase SQL editor. Idempotent.
--
--   1. Early-delivery reason — was only prefilled into the editable proof note.
--   2. Terms / certification acceptance — was validated but never recorded.
--   3. Traveler accepted item categories — was only JSON inside notes.

begin;

-- 1) Dedicated, non-editable record of the early-delivery reason.
alter table public.booking_intents
  add column if not exists delivery_early_reason text;

-- 2) Timestamped proof that the user ticked the terms / certification boxes.
alter table public.traveler_trips
  add column if not exists terms_agreed_at timestamptz;
alter table public.shipping_requests
  add column if not exists terms_agreed_at timestamptz;
alter table public.booking_intents
  add column if not exists user_certified_at timestamptz;

-- 3) Queryable column for the traveler's accepted categories (we also keep
--    writing the legacy JSON in `notes` so existing reads keep working).
alter table public.traveler_trips
  add column if not exists accepted_categories text[];

commit;
