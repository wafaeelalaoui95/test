import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient, getServerClient } from '@/lib/supabase/server';
import { LISTING_TABLE, guardListing, type ListingType } from '@/lib/listings';

/**
 * POST /api/listing/withdraw
 * Body: { type: 'traveler_trip' | 'shipping_request', id: uuid }
 *
 * Take a listing down. Nothing is deleted: status becomes 'cancelled' and
 * cancelled_at records when, so the row and its history stay readable.
 *
 * The UI says "Supprimer" / "Delete", which is the word people expect for
 * removing their own listing, while the row is kept — because it is what
 * answers a dispute months later, and because a booking that once pointed at
 * it would otherwise dangle. The two are not in conflict: deleting a listing
 * is not the same act as erasing an account, which /api/account/delete
 * handles and which does scrub personal data.
 *
 * Only for listings nobody has booked. A listing with a booking is cancelled
 * through the booking flow, which has to release the sender's money too.
 */
const schema = z.object({
  type: z.enum(['traveler_trip', 'shipping_request']),
  id: z.string().uuid(),
});

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

  const type = body.type as ListingType;

  const guard = await guardListing(type, body.id, user.id);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.code }, { status: guard.status });
  }

  const { error } = await getAdminClient()
    .from(LISTING_TABLE[type])
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', body.id);

  if (error) {
    console.error('[listing/withdraw] failed:', error.message);
    return NextResponse.json({ error: 'withdraw_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
