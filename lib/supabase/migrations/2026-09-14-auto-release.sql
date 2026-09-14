-- A proved delivery completes on its own after 3 days, unless it is contested.
--
-- The traveller is paid when the recipient confirms receipt with the delivery
-- code, and only then: settle-payouts requires received_confirmed_at. So a
-- sender who never confirms — lost the code, on holiday, stopped replying, or
-- simply worked out that not confirming costs them nothing — left the
-- traveller unpaid with nothing in the system that would ever change it.
--
-- Now the clock can finish the job instead. What it needs is a way to say
-- "this was completed by the clock, not by a person", which is what this
-- column is for.

-- ---------------------------------------------------------------------------
-- Completed by the clock
-- ---------------------------------------------------------------------------
-- Deliberately NOT written into received_confirmed_at. That column means a
-- human confirmed the parcel arrived, and it is the evidence a dispute turns
-- on months later. Filling it from a cron would forge exactly the record we
-- would then be relying on. Two columns, two meanings: one says somebody
-- confirmed, the other says nobody objected.

alter table public.booking_intents
  add column if not exists auto_released_at timestamptz;

-- Server-written. A client that could set this could pay itself out without a
-- confirmation, which is the whole thing the delivery code exists to prevent.
revoke update (auto_released_at) on public.booking_intents
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- What the daily sweep looks for
-- ---------------------------------------------------------------------------
-- Proof uploaded, nobody confirmed, nobody released it yet. The date predicate
-- stays out of the index (now() is not immutable, so it cannot live in a
-- partial index) and is applied by the query.

create index if not exists booking_intents_awaiting_auto_release_idx
  on public.booking_intents (delivery_proof_uploaded_at)
  where payment_status = 'captured'
    and transfer_id is null
    and received_confirmed_at is null
    and auto_released_at is null
    and delivery_proof_uploaded_at is not null;

-- ---------------------------------------------------------------------------
-- Check 1: what the next run would release. Everything here is a traveller
-- who has shown proof, waited three days, and been neither confirmed nor
-- contested.
-- ---------------------------------------------------------------------------
select
  b.id                             as booking,
  b.delivery_proof_uploaded_at     as proved_at,
  (b.payment_amount / 100.0)       as eur,
  ps.full_name                     as sender,
  pt.full_name                     as traveler
from public.booking_intents b
left join public.profiles ps on ps.id = b.sender_id
left join public.profiles pt on pt.id = b.traveler_user_id
where b.payment_status = 'captured'
  and b.transfer_id is null
  and b.received_confirmed_at is null
  and b.auto_released_at is null
  and b.status = 'confirmed'
  and b.archived_at is null
  and b.delivery_proof_uploaded_at is not null
  and b.delivery_proof_uploaded_at <= now() - interval '3 days'
  and not exists (
    select 1 from public.disputes d
    where d.booking_intent_id = b.id
      and d.status not in ('resolved', 'dismissed')
  )
order by b.delivery_proof_uploaded_at;

-- ---------------------------------------------------------------------------
-- Check 2: money stuck for want of a confirmation. This is the backlog the
-- sweep exists to drain — rows older than three days here will be released on
-- the next run, and anything that stays is being held by an open dispute.
-- ---------------------------------------------------------------------------
select
  count(*)                                  as bookings,
  round(sum(b.payment_amount) / 100.0, 2)   as eur_held,
  min(b.delivery_proof_uploaded_at)         as oldest_proof
from public.booking_intents b
where b.payment_status = 'captured'
  and b.transfer_id is null
  and b.received_confirmed_at is null
  and b.auto_released_at is null
  and b.delivery_proof_uploaded_at is not null;
