import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';

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

  const { data: intent } = await supabase
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

  const { data: trip } = await supabase
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
  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, bytes, { contentType: photo.type, upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename);
  const publicUrl = publicUrlData.publicUrl;

  const { error: updateErr } = await supabase
    .from('booking_intents')
    .update({
      delivery_proof_url: publicUrl,
      delivery_proof_uploaded_at: new Date().toISOString(),
      delivery_proof_receiver_name: receiverName,
      delivery_proof_notes: typeof notes === 'string' ? notes : null,
    })
    .eq('id', bookingIntentId);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}
