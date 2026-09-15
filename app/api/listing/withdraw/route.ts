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
/**
 * Why a sender takes a parcel off the market.
 *
 * Deliberately NOT shared with the trip reasons in /api/trip/cancel. "I sent
 * it another way" is meaningless for a flight, and "my flight was cancelled"
 * is meaningless for a parcel — one list covering both would force every
 * reader to pick from options that mostly do not apply, which is how a reason
 * field turns into everyone clicking the first item.
 */
const REQUEST_REASONS = [
  'sent_another_way',
  'no_longer_needed',
  'plans_changed',
  'no_traveller_found',
  'other',
] as const;

const schema = z.object({
  type: z.enum(['traveler_trip', 'shipping_request']),
  id: z.string().uuid(),
  reason: z.enum(REQUEST_REASONS).optional(),
  note: z.string().trim().max(500).optional(),
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
  const note = body.note?.trim() || null;

  // Required for a parcel, not for a trip. The reason codes above are the
  // sender's vocabulary and none of them fit a flight — a trip is cancelled
  // through /api/trip/cancel, which has its own list and its own refunds. The
  // trip branch here has no caller in the UI and is left as it was rather than
  // given a requirement nothing can satisfy.
  if (type === 'shipping_request') {
    if (!body.reason) {
      return NextResponse.json({ error: 'reason_required' }, { status: 400 });
    }
    if (body.reason === 'other' && !note) {
      return NextResponse.json({ error: 'note_required' }, { status: 400 });
    }
  }

  const guard = await guardListing(type, body.id, user.id);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.code }, { status: guard.status });
  }

  const { error } = await getAdminClient()
    .from(LISTING_TABLE[type])
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      ...(type === 'shipping_request'
        ? { cancellation_reason: body.reason, cancellation_note: note }
        : {}),
    })
    .eq('id', body.id);

  if (error) {
    console.error('[listing/withdraw] failed:', error.message);
    return NextResponse.json({ error: 'withdraw_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
