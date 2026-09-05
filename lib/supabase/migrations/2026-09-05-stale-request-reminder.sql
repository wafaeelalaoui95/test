-- Remember that we already asked whether a request is still wanted.
--
-- listOpenRequests filters on desired_delivery_date >= today, so the day after
-- that date the request stops being shown to travellers — silently, with the
-- sender told nothing. They are left believing they are still on the market.
--
-- A daily sweep emails them on the day, while the listing is still visible and
-- changing the date still saves it. This column is what stops that email
-- arriving again every morning afterwards.

alter table public.shipping_requests
  add column if not exists date_reminder_sent_at timestamptz;

-- Written by the cron with the service-role key. Client-writable, it would be
-- a way to silence your own reminder, or to make someone else's fire again.
revoke update (date_reminder_sent_at) on public.shipping_requests
  from authenticated, anon;

-- Partial index over exactly what the sweep looks for: still open, never
-- reminded. Stays small however many requests are archived behind it.
create index if not exists shipping_requests_needs_reminder_idx
  on public.shipping_requests (desired_delivery_date)
  where status = 'pending' and date_reminder_sent_at is null;

-- Check: who would be emailed by the next run. Requests past their date, still
-- pending, with no booking against them, never reminded.
select
  r.id,
  r.item_title,
  r.pickup_city || ' -> ' || r.destination_city as route,
  r.desired_delivery_date,
  r.budget
from public.shipping_requests r
where r.status = 'pending'
  and r.date_reminder_sent_at is null
  and r.desired_delivery_date <= current_date
  and not exists (
    select 1 from public.booking_intents b
    where b.shipping_request_id = r.id and b.status <> 'cancelled'
  );
