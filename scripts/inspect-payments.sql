-- Where is the money for every booking that has been paid?
--
-- Answers, per booking: what the sender paid, what the traveler is owed, and
-- whether it has left the Jibly balance yet. Read-only.

select
  b.id                                     as booking,
  p_s.full_name                            as sender,
  p_t.full_name                            as traveler,
  b.status,
  b.payment_status,
  (b.payment_amount / 100.0)               as paid_eur,
  (b.transfer_amount / 100.0)              as traveler_gets_eur,
  (b.platform_fee_amount / 100.0)          as jibly_keeps_eur,
  b.pickup_confirmed_at is not null        as picked_up,
  b.received_confirmed_at is not null      as delivered,
  p_t.stripe_payouts_enabled               as traveler_can_be_paid,
  case
    when b.transfer_id is not null              then 'PAID OUT'
    when b.payment_status = 'refunded'          then 'refunded to sender'
    when b.payment_status = 'canceled'          then 'authorisation released'
    when b.payment_status = 'authorized'        then 'held on the card, not captured'
    when b.payment_status = 'captured'
     and p_t.stripe_payouts_enabled is not true then 'CAPTURED, waiting on traveler payout setup'
    when b.payment_status = 'captured'          then 'captured, transfer pending'
    else b.payment_status
  end                                      as where_the_money_is,
  b.payment_intent_id,
  b.created_at
from public.booking_intents b
left join public.profiles p_s on p_s.id = b.sender_id
left join public.profiles p_t on p_t.id = b.traveler_user_id
where b.payment_status <> 'unpaid'
order by b.created_at desc;
