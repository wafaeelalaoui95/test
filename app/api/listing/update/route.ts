import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';
import {
  EDITABLE_FIELDS,
  applyListingEdit,
  guardListing,
  type ListingType,
} from '@/lib/listings';

/**
 * POST /api/listing/update
 * Body: { type: 'traveler_trip' | 'shipping_request', id: uuid, patch: {...} }
 *
 * Change a listing nobody has booked yet, keeping what it said before.
 *
 * Server-side because the history is: listing_revisions and the updated_at /
 * cancelled_at columns are revoked from the client role, so an edit cannot be
 * made without leaving a trace of having been made. A client that could write
 * its own history would not have one.
 */
const schema = z.object({
  type: z.enum(['traveler_trip', 'shipping_request']),
  id: z.string().uuid(),
  // Values are validated against the table's own constraints by Postgres —
  // dates, the category and space enums, the non-negative checks are all
  // declared there, and duplicating them here is how the two drift apart.
  // What this layer decides is WHICH fields may be touched at all.
  patch: z.record(z.unknown()),
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

  // Drop anything not on the allow-list rather than rejecting the whole
  // request: a client sending an extra field is a client bug, not an attack,
  // and failing the edit over it helps nobody.
  const allowed = EDITABLE_FIELDS[type];
  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(body.patch)) {
    if (allowed.includes(k)) patch[k] = v;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'nothing_to_change' }, { status: 400 });
  }

  const result = await applyListingEdit({
    type,
    listingId: body.id,
    userId: user.id,
    before: guard.row,
    patch,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, changed: result.changed });
}
