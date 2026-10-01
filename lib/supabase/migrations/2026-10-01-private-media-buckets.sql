-- Close the parcel-photo and delivery-proof buckets.
--
-- Both have been public since they were created. The filenames are
-- unguessable, which is not privacy: a delivery proof can show somebody's
-- front door, the link never expires, it outlives the account that created it,
-- and anyone who ever comes by one — forwarded, screenshotted, lifted from a
-- browser history — keeps it for good.
--
-- RUN THIS ONLY AFTER the deploy that adds /api/media/sign. Every reader now
-- goes through that route, which mints a one-hour signed URL after checking
-- who is asking: any signed-in user may see a parcel photo, because it is part
-- of a listing they can already browse, but only the two parties to a booking
-- (or an operator) may see its delivery proof.
--
-- Run in the other order and every photo on the site breaks. Run in this order
-- and a legitimate viewer sees no difference at all, while every link that has
-- already escaped stops working.

update storage.buckets
set public = false
where id in ('parcel-photos', 'delivery-proofs');

-- No storage policies are needed alongside this.
--
-- Uploads are performed by the service role in /api/parcel/photo and
-- /api/delivery/upload-proof, and signed URLs are minted by the service role
-- in /api/media/sign. Both bypass storage RLS, so there is no client that
-- needs a grant — which is the point: after this, nothing reaches these files
-- without passing through a route that decides whether it should.

-- Check it took:
--   select id, public from storage.buckets
--   where id in ('parcel-photos', 'delivery-proofs');
--
-- And confirm the old links are dead by opening a stored URL in a logged-out
-- browser. It should now be refused rather than render.
