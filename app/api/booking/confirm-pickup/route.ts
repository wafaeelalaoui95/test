import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { pickupConfirmedSenderEmail } from '@/lib/email/templates';
import { formatName } from '@/lib/utils';

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
 * This route is also where the SENDER's delivery code is released, by email.
 * Booking no longer hands both parties a code at once: testers who received
 * two codes days apart from the handover arrived at it holding four between
 * them and could not tell which was which. So the traveller gets the pickup
 * code at booking, the sender gets nothing, and the delivery code is sent from
 * here — at the handover, when it starts to matter and there is exactly one
 * live code in the booking at any time.
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
    .select(
      'id, pickup_code, sender_id, pickup_confirmed_at, delivery_code, traveler_user_id, pickup_city, destination_city'
    )
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

  // The traveller must have declared they inspected the parcel before the
  // handover can be recorded. Enforced here rather than trusted to the UI
  // because this is the only server-side moment that stands between "somebody
  // ticked a box" and "a parcel went onto an aircraft" — and the declaration
  // is worthless as evidence if it can be skipped by anyone who does not go
  // through the modal. The traveller's screen writes it when they reveal the
  // code, so in practice this is already satisfied by the time the sender
  // types it in.
  const { count: inspected } = await getAdminClient()
    .from('booking_attestations')
    .select('id', { count: 'exact', head: true })
    .eq('booking_intent_id', body.bookingId)
    .eq('kind', 'traveler_inspection');

  if (!inspected) {
    return NextResponse.json(
      { ok: false, reason: 'inspection_missing' },
      { status: 409 }
    );
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

  // The parcel is on its way — release the sender's delivery code now.
  //
  // This is the second half of the one-code-at-a-time split: at booking the
  // traveller gets the pickup code and the sender gets nothing, so the pair
  // never hold two live codes between them. The code lands the moment it
  // starts to matter, and while the sender is still standing next to the
  // traveller and can say out loud who will be collecting at the other end.
  //
  // Sent server-side, and failure never fails the request: the handover IS
  // recorded above, and the sender can always read the code off /me, where it
  // now appears for the first time (gated on pickup_confirmed_at). A parcel
  // that has changed hands must not be un-confirmed because Resend was down.
  try {
    const admin = getAdminClient();
    const { data: userData } = await admin.auth.admin.getUserById(intent.sender_id);
    const email = userData?.user?.email;

    if (email && intent.delivery_code) {
      const ids = [intent.sender_id, intent.traveler_user_id].filter(
        (v): v is string => !!v
      );
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);

      const firstName = (id: string | null) => {
        if (!id) return null;
        const name = profiles?.find((p) => p.id === id)?.full_name;
        return name ? formatName(name).split(' ')[0] : null;
      };

      const template = pickupConfirmedSenderEmail({
        senderFirstName: firstName(intent.sender_id),
        travelerFirstName: firstName(intent.traveler_user_id),
        pickupCity: intent.pickup_city,
        destinationCity: intent.destination_city,
        code: intent.delivery_code,
      });

      const { error: sendErr } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      if (sendErr) {
        console.error('[confirm-pickup] delivery-code email failed for', body.bookingId, sendErr);
      }
    } else {
      console.warn(
        '[confirm-pickup] no delivery-code email for %s — %s',
        body.bookingId,
        !email ? 'sender has no email' : 'booking has no delivery_code'
      );
    }
  } catch (e: any) {
    console.error('[confirm-pickup] delivery-code email threw for', body.bookingId, e?.message);
  }

  return NextResponse.json({ ok: true });
}
