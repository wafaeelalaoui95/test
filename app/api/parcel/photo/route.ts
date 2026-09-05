import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/parcel/photo   (multipart: photo)
 *
 * Store a photo of a parcel and return its URL, for the sender to attach to a
 * request or a booking.
 *
 * Uploaded BEFORE the row exists, unlike the delivery proof: the sender picks
 * the photo while filling the form, and for an instant booking the payment is
 * authorised before any booking row is created. So the file is keyed by user
 * and timestamp rather than by a parcel id, and the URL is passed into the
 * insert by the client. A check constraint on both tables confines the column
 * to this bucket, so a URL that did not come from here cannot be stored.
 *
 * Its own bucket rather than delivery-proofs, because the two have different
 * lives: a proof is evidence attached to a completed delivery and kept, a
 * parcel photo belongs to a listing that its owner may withdraw.
 */
const STORAGE_BUCKET = 'parcel-photos';
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Never trusted from the filename — an extension is whatever the uploader
// typed. Derived from the MIME type we already checked instead.
const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const photo = form.get('photo');
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: 'missing_photo' }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(photo.type)) {
    return NextResponse.json({ error: 'bad_format' }, { status: 400 });
  }

  const admin = getAdminClient();
  const ext = EXT_FOR_MIME[photo.type] ?? 'jpg';
  // Under the user's own id: it makes an orphaned upload attributable, and
  // lets everything belonging to a deleted account be found in one place.
  const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const bytes = await photo.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(filename, bytes, { contentType: photo.type, upsert: false });

  if (uploadErr) {
    console.error('[parcel/photo] upload failed:', uploadErr.message);
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(filename);

  return NextResponse.json({ ok: true, url: data.publicUrl });
}
