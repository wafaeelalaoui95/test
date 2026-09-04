-- Where is the money for every booking that has been paid?
--
-- Answers, per booking: what the sender paid, who is owed it, whether it has
-- left the Jibly balance, and — when it hasn't — how far that traveler got
-- through payout setup. Read-only.

select
  b.id                                     as booking,
  p_s.full_name                            as sender,
  p_t.full_name                            as traveler,
  u.email                                  as traveler_email,
  b.payment_status,
  (b.payment_amount / 100.0)               as paid_eur,
  (b.transfer_amount / 100.0)              as traveler_gets_eur,
  (b.platform_fee_amount / 100.0)          as jibly_keeps_eur,
  b.transfer_id is not null                as already_transferred,
  b.received_confirmed_at is not null      as delivered,
  -- How far this traveler got. These three read left to right: no identity,
  -- then no account, then an account Stripe won't pay yet.
  p_t.identity_verified_at is not null     as identity_done,
  p_t.stripe_account_id is not null        as payout_account_created,
  p_t.stripe_payouts_enabled               as traveler_can_be_paid,
  case
    when b.transfer_id is not null              then 'PAID OUT'
    when b.payment_status = 'refunded'          then 'refunded to sender'
    when b.payment_status = 'canceled'          then 'authorisation released'
    when b.payment_status = 'authorized'        then 'held on the card, not captured'
    when b.traveler_user_id is null             then 'NO TRAVELER ON THIS BOOKING'
    when b.received_confirmed_at is null        then 'captured, not delivered yet'
    when p_t.stripe_payouts_enabled is not true then 'CAPTURED, waiting on traveler payout setup'
    else 'captured and delivered, transfer pending'
  end                                      as where_the_money_is,
  b.payment_intent_id,
  b.created_at
from public.booking_intents b
left join public.profiles p_s on p_s.id = b.sender_id
left join public.profiles p_t on p_t.id = b.traveler_user_id
left join auth.users u        on u.id = b.traveler_user_id
where b.payment_status <> 'unpaid'
order by b.created_at desc;
