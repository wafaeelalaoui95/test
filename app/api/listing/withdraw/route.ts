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
 * The word in the UI is "withdraw", not "delete", because that is what
 * happens — and because someone who believes they deleted their data and later
 * finds the row is right to be annoyed. What the row holds is also what
 * answers a dispute months later, which is why it stays.
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
