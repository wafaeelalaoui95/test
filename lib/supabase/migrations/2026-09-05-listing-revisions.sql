-- Let people edit and withdraw a listing, without losing what it said before.
--
-- A trip or a request could be created and then only cancelled — a typo in the
-- price meant deleting the listing and posting it again, which loses its age
-- and any interest it had attracted.
--
-- Editing something other people may have read is not the same as editing a
-- draft. Someone may have decided to travel on the strength of a 20 EUR
-- request that now says 5. So every edit keeps the previous version: the row
-- carries the current state, this table carries what it replaced.

create table if not exists public.listing_revisions (
  id           uuid primary key default uuid_generate_v4(),
  -- Which table the row belongs to. Two listing types, one history.
  listing_type text not null check (listing_type in ('traveler_trip', 'shipping_request')),
  listing_id   uuid not null,
  -- Who made the change. Kept even if they later delete their account: the
  -- point of a history is that it survives.
  edited_by    uuid references public.profiles(id) on delete set null,
  -- The row AS IT WAS, before this edit. Whole row rather than a diff: a diff
  -- is only readable next to the version it applies to, and storing both is
  -- how they drift apart.
  previous     jsonb not null,
  -- Which fields actually changed, so a reader doesn't have to compare two
  -- JSON blobs by eye.
  changed      text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists listing_revisions_listing_idx
  on public.listing_revisions (listing_type, listing_id, created_at desc);

-- Insert-only, and server-written. A history a user can edit is not a history.
alter table public.listing_revisions enable row level security;
revoke all on public.listing_revisions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- When a listing was last touched, and by whom it was withdrawn
-- ---------------------------------------------------------------------------
-- status already carries 'cancelled' on both tables, so withdrawing needs no
-- new state — but it does need a timestamp, or "cancelled" cannot be told from
-- "cancelled three weeks ago".

alter table public.traveler_trips
  add column if not exists updated_at   timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.shipping_requests
  add column if not exists updated_at   timestamptz,
  add column if not exists cancelled_at timestamptz;

-- Both are set by the server alongside the revision row. A client that could
-- write them could edit a listing and leave no trace of having done so.
revoke update (updated_at, cancelled_at) on public.traveler_trips
  from authenticated, anon;
revoke update (updated_at, cancelled_at) on public.shipping_requests
  from authenticated, anon;

-- Check: table exists and is empty.
select count(*) as revisions from public.listing_revisions;
