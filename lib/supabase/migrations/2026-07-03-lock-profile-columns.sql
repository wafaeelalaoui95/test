-- Migration: lock down trust/reputation columns on profiles
-- Date: 2026-07-03
--
-- Same idea as the booking_intents money-column lockdown: the client must not
-- be able to award itself verification or reputation. The profiles_update_own
-- RLS policy lets a user update their own row, but RLS is row-level, not
-- column-level — so without this, a user can run
--   supabase.from('profiles').update({ verification_level: 'trusted',
--     identity_verified_at: now() })
-- from the browser console and fake being ID-verified, bypassing Stripe
-- Identity entirely.
--
-- These columns are written server-side only:
--   - verification_level / identity_verified_at / identity_verification_status
--     → by the identity webhook (service-role)
--   - rating / trips_completed → derived from reviews/bookings (triggers or
--     service-role jobs)
-- The profile-edit UI only writes full_name/phone/city/country, so revoking
-- these does not affect it. Idempotent-safe; run on the live DB.

revoke update (
  verification_level,
  identity_verified_at,
  identity_verification_status,
  rating,
  trips_completed
) on public.profiles from authenticated, anon;
