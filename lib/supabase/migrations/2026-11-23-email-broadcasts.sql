-- Migration: e-mails sent to every member from /admin, and the way out of them
-- Date: 2026-11-23
--
-- Run in the Supabase SQL editor. Idempotent: safe to re-run.
--
-- /admin → "E-mail à tous" sends one e-mail (today: "ajoutez vos prochains
-- vols") to every account. That is not a transactional e-mail, and the privacy
-- policy (section on communications) promises an unsubscribe method in every
-- such message. So:
--
--   profiles.marketing_opt_out_at — set when someone clicks "se désabonner".
--     Null = still receives these e-mails. Booking, payment and security e-mails
--     are NOT affected by it: those are needed to run a booking.
--
--   email_broadcasts — one row per send to everyone. Lets /admin show what was
--     sent and when, and stops a second send while one is still running
--     (a double click must not e-mail every member twice).
--
-- The app refuses to send to everyone until this has run: without the opt-out
-- column it could not leave out the people who asked to stop.

begin;

alter table public.profiles
  add column if not exists marketing_opt_out_at timestamptz;

create table if not exists public.email_broadcasts (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null,
  subject         text not null,
  sent_by         uuid,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  recipient_count integer not null default 0,
  sent_count      integer not null default 0,
  failed_count    integer not null default 0
);

-- Server only (service role). No policy = no access for anon / authenticated.
alter table public.email_broadcasts enable row level security;

commit;
