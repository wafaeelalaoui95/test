import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/booking/confirm-pickup
 * Body: { bookingId: string, code: string }
 *
 * The SENDER (who hands the parcel over) confirms the handover by entering the
 * pickup code the TRAVELER shows them. Rationale: the receiving party (the
 * traveler) holds the code, and the handing party (the sender) enters it — so
 * the handover can only be recorded when both are physically present and the
 * traveler reveals their code. This prevents the traveler from later claiming
 * they never received the parcel.
 *
 * The code is verified server-side and pickup_confirmed_at is written with the
 * service-role client — the browser cannot set that column directly (RLS), so
 * the code can't be bypassed.
 *
 * Returns { ok: true } or { ok: false, reason } so the modal can map errors.
 */
const schema = z.object({
  bookingId: z.string().uuid(),
  code: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 });
  }

  const { data: intent } = await supabase
    .from('booking_intents')
    .select('id, pickup_code, sender_id, pickup_confirmed_at')
    .eq('id', body.bookingId)
    .maybeSingle();
  if (!intent) {
    return NextResponse.json({ ok: false, reason: 'unknown' }, { status: 404 });
  }

  // Only the sender (the party handing the parcel over) may confirm the
  // handover, by entering the code the traveler shows them.
  if (intent.sender_id !== user.id) {
    return NextResponse.json({ ok: false, reason: 'not_sender' }, { status: 403 });
  }

  if (intent.pickup_confirmed_at) {
    return NextResponse.json({ ok: true, already: true });
  }
  if (intent.pickup_code !== body.code) {
    return NextResponse.json({ ok: false, reason: 'invalid_code' }, { status: 400 });
  }

  const { error: updErr } = await getAdminClient()
    .from('booking_intents')
    .update({
      pickup_confirmed_at: new Date().toISOString(),
      pickup_confirmed_by: user.id,
    })
    .eq('id', body.bookingId);
  if (updErr) {
    console.error('[confirm-pickup] DB update failed:', updErr);
    return NextResponse.json({ ok: false, reason: 'unknown' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
