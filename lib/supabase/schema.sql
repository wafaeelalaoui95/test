-- ============================================================================
-- JIBLY — Supabase schema
-- ============================================================================
-- Run this entire file in the Supabase SQL Editor (one shot is fine).
-- It is idempotent: safe to re-run during development.
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- PROFILES
-- ============================================================================
-- One row per auth user, automatically created by a trigger on auth.users.
-- "id" mirrors auth.users.id.
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  avatar_url      text,
  phone           text,
  city            text,
  country         text,
  verification_level text not null default 'email' check (verification_level in ('none','email','id_verified','trusted')),
  rating          numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  trips_completed integer not null default 0 check (trips_completed >= 0),
  -- Set when the user anonymises (soft-deletes) their account. The profile row
  -- is kept so received reviews & closed-match history survive, but all PII is
  -- wiped and the auth.users row is e-mail-scrambled + banned. NULL = active.
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Idempotent add for existing databases (the create-table above only runs on a
-- fresh DB; this keeps already-deployed instances in sync).
alter table public.profiles add column if not exists deleted_at timestamptz;

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ============================================================================
-- TRAVELER TRIPS
-- ============================================================================
create table if not exists public.traveler_trips (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  departure_country     text not null,
  departure_city        text not null,
  arrival_country       text not null,
  arrival_city          text not null,
  departure_date        date not null,
  arrival_date          date,
  compensation_min      integer not null default 0 check (compensation_min >= 0),
  compensation_max      integer check (compensation_max is null or compensation_max >= compensation_min),
  available_weight_kg   numeric(5,2),
  available_space       text not null default 'pochette' check (available_space in ('enveloppe','pochette','petit_sac')),
  flight_time           text,
  notes                 text,
  status                text not null default 'open' check (status in ('draft','open','matched','in_transit','completed','cancelled')),
  created_at            timestamptz not null default now()
);

create index if not exists idx_traveler_trips_user on public.traveler_trips(user_id);
create index if not exists idx_traveler_trips_status on public.traveler_trips(status);
create index if not exists idx_traveler_trips_route on public.traveler_trips(departure_city, arrival_city);


-- ============================================================================
-- SHIPPING REQUESTS
-- ============================================================================
create table if not exists public.shipping_requests (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  item_title              text,
  item_category           text not null check (item_category in ('documents','cles','medicaments','petits_objets')),
  item_description        text not null,
  pickup_country          text not null,
  pickup_city             text not null,
  destination_country     text not null,
  destination_city        text not null,
  desired_delivery_date   date not null,
  budget                  integer not null check (budget >= 0),
  weight_kg               numeric(5,2),
  urgency_level           text not null default 'standard' check (urgency_level in ('standard','rapide','urgent')),
  prescription_url        text,
  status                  text not null default 'pending' check (status in ('draft','pending','matched','in_transit','delivered','cancelled','flagged')),
  created_at              timestamptz not null default now()
);

create index if not exists idx_shipping_requests_user on public.shipping_requests(user_id);
create index if not exists idx_shipping_requests_status on public.shipping_requests(status);
create index if not exists idx_shipping_requests_route on public.shipping_requests(pickup_city, destination_city);


-- ============================================================================
-- MATCHES
-- ============================================================================
create table if not exists public.matches (
  id                    uuid primary key default uuid_generate_v4(),
  traveler_trip_id      uuid not null references public.traveler_trips(id) on delete cascade,
  shipping_request_id   uuid not null references public.shipping_requests(id) on delete cascade,
  status                text not null default 'proposed' check (status in ('proposed','accepted','rejected','completed','cancelled')),
  agreed_compensation   integer,
  created_at            timestamptz not null default now(),
  unique(traveler_trip_id, shipping_request_id)
);

create index if not exists idx_matches_trip on public.matches(traveler_trip_id);
create index if not exists idx_matches_request on public.matches(shipping_request_id);


-- ============================================================================
-- MESSAGES
-- ============================================================================
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  match_id    uuid references public.matches(id) on delete cascade,
  message     text not null check (length(message) > 0 and length(message) <= 5000),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_messages_match on public.messages(match_id, created_at);
create index if not exists idx_messages_receiver on public.messages(receiver_id, created_at desc);


-- ============================================================================
-- REVIEWS
-- ============================================================================
create table if not exists public.reviews (
  id                uuid primary key default uuid_generate_v4(),
  reviewer_id       uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id  uuid not null references public.profiles(id) on delete cascade,
  match_id          uuid references public.matches(id) on delete set null,
  rating            integer not null check (rating >= 1 and rating <= 5),
  comment           text,
  created_at        timestamptz not null default now(),
  check (reviewer_id <> reviewed_user_id)
);

create index if not exists idx_reviews_reviewed on public.reviews(reviewed_user_id);


