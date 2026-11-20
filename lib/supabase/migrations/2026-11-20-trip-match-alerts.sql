-- Trip match alerts — "someone is travelling on (or near) your route"
--
-- When a traveller publishes a trip, every open parcel request it could serve
-- gets a row here. Nothing is emailed at that point: the operator reads each
-- alert on /admin and either sends it or dismisses it. A sender hears about a
-- trip only after a human has looked at the pairing.
--
--   tier = 'exact'   same departure city, same arrival city (Fès → Paris for a Fès → Paris parcel)
--   tier = 'nearby'  same departure country, same arrival city (Agadir → Paris for a Fès → Paris parcel)
--
-- Service role only: RLS on with no policies, so no client can read or write.

create table if not exists public.trip_match_alerts (
  id           uuid primary key default uuid_generate_v4(),
  trip_id      uuid not null references public.traveler_trips(id) on delete cascade,
  request_id   uuid not null references public.shipping_requests(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  tier         text not null check (tier in ('exact','nearby')),
  status       text not null default 'pending' check (status in ('pending','sent','dismissed')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  unique (trip_id, request_id)
);

create index if not exists idx_trip_match_alerts_status on public.trip_match_alerts(status);

alter table public.trip_match_alerts enable row level security;
