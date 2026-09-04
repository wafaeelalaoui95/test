-- A standing view of every payment, always current.
--
-- Deliberately a VIEW and not a table. A table would be a second copy of facts
-- that already exist in booking_intents: something would have to write to it on
-- every payment, capture, transfer and refund, and the first missed write would
-- leave two answers to "was this traveler paid?" with no way to tell which is
-- right. A view is recomputed on every read and cannot drift.
--
-- It lives in the `admin` schema on purpose. Supabase only exposes the schemas
-- listed in its API settings — `public` by default — so anything created there
-- is reachable over PostgREST by whoever holds an anon key. This view joins
-- auth.users and shows both parties' email addresses next to what they paid.
-- In `admin`, it is reachable from the SQL editor and from a service-role
-- connection, and from nowhere else.

create schema if not exists admin;

-- Belt and braces: even inside admin, no client role gets a look in.
revoke all on schema admin from anon, authenticated;

-- Dropped first, not "create or replace". Postgres only lets that add columns
-- at the END of a view's list — inserting one in the middle fails with
-- "cannot change name of view column", and the migration stops without
-- replacing anything. Dropping makes the file rerunnable however the shape
-- changes. Nothing depends on this view, so nothing cascades.
drop view if exists admin.payments_overview;

create view admin.payments_overview as
select
  b.created_at,
  b.id                                       as booking,

  -- Parties
  p_s.full_name                              as sender,
  u_s.email                                  as sender_email,
  p_t.full_name                              as traveler,
  u_t.email                                  as traveler_email,

  -- What was carried, and where
  coalesce(nullif(b.item_title, ''), b.item_category) as object,
  b.pickup_city || ' -> ' || b.destination_city       as route,

  -- Money. paid_eur is what the sender was charged.
  (b.payment_amount / 100.0)                 as paid_eur,

  -- The split. Once a transfer exists these are the real amounts Stripe moved.
  -- Before that they are computed the same way splitAmount() does, so the view
  -- can answer "what will this cost me" and not only "what did it".
  --
  -- KEEP IN STEP WITH lib/constants.ts: PLATFORM_FEE_BPS = 1500 (15%) and
  -- PLATFORM_FEE_FIXED_CENTS = 50. If those change, change them here too — the
  -- estimate is the only part of this view that can be wrong.
  coalesce(
    b.transfer_amount / 100.0,
    round(greatest(0, b.payment_amount - 50) * 10000.0 / 11500.0) / 100.0
  )                                          as traveler_gets_eur,
  coalesce(
    b.platform_fee_amount / 100.0,
    (b.payment_amount
      - round(greatest(0, b.payment_amount - 50) * 10000.0 / 11500.0)) / 100.0
  )                                          as jibly_keeps_eur,
  -- True while the two figures above are a forecast rather than a record.
  (b.transfer_amount is null)                as split_is_estimated,

  b.payment_status,

  -- The single column to read when you only read one. Ordered so the first
  -- matching condition is the most specific.
  case
    -- First, because an archived booking must not appear under any of the
    -- labels below — being set aside is the whole point.
    when b.archived_at is not null              then 'archived: ' || coalesce(b.archived_reason, 'set aside')
    when b.payment_status = 'refunded'          then 'refunded to sender'
    when b.payment_status = 'canceled'          then 'authorisation released'
    when b.payment_status = 'failed'            then 'card declined'
    when b.payment_status = 'authorized'        then 'held on the card, not captured'
    -- Deliberately not "PAID OUT". A transfer moves money from the Jibly
    -- balance into the traveler's Stripe balance; reaching their BANK is a
    -- second leg, on Stripe's payout schedule, and nothing here tracks it. A
    -- traveler saying "I haven't received anything" while this reads PAID OUT
    -- is not a contradiction — it is this distinction.
    when b.transfer_id is not null              then 'SENT to their Stripe balance'
    when b.traveler_user_id is null             then 'NO TRAVELER ON THIS BOOKING'
    -- Captured, the trip has come and gone, and nobody has confirmed delivery.
    -- Nothing in the app resolves this on its own: no transfer, because there
    -- is no delivery; no refund, because nothing asks for one. The sender has
    -- paid and has neither their parcel nor their money, and would stay there
    -- forever. Refunding is a judgement call, so this only makes the case
    -- visible — app/api/stripe/refund is how it gets resolved.
    when b.received_confirmed_at is null
     and coalesce(t.departure_date, b.created_at::date) < current_date - 7
                                                then 'OVERDUE: paid, trip has passed, no delivery confirmed'
    when b.received_confirmed_at is null        then 'captured, not delivered yet'
    when p_t.stripe_payouts_enabled is not true then 'ACTION NEEDED: traveler payout setup incomplete'
    else 'captured and delivered, transfer pending'
  end                                        as state,

  -- How far the traveler got, when the state above says they are the holdup.
  (p_t.identity_verified_at is not null)     as traveler_identity_done,
  (p_t.stripe_account_id is not null)        as traveler_payout_account,
  p_t.stripe_payouts_enabled                 as traveler_can_be_paid,

  -- For looking the same money up in Stripe.
  --
  -- traveler_stripe_account answers the question Stripe cannot, before the
  -- transfer exists: WHERE would this money go. Until delivery is confirmed
  -- there is no transfer at all, so Stripe holds the funds in the platform
  -- balance with no idea who they are owed to — the intended recipient lives
  -- here and nowhere else. Worth checking before a handover, not after.
  p_t.stripe_account_id                      as traveler_stripe_account,

  -- The last leg, the one the traveler actually feels. Everything above stops
  -- at Stripe's internal state; these three say whether euros reached a bank.
  -- 'failed' with a reason is the row to act on.
  lp.status                                  as bank_payout_status,
  lp.arrival_date                            as bank_payout_arrival,
  lp.failure_message                         as bank_payout_failure,

  b.payment_intent_id,
  b.transfer_id,
  b.transferred_at
from public.booking_intents b
left join public.profiles p_s on p_s.id = b.sender_id
left join auth.users     u_s  on u_s.id = b.sender_id
left join public.profiles p_t on p_t.id = b.traveler_user_id
left join auth.users     u_t  on u_t.id = b.traveler_user_id
-- For the departure date: a trip that has already happened is the signal that
-- a delivery is late, and it beats counting days from the booking.
left join public.traveler_trips t on t.id = b.traveler_trip_id
-- Most recent payout for this traveler. Not per booking: Stripe pays out a
-- balance, and one payout can cover several transfers, so tying one to a
-- single booking would invent a precision that doesn't exist.
left join lateral (
  select tp.status, tp.arrival_date, tp.failure_message
  from public.traveler_payouts tp
  where tp.user_id = b.traveler_user_id
  order by tp.created_at desc
  limit 1
) lp on true
where b.payment_status <> 'unpaid'
order by b.created_at desc;

revoke all on admin.payments_overview from anon, authenticated;

-- How to use it, from the SQL editor:
--
--   select * from admin.payments_overview;
--
--   -- only what needs attention
--   select * from admin.payments_overview
--   where state like 'ACTION NEEDED%'
--      or state like 'NO TRAVELER%'
--      or state like 'OVERDUE%';
--
--   -- what Jibly has actually earned, versus what is still forecast
--   select split_is_estimated, count(*), sum(jibly_keeps_eur)
--   from admin.payments_overview
--   group by split_is_estimated;

select * from admin.payments_overview;
