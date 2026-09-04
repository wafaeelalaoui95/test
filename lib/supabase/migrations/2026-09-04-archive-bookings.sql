-- Let a booking be set aside without deleting it.
--
-- Two test bookings sit permanently in "ACTION NEEDED: traveler payout setup
-- incomplete" because the traveler accounts behind them were deleted. They
-- cannot resolve, they are counted by every hourly sweep, and they will sit at
-- the top of the attention list forever — which is how a real alert gets
-- missed when one finally appears.
--
-- Deleting them is the wrong fix. They hold real captured payments, and
-- erasing a record of money that moved is precisely what an audit asks about.
-- Archiving keeps the row and the history, and takes it out of the queue.

alter table public.booking_intents
  add column if not exists archived_at     timestamptz,
  add column if not exists archived_reason text;

create index if not exists booking_intents_archived_idx
  on public.booking_intents (archived_at)
  where archived_at is null;

-- Server-owned like every other money-adjacent column here: a sender could
-- otherwise archive their own booking and take it out of anyone's view.
revoke update (archived_at, archived_reason) on public.booking_intents
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Archiving the current two. READ THE SELECT FIRST.
-- ---------------------------------------------------------------------------
-- These are bookings that can never settle: captured, delivered, and the
-- traveler's profile no longer has a Stripe account because it was deleted
-- during the 2026-09-04 cleanup. Confirm this is what you expect before
-- running the update underneath.

select
  b.id,
  p_s.full_name                       as sender,
  p_t.full_name                       as traveler,
  (b.payment_amount / 100.0)          as paid_eur,
  b.transfer_id,
  b.created_at::date
from public.booking_intents b
left join public.profiles p_s on p_s.id = b.sender_id
left join public.profiles p_t on p_t.id = b.traveler_user_id
where b.payment_status = 'captured'
  and b.transfer_id is null
  and b.received_confirmed_at is not null
  and b.archived_at is null
  and coalesce(p_t.stripe_payouts_enabled, false) = false
  and p_t.stripe_account_id is null;

-- Only if the rows above are the ones you mean:
--
-- update public.booking_intents b
-- set archived_at = now(),
--     archived_reason = 'test booking; traveler account deleted 2026-09-04'
-- from public.profiles p_t
-- where p_t.id = b.traveler_user_id
--   and b.payment_status = 'captured'
--   and b.transfer_id is null
--   and b.received_confirmed_at is not null
--   and b.archived_at is null
--   and coalesce(p_t.stripe_payouts_enabled, false) = false
--   and p_t.stripe_account_id is null;

-- Check afterwards: should be 0.
-- select count(*) as still_queued from admin.payments_overview
-- where state like 'ACTION NEEDED%';
