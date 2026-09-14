import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { deliveryProvedEmail } from '@/lib/email/templates';
import { AUTO_RELEASE_DAYS } from '@/lib/constants';
import { formatName } from '@/lib/utils';

const STORAGE_BUCKET = 'delivery-proofs';
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const bookingIntentId = form.get('bookingIntentId');
  const receiverName = form.get('receiverName');
  const notes = form.get('notes');
  const earlyReason = form.get('earlyReason');
  const photo = form.get('photo');

  if (typeof bookingIntentId !== 'string' || typeof receiverName !== 'string') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: 'Missing photo' }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Photo too large (max 8 MB).' }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(photo.type)) {
    return NextResponse.json({ error: 'Unsupported image format.' }, { status: 400 });
  }

  // Reads + writes go through the service-role client. We authorize the
  // caller ourselves just below (must be the trip's traveler), so bypassing
  // RLS here is safe — and it avoids depending on storage-bucket / table RLS
  // policies for this write path (which is what was making the upload fail).
  const admin = getAdminClient();

  const { data: intent } = await admin
    .from('booking_intents')
    .select('id, status, traveler_trip_id, delivery_proof_url')
    .eq('id', bookingIntentId)
    .maybeSingle();
  if (!intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (intent.status !== 'confirmed') {
    return NextResponse.json({ error: 'Booking not confirmed' }, { status: 400 });
  }
  if (intent.delivery_proof_url) {
    return NextResponse.json({ error: 'Proof already uploaded' }, { status: 400 });
  }

  const { data: trip } = await admin
    .from('traveler_trips')
    .select('user_id')
    .eq('id', intent.traveler_trip_id)
    .maybeSingle();
  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ext = photo.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filename = `${bookingIntentId}/${Date.now()}.${ext}`;

  const bytes = await photo.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(filename, bytes, { contentType: photo.type, upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: `storage: ${uploadErr.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = admin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename);
  const publicUrl = publicUrlData.publicUrl;

  const { error: updateErr } = await admin
    .from('booking_intents')
    .update({
      delivery_proof_url: publicUrl,
      delivery_proof_uploaded_at: new Date().toISOString(),
      delivery_proof_receiver_name: receiverName,
      delivery_proof_notes: typeof notes === 'string' ? notes : null,
      // Verbatim, non-editable record of the early-delivery reason (only set
      // when the traveler delivered before the flight date).
      delivery_early_reason:
        typeof earlyReason === 'string' && earlyReason.trim() ? earlyReason.trim() : null,
    })
    .eq('id', bookingIntentId);

  if (updateErr) {
    return NextResponse.json({ error: `db: ${updateErr.message}` }, { status: 500 });
  }

  // Start the sender's clock out loud.
  //
  // This proof is what lets /api/cron/auto-release pay the traveller in
  // AUTO_RELEASE_DAYS without anyone confirming. Money moving on a timer the
  // sender was never told about is indistinguishable, from their side, from
  // money going missing — so the timer is announced the moment it starts, with
  // the date it runs out and both ways to stop it.
  //
  // Non-fatal, like every other transactional send: the proof is uploaded and
  // the delivery is real whether or not Resend is having a good day.
  try {
    await tellSenderTheClockStarted(bookingIntentId);
  } catch (e: any) {
    console.error('[upload-proof] could not notify sender:', e?.message);
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}

async function tellSenderTheClockStarted(bookingIntentId: string) {
  const admin = getAdminClient();

  const { data: booking } = await admin
    .from('booking_intents')
    .select(
      'id, sender_id, traveler_user_id, item_title, pickup_city, destination_city, delivery_proof_receiver_name, delivery_proof_uploaded_at'
    )
    .eq('id', bookingIntentId)
    .maybeSingle();
  if (!booking) return;

  const { data: userData } = await admin.auth.admin.getUserById(booking.sender_id);
  const email = userData?.user?.email;
  if (!email) {
    console.warn('[upload-proof] no email for sender', booking.sender_id);
    return;
  }

  const [senderProfile, travelerProfile] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', booking.sender_id).maybeSingle(),
    booking.traveler_user_id
      ? admin.from('profiles').select('full_name').eq('id', booking.traveler_user_id).maybeSingle()
      : Promise.resolve({ data: null as any }),
  ]);

  const proofAt = booking.delivery_proof_uploaded_at
    ? new Date(booking.delivery_proof_uploaded_at)
    : new Date();
  const deadline = new Date(proofAt.getTime() + AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000);

  const first = (full: string | null | undefined) =>
    full ? formatName(full).split(' ')[0] : null;

  const template = deliveryProvedEmail({
    senderFirstName: first(senderProfile.data?.full_name),
    travelerFirstName: first(travelerProfile.data?.full_name),
    itemLabel: booking.item_title?.trim() || 'your parcel',
    pickupCity: booking.pickup_city,
    destinationCity: booking.destination_city,
    receiverName: booking.delivery_proof_receiver_name,
    deadline: new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(deadline),
    days: AUTO_RELEASE_DAYS,
    bookingId: booking.id,
  });

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
  if (error) console.error('[upload-proof] resend error:', error);
}