-- ============================================================================
-- REPORTS
-- ============================================================================
create table if not exists public.reports (
  id                uuid primary key default uuid_generate_v4(),
  reporter_id       uuid not null references public.profiles(id) on delete cascade,
  reported_user_id  uuid references public.profiles(id) on delete set null,
  target_type       text not null default 'user' check (target_type in ('user','shipping_request','traveler_trip','message')),
  target_id         uuid,
  reason            text not null,
  details           text,
  status            text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at        timestamptz not null default now()
);

create index if not exists idx_reports_status on public.reports(status);


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Strategy:
--   - profiles: everyone authenticated can READ (needed to display traveler names),
--               only owner can UPDATE.
--   - traveler_trips & shipping_requests: everyone authenticated can READ open ones;
--               only owner can INSERT/UPDATE/DELETE their own.
--   - matches: visible to both parties (request owner & trip owner).
--   - messages: visible only to sender & receiver.
--   - reviews: public read, only writable by reviewer.
--   - reports: only visible to admins (no select policy = denied for users); writable by any auth user.
-- ----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.traveler_trips      enable row level security;
alter table public.shipping_requests   enable row level security;
alter table public.matches             enable row level security;
alter table public.messages            enable row level security;
alter table public.reviews             enable row level security;
alter table public.reports             enable row level security;

-- ----- profiles -----
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ----- traveler_trips -----
drop policy if exists "trips_select_visible" on public.traveler_trips;
create policy "trips_select_visible" on public.traveler_trips
  for select using (
    status in ('open','matched','in_transit','completed')
    or auth.uid() = user_id
  );

drop policy if exists "trips_insert_own" on public.traveler_trips;
create policy "trips_insert_own" on public.traveler_trips
  for insert with check (auth.uid() = user_id);

drop policy if exists "trips_update_own" on public.traveler_trips;
create policy "trips_update_own" on public.traveler_trips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "trips_delete_own" on public.traveler_trips;
create policy "trips_delete_own" on public.traveler_trips
  for delete using (auth.uid() = user_id);

-- ----- shipping_requests -----
drop policy if exists "requests_select_visible" on public.shipping_requests;
create policy "requests_select_visible" on public.shipping_requests
  for select using (
    status in ('pending','matched','in_transit','delivered')
    or auth.uid() = user_id
  );

drop policy if exists "requests_insert_own" on public.shipping_requests;
create policy "requests_insert_own" on public.shipping_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists "requests_update_own" on public.shipping_requests;
create policy "requests_update_own" on public.shipping_requests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "requests_delete_own" on public.shipping_requests;
create policy "requests_delete_own" on public.shipping_requests
  for delete using (auth.uid() = user_id);

-- ----- matches -----
drop policy if exists "matches_select_parties" on public.matches;
create policy "matches_select_parties" on public.matches
  for select using (
    exists (
      select 1 from public.traveler_trips tt
      where tt.id = traveler_trip_id and tt.user_id = auth.uid()
    )
    or exists (
      select 1 from public.shipping_requests sr
      where sr.id = shipping_request_id and sr.user_id = auth.uid()
    )
  );

drop policy if exists "matches_insert_parties" on public.matches;
create policy "matches_insert_parties" on public.matches
  for insert with check (
    exists (
      select 1 from public.traveler_trips tt
      where tt.id = traveler_trip_id and tt.user_id = auth.uid()
    )
    or exists (
      select 1 from public.shipping_requests sr
      where sr.id = shipping_request_id and sr.user_id = auth.uid()
    )
  );

drop policy if exists "matches_update_parties" on public.matches;
create policy "matches_update_parties" on public.matches
  for update using (
    exists (
      select 1 from public.traveler_trips tt
      where tt.id = traveler_trip_id and tt.user_id = auth.uid()
    )
    or exists (
      select 1 from public.shipping_requests sr
      where sr.id = shipping_request_id and sr.user_id = auth.uid()
    )
  );

-- ----- messages -----
drop policy if exists "messages_select_parties" on public.messages;
create policy "messages_select_parties" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender" on public.messages
  for insert with check (auth.uid() = sender_id);

drop policy if exists "messages_update_receiver_read" on public.messages;
create policy "messages_update_receiver_read" on public.messages
  for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);

-- ----- reviews -----
drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all" on public.reviews
  for select using (true);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = reviewer_id);

-- ----- reports -----
drop policy if exists "reports_insert_any_auth" on public.reports;
create policy "reports_insert_any_auth" on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_id);


-- ============================================================================
-- STORAGE BUCKETS (run separately, see manual setup notes)
-- ============================================================================
-- Create a bucket named "avatars" (public) and "documents" (private) in the
-- Supabase dashboard under Storage. Then run the policies below.

-- Example policies (uncomment after creating buckets):
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
--   on conflict (id) do nothing;
-- create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
-- create policy "avatars_owner_write" on storage.objects for insert with check (
--   bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
-- );
