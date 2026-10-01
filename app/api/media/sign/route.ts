import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import { isAdminUserId } from '@/lib/admin';

/**
 * POST /api/media/sign
 * Body: { url: string }  — a stored parcel photo or delivery proof URL
 *
 * Turn a stored URL into a short-lived one that only the people entitled to
 * see it can use.
 *
 * Both buckets are public. The filenames are unguessable, which is not the
 * same thing as private: a delivery proof can show somebody's front door, the
 * link never expires, it outlives the account that created it, and anyone who
 * ever receives it — forwarded, screenshotted, pulled from a browser history —
 * keeps it forever. Unguessable is a lock with no key rather than a lock.
 *
 * This route is the half of the fix that can ship on its own. createSignedUrl
 * works on a public bucket, so once every reader goes through here, flipping
 * the buckets to private in Supabase changes nothing for a legitimate viewer
 * and everything for anyone holding an old link. Done in the other order, it
 * would break every photo on the site.
 *
 * WHO MAY SEE WHAT, and the two answers differ on purpose:
 *   - parcel photos are part of a listing. Any signed-in user can already see
 *     the listing, so any signed-in user may see its photo.
 *   - delivery proofs are evidence about one transaction between two people.
 *     Only those two, or an operator, may see one.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PARCEL_BUCKET = 'parcel-photos';
const PROOF_BUCKET = 'delivery-proofs';
const BUCKETS: string[] = [PARCEL_BUCKET, PROOF_BUCKET];

/** Long enough to look at a photo, short enough that a leaked link is stale. */
const TTL_SECONDS = 60 * 60;

const schema = z.object({ url: z.string().min(1).max(2048) });

/**
 * Pull the bucket and object path back out of a stored URL.
 *
 * Only the public form is accepted. A caller handing us an already-signed URL,
 * a path from another bucket or anything with traversal in it gets nothing —
 * this function is the only thing standing between a string from a browser and
 * a service-role read of our storage.
 */
function parseStoredUrl(url: string): { bucket: string; path: string } | null {
  const marker = '/storage/v1/object/public/';
  const i = url.indexOf(marker);
  if (i < 0) return null;

  const rest = url.slice(i + marker.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;

  const bucket = rest.slice(0, slash);
  if (!BUCKETS.includes(bucket)) return null;

  let path: string;
  try {
    path = decodeURIComponent(rest.slice(slash + 1).split('?')[0]);
  } catch {
    return null;
  }
  if (!path || path.includes('..') || path.startsWith('/')) return null;

  return { bucket, path };
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const parsed = parseStoredUrl(body.url);
  if (!parsed) {
    return NextResponse.json({ error: 'not_ours' }, { status: 400 });
  }

  const admin = getAdminClient();

  if (parsed.bucket === PROOF_BUCKET && !isAdminUserId(user.id)) {
    // Matched on the stored URL rather than a booking id from the client: the
    // question is "may this person see THIS file", and the only honest way to
    // ask it is of the booking that actually holds the file.
    const { data: booking } = await admin
      .from('booking_intents')
      .select('sender_id, traveler_user_id, traveler_trip_id')
      .eq('delivery_proof_url', body.url)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    let allowed =
      booking.sender_id === user.id || booking.traveler_user_id === user.id;

    // Older bookings name the traveller only through the trip.
    if (!allowed && booking.traveler_trip_id) {
      const { data: trip } = await admin
        .from('traveler_trips')
        .select('user_id')
        .eq('id', booking.traveler_trip_id)
        .maybeSingle();
      allowed = trip?.user_id === user.id;
    }

    if (!allowed) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const { data, error } = await admin.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error('[media/sign] could not sign', parsed.bucket, error?.message);
    return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
