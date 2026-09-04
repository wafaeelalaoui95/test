-- Give the orphaned bookings their traveler back.
--
-- Booking from a traveler's profile page (/u/[id]) never wrote
-- traveler_user_id. Those bookings were paid, picked up and delivered while
-- naming nobody to pay, so transferToTraveler skipped them with 'no_traveler'
-- and the sender's money stayed in the Jibly balance.
--
-- The link was never truly lost: traveler_trip_id points at the trip, and a
-- trip knows its owner. This restores it from there.
--
-- The code side is fixed too (ProfileClient now passes it, and the input type
-- makes it mandatory so the next caller cannot forget), but that only helps
-- new bookings.

-- Look before touching: what will change, and who gets paid.
select
  b.id            as booking,
  t.user_id       as traveler_to_restore,
  p.full_name     as traveler_name,
  (b.payment_amount / 100.0) as paid_eur,
  b.payment_status,
  b.received_confirmed_at is not null as delivered,
  p.stripe_payouts_enabled            as can_be_paid_now
from public.booking_intents b
join public.traveler_trips t on t.id = b.traveler_trip_id
left join public.profiles p  on p.id = t.user_id
where b.traveler_user_id is null;

-- Restore. Only where the trip still exists — a cascade-deleted trip means the
-- traveler's account is gone and there is nothing to recover here.
update public.booking_intents b
set traveler_user_id = t.user_id
from public.traveler_trips t
where t.id = b.traveler_trip_id
  and b.traveler_user_id is null;

-- Check: nothing left that has both a trip and no traveler.
select count(*) as still_orphaned
from public.booking_intents b
join public.traveler_trips t on t.id = b.traveler_trip_id
where b.traveler_user_id is null;

-- What happens next, without any further action:
--   app/api/stripe/webhook (account.updated) → retryPendingPayouts() selects
--   captured + delivered + transfer_id is null, filtered on traveler_user_id.
--   So the moment each traveler finishes payout onboarding, these transfer
--   automatically. Nothing needs to be moved by hand in Stripe.
