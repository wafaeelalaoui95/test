-- Migration: price bargaining (counter-offers between sender and traveller)
-- Date: 2026-11-23
--
-- Apply on the live Supabase database (SQL editor) BEFORE deploying the
-- matching app code: the app reads these columns. Idempotent — safe to re-run.
-- Requires 2026-11-23-guard-booking-price.sql (server-owned proposed_price).
--
-- What it adds (rules in lib/negotiation.ts):
--   booking_intents.original_price      the starting price (listed trip total,
--                                       or the traveller's first offer)
--   booking_intents.price_pending_by    who proposed the price on the table:
--                                       'sender' → traveller answers,
--                                       'traveler' → sender answers, null → none
--   booking_intents.sender_countered    each side gets ONE counter-proposal
--   booking_intents.traveler_countered
--   booking_intents.price_updated_at    when the price last changed
--   price_offers                        every price proposed, for the record
--                                       (and for disputes): who, how much, when
--
-- All of these are server-owned. A browser insert cannot set them (the trigger
-- below fills in safe values) and a browser update cannot change them.

begin;

alter table public.booking_intents add column if not exists original_price     numeric(10,2);
alter table public.booking_intents add column if not exists price_pending_by   text;
alter table public.booking_intents add column if not exists sender_countered   boolean not null default false;
alter table public.booking_intents add column if not exists traveler_countered boolean not null default false;
alter table public.booking_intents add column if not exists price_updated_at   timestamptz;

alter table public.booking_intents drop constraint if exists booking_intents_price_pending_by_check;
alter table public.booking_intents
  add constraint booking_intents_price_pending_by_check
  check (price_pending_by is null or price_pending_by in ('sender','traveler'));

-- Existing rows started at the price they carry.
update public.booking_intents set original_price = proposed_price where original_price is null;

create table if not exists public.price_offers (
  id                 uuid primary key default uuid_generate_v4(),
  booking_intent_id  uuid not null references public.booking_intents(id) on delete cascade,
  from_user          uuid references public.profiles(id) on delete set null,
  from_role          text not null check (from_role in ('sender','traveler')),
  amount_total       numeric(10,2) not null check (amount_total > 0),
  -- 'offer' = a sender's price below a listed trip, 'counter' = an answer
  kind               text not null default 'counter' check (kind in ('offer','counter')),
  created_at         timestamptz not null default now()
);
create index if not exists idx_price_offers_booking on public.price_offers(booking_intent_id);

alter table public.price_offers enable row level security;

-- The two parties may read their booking's history. Nobody writes from a
-- browser: the server routes insert with the service role.
drop policy if exists "price_offers_select_parties" on public.price_offers;
create policy "price_offers_select_parties" on public.price_offers
  for select using (
    exists (
      select 1 from public.booking_intents b
      where b.id = price_offers.booking_intent_id
        and (b.sender_id = auth.uid() or b.traveler_user_id = auth.uid())
    )
  );

-- Browser inserts and updates may not touch the bargaining state.
create or replace function public.booking_intents_guard_negotiation()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- A booking created from a browser is never mid-negotiation: it starts
    -- at the price it was created with.
    new.original_price     := new.proposed_price;
    new.price_pending_by   := null;
    new.sender_countered   := false;
    new.traveler_countered := false;
    new.price_updated_at   := null;
    return new;
  end if;
  if new.original_price     is distinct from old.original_price
  or new.price_pending_by   is distinct from old.price_pending_by
  or new.sender_countered   is distinct from old.sender_countered
  or new.traveler_countered is distinct from old.traveler_countered
  or new.price_updated_at   is distinct from old.price_updated_at then
    raise exception 'booking negotiation columns are server-owned';
  end if;
  -- Accepting a price the traveller has not been asked about would skip the
  -- negotiation: a pending counter is settled through the server routes only.
  if old.status = 'pending' and new.status = 'confirmed' and old.price_pending_by = 'traveler' then
    raise exception 'a counter-proposal is accepted by paying it';
  end if;
  return new;
end;
$$;

drop trigger if exists booking_intents_guard_negotiation_ins on public.booking_intents;
create trigger booking_intents_guard_negotiation_ins
  before insert on public.booking_intents
  for each row execute function public.booking_intents_guard_negotiation();

drop trigger if exists booking_intents_guard_negotiation_upd on public.booking_intents;
create trigger booking_intents_guard_negotiation_upd
  before update on public.booking_intents
  for each row execute function public.booking_intents_guard_negotiation();

commit;

-- Check after applying:
--   select id, proposed_price, original_price, price_pending_by from public.booking_intents order by created_at desc limit 5;
