-- A cancelled trip has to say why, and has to leave a trail on every parcel.
--
-- Cancelling a trip used to be a client-side write: the trip row flipped to
-- 'cancelled', every booking on it flipped to 'cancelled', and a best-effort
-- fetch tried to release any authorisation. Nothing recorded WHY, nothing was
-- refunded once the money had been captured, and the sender was told nothing
-- at all — their parcel simply moved into a bucket labelled "refusée".
--
-- The columns here are what /api/trip/cancel writes. They exist so that three
-- questions have answers months later: why did this trip stop, when did this
-- parcel stop with it, and was the sender's money actually returned.

-- ---------------------------------------------------------------------------
-- Why the trip was cancelled
-- ---------------------------------------------------------------------------
-- A free-text-only reason would be unanalysable, and a code-only reason cannot
-- carry "my connection was cancelled and the airline rebooked me for Tuesday".
-- Both: a code to count, a note to read.

alter table public.traveler_trips
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_note   text;

alter table public.traveler_trips
  drop constraint if exists traveler_trips_cancellation_reason_check;

alter table public.traveler_trips
  add constraint traveler_trips_cancellation_reason_check
  check (
    cancellation_reason is null
    or cancellation_reason in (
      'flight_cancelled',   -- the airline cancelled or rescheduled
      'plans_changed',      -- no longer travelling
      'no_space',           -- travelling, but cannot carry after all
      'safety_concern',     -- uncomfortable with a parcel or a person
      'other'
    )
  );

-- ---------------------------------------------------------------------------
-- Why each parcel stopped
-- ---------------------------------------------------------------------------
-- Denormalised onto the booking on purpose. The reason is copied from the trip
-- at the moment of cancellation rather than read back through traveler_trip_id,
-- because that FK is `on delete set null`: a traveller who later deletes their
-- account takes the explanation with them, and the sender's own record of what
-- happened to their parcel should not depend on the other party still existing.

alter table public.booking_intents
  add column if not exists cancelled_at         timestamptz,
  add column if not exists cancelled_by         uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_reason  text,
  add column if not exists cancellation_note    text;

alter table public.booking_intents
  drop constraint if exists booking_intents_cancellation_reason_check;

alter table public.booking_intents
  add constraint booking_intents_cancellation_reason_check
  check (
    cancellation_reason is null
    or cancellation_reason in (
      'flight_cancelled', 'plans_changed', 'no_space', 'safety_concern', 'other',
      -- Cancellations that are not a trip cancellation: kept in the same column
      -- so "why did this booking end" has one place to look.
      'traveler_declined', 'sender_withdrew'
    )
  );

-- Server-written, all four. A client that could set these could cancel someone
-- else's parcel and attribute it to them, or quietly rewrite the reason after
-- the fact — and the reason is the part the sender is shown.
revoke update (cancelled_at, cancelled_by, cancellation_reason, cancellation_note)
  on public.booking_intents from authenticated, anon;
revoke update (cancellation_reason, cancellation_note)
  on public.traveler_trips from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Money that a cancellation owes back
-- ---------------------------------------------------------------------------
-- /api/trip/cancel refunds captured bookings as it cancels them, but a Stripe
-- failure must never be the reason a sender is left uninformed — so the parcel
-- is cancelled and the sender emailed regardless, and the unreturned money
-- shows up here instead of being lost in a log line.
--
-- cancelled + still captured + nothing refunded = someone is owed their money.

create index if not exists booking_intents_refund_owed_idx
  on public.booking_intents (cancelled_at)
  where status = 'cancelled'
    and payment_status = 'captured'
    and refunded_at is null;

-- ---------------------------------------------------------------------------
-- Check 1: anything currently owed a refund. Should be empty.
-- ---------------------------------------------------------------------------
select
  b.id                          as booking,
  b.cancelled_at,
  b.cancellation_reason,
  (b.payment_amount / 100.0)    as owed_eur,
  p.full_name                   as sender
from public.booking_intents b
left join public.profiles p on p.id = b.sender_id
where b.status = 'cancelled'
  and b.payment_status = 'captured'
  and b.refunded_at is null
order by b.cancelled_at desc;

-- ---------------------------------------------------------------------------
-- Check 2: why trips get cancelled. Empty until the first cancellation lands.
-- ---------------------------------------------------------------------------
select
  cancellation_reason,
  count(*) as trips
from public.traveler_trips
where status = 'cancelled'
group by cancellation_reason
order by trips desc;
