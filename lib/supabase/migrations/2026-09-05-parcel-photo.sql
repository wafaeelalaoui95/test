-- An optional photo of the parcel, for the traveller to look at.
--
-- A traveller decides whether to carry a stranger's parcel from a category and
-- a line of text. Being able to see the thing answers the question the safety
-- rules keep asking them to judge — is this what it says it is — before they
-- have agreed to anything.
--
-- Optional on purpose. Requiring it would push away the honest sender with a
-- document to post and no good light, and it would not stop anyone determined
-- to mislead: a photo can be of something else entirely. It is one more signal,
-- not proof.

alter table public.shipping_requests
  add column if not exists photo_url text;

alter table public.booking_intents
  add column if not exists photo_url text;

-- ---------------------------------------------------------------------------
-- The column may only ever hold one of OUR uploads
-- ---------------------------------------------------------------------------
-- The value is produced by /api/parcel/photo, which checks the file's type and
-- size, and is then passed straight into the insert by the browser. Revoking
-- UPDATE is not enough on its own — the row is created client-side, and a
-- column revoke does not cover INSERT.
--
-- This matters because the photo is rendered on the other party's screen. An
-- unconstrained URL there is a way to make a traveller's browser fetch
-- anything the sender chooses: a tracking pixel that reports when they opened
-- the booking, or an image swapped for something else after they agreed.
--
-- The constraint deliberately checks the PATH and not the host, so it survives
-- a project or domain change; confining it to this bucket is what does the
-- work.
alter table public.shipping_requests
  drop constraint if exists shipping_requests_photo_url_check;
alter table public.shipping_requests
  add constraint shipping_requests_photo_url_check
  check (photo_url is null or photo_url like '%/storage/v1/object/public/parcel-photos/%');

alter table public.booking_intents
  drop constraint if exists booking_intents_photo_url_check;
alter table public.booking_intents
  add constraint booking_intents_photo_url_check
  check (photo_url is null or photo_url like '%/storage/v1/object/public/parcel-photos/%');

-- Changing it after the fact is server-only: the other party has already seen
-- what was there when they agreed.
revoke update (photo_url) on public.shipping_requests from authenticated, anon;
revoke update (photo_url) on public.booking_intents from authenticated, anon;

-- Check: both columns exist, nothing set yet.
select
  (select count(*) from public.shipping_requests where photo_url is not null) as requests_with_photo,
  (select count(*) from public.booking_intents  where photo_url is not null) as bookings_with_photo;
