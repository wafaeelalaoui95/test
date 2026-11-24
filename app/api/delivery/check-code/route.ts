import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/delivery/check-code { bookingIntentId, code }
 *
 * First step of « J'ai livré »: the traveller types the code the recipient
 * gives them, BEFORE the early-delivery questions and the photo. This only
 * checks it — nothing is written, no money moves. The same code is sent to
 * /api/confirm-receipt once the photo is up, which checks it again and
 * releases the payment.
 *
 * Returns { ok: true } or { ok: false, reason } with the same reasons as
 * /api/confirm-receipt (invalid_code, not_traveler, already_confirmed).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerClient().auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: 'unknown' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const bookingIntentId = typeof body?.bookingIntentId === 'string' ? body.bookingIntentId : null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!bookingIntentId || !code) return NextResponse.json({ ok: false, reason: 'unknown' }, { status: 400 });

  const admin = getAdminClient();
  const { data: intent } = await admin
    .from('booking_intents')
    .select('id, status, traveler_user_id, traveler_trip_id, delivery_code, received_confirmed_at')
    .eq('id', bookingIntentId)
    .maybeSingle();
  if (!intent) return NextResponse.json({ ok: false, reason: 'unknown' }, { status: 404 });

  let travelerId: string | null = intent.traveler_user_id ?? null;
  if (!travelerId && intent.traveler_trip_id) {
    const { data: trip } = await admin
      .from('traveler_trips')
      .select('user_id')
      .eq('id', intent.traveler_trip_id)
      .maybeSingle();
    travelerId = trip?.user_id ?? null;
  }
  if (travelerId !== user.id) return NextResponse.json({ ok: false, reason: 'not_traveler' }, { status: 403 });
  if (intent.received_confirmed_at) return NextResponse.json({ ok: false, reason: 'already_confirmed' });
  if (intent.status !== 'confirmed') return NextResponse.json({ ok: false, reason: 'unknown' });
  if (intent.delivery_code && intent.delivery_code !== code) {
    return NextResponse.json({ ok: false, reason: 'invalid_code' });
  }
  return NextResponse.json({ ok: true });
}
