-- Migration: let a traveller pick up / drop off in nearby cities
-- Date: 2026-11-24
--
-- Run in the Supabase SQL editor. Idempotent: safe to re-run.
--
-- On /voyager a traveller can tick "I can pick up / drop off in nearby cities"
-- and add cities around their departure and arrival. A sender in one of those
-- cities then sees the trip as a match for their route, not as a "nearby"
-- fallback.
--
-- The app only sends these columns when the traveller added a city, so trips
-- without extra cities keep publishing before this runs. A trip WITH extra
-- cities fails to publish until it runs: run it before announcing the feature.

begin;

alter table public.traveler_trips
  add column if not exists extra_departure_cities text[] not null default '{}',
  add column if not exists extra_arrival_cities   text[] not null default '{}';

commit;
