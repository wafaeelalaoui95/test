-- Why a sender took their parcel off the market.
--
-- Cancelling a trip asks the traveller why, copies the reason onto every
-- parcel and writes to every sender. Deleting a parcel asked nothing at all:
-- two words of confirmation in small underlined text, and the listing was
-- gone. The asymmetry is not fair to the other side of the marketplace, and it
-- leaves us unable to answer the only question worth asking about churn —
-- did they stop needing it, or did we fail to find them anyone?
--
-- booking_intents already accepts 'sender_withdrew' and 'traveler_declined' in
-- its cancellation_reason (see 2026-09-14-trip-cancellation.sql); this adds
-- the sender's own vocabulary to the request itself.

alter table public.shipping_requests
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_note   text;

alter table public.shipping_requests
  drop constraint if exists shipping_requests_cancellation_reason_check;

alter table public.shipping_requests
  add constraint shipping_requests_cancellation_reason_check
  check (
    cancellation_reason is null
    or cancellation_reason in (
      'sent_another_way',    -- it travelled, just not with us
      'no_longer_needed',    -- the need went away
      'plans_changed',       -- dates or destination moved
      'no_traveller_found',  -- we failed to match them
      'other'
    )
  );

-- Server-written, like every other reason column. A client that could set it
-- could rewrite why a listing disappeared after the fact.
revoke update (cancellation_reason, cancellation_note) on public.shipping_requests
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Check 1: why parcels leave the market. 'no_traveller_found' growing is the
-- one that is about us rather than about them — it means supply, not churn.
-- ---------------------------------------------------------------------------
select
  cancellation_reason,
  count(*) as requests
from public.shipping_requests
where status = 'cancelled'
group by cancellation_reason
order by requests desc;

-- ---------------------------------------------------------------------------
-- Check 2: withdrawals that left a traveller hanging. Should be empty — a
-- request with a live proposal cannot be withdrawn, the sender has to decline
-- first so the traveller is actually told.
-- ---------------------------------------------------------------------------
select
  r.id             as request,
  r.item_title,
  r.cancelled_at,
  b.id             as live_booking,
  b.status         as booking_status
from public.shipping_requests r
join public.booking_intents b on b.shipping_request_id = r.id
where r.status = 'cancelled'
  and b.status <> 'cancelled'
order by r.cancelled_at desc;
