import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import {
  attestationStatement,
  prohibitedPolicyDigest,
  PROHIBITED_POLICY_VERSION,
  type AttestationKind,
} from '@/lib/attestations';

/**
 * POST /api/attestation
 * Body: { bookingIntentId: uuid, kind: 'sender_certification' | 'traveler_inspection', locale: 'fr' | 'en' }
 *
 * Record what one party declared about a parcel.
 *
 * Almost nothing here comes from the request. The client says WHICH booking
 * and WHICH declaration, in which language, and that is all it is trusted
 * with — the statement text, the policy version, the parcel snapshot and the
 * timestamp are all resolved server-side. A declaration whose wording or whose
 * date the signer could choose would be worth nothing the first time anyone
 * looked at it seriously.
 *
 * Idempotent by unique index on (booking, kind): a double-tap, a retry or a
 * refresh cannot produce a second, differently-worded copy of the same oath.
 * The first one stands — later is not better here, because the first is the
 * one made at the moment the person actually looked at the parcel.
 */
const schema = z.object({
  bookingIntentId: z.string().uuid(),
  kind: z.enum(['sender_certification', 'traveler_inspection']),
  locale: z.enum(['fr', 'en']),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const admin = getAdminClient();

  const { data: booking } = await admin
    .from('booking_intents')
    .select(
      'id, sender_id, traveler_user_id, traveler_trip_id, item_category, item_title, item_description, photo_url'
    )
    .eq('id', body.bookingIntentId)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Only the party the declaration is about may make it. A sender cannot
  // certify that the traveller inspected anything, and a traveller cannot
  // certify the contents of somebody else's parcel — an attestation signed by
  // the wrong person is worse than none, because it looks like evidence.
  const kind = body.kind as AttestationKind;
  const role: 'sender' | 'traveler' = kind === 'sender_certification' ? 'sender' : 'traveler';

  if (role === 'sender' && booking.sender_id !== user.id) {
    return NextResponse.json({ error: 'not_your_parcel' }, { status: 403 });
  }
  if (role === 'traveler') {
    let isTraveler = booking.traveler_user_id === user.id;
    // Older bookings name the traveller only through the trip.
    if (!isTraveler && booking.traveler_trip_id) {
      const { data: trip } = await admin
        .from('traveler_trips')
        .select('user_id')
        .eq('id', booking.traveler_trip_id)
        .maybeSingle();
      if (trip?.user_id === user.id) isTraveler = true;
    }
    if (!isTraveler) {
      return NextResponse.json({ error: 'not_your_trip' }, { status: 403 });
    }
  }

  // What the person read, rendered by the same function the screen uses.
  const itemLabel = booking.item_title?.trim() || booking.item_category || null;
  const statement = attestationStatement(kind, body.locale, itemLabel);

  // x-forwarded-for is a list when proxies chain; the client is the first.
  const ipHeader = req.headers.get('x-forwarded-for') ?? '';
  const ip = ipHeader.split(',')[0]?.trim() || null;

  const { data: inserted, error } = await admin
    .from('booking_attestations')
    .insert({
      booking_intent_id: booking.id,
      user_id: user.id,
      role,
      kind,
      statement_text: statement,
      statement_locale: body.locale,
      policy_version: PROHIBITED_POLICY_VERSION,
      policy_digest: prohibitedPolicyDigest(),
      // The parcel as it stands right now. Snapshotted rather than joined —
      // "accurately described" is only meaningful next to the description that
      // was actually sworn to, and descriptions are editable.
      item_category: booking.item_category,
      item_title: booking.item_title,
      item_description: booking.item_description,
      item_photo_url: booking.photo_url,
      ip,
      user_agent: req.headers.get('user-agent'),
    })
    .select('id, created_at')
    .maybeSingle();

  if (error) {
    // 23505 = unique violation: this party already declared this. Not an error
    // from the caller's point of view — the record exists, which is what they
    // were asking for.
    if ((error as any).code === '23505') {
      return NextResponse.json({ ok: true, alreadyRecorded: true });
    }
    console.error('[attestation] insert failed:', error.message);
    return NextResponse.json({ error: 'record_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted?.id ?? null,
    recordedAt: inserted?.created_at ?? null,
    statement,
    policyVersion: PROHIBITED_POLICY_VERSION,
  });
}
