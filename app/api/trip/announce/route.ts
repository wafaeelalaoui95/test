import { NextResponse } from 'next/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import { queueMatchAlertsForTrip } from '@/lib/match-alerts';

/**
 * POST /api/trip/announce  { tripId }
 *
 * Called by /voyager right after a trip is published. Queues "a traveller is
 * on your route" alerts for waiting senders — it sends nothing. The operator
 * approves each alert on /admin (see lib/match-alerts.ts).
 *
 * Only the trip's own traveller can call it, so nobody can make Jibly queue
 * alerts for a trip that is not theirs.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tripId = typeof body?.tripId === 'string' ? body.tripId : null;
  if (!tripId) return NextResponse.json({ ok: false, reason: 'missing_fields' });

  const admin = getAdminClient();
  const { data: trip } = await admin
    .from('traveler_trips')
    .select('user_id')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 });
  }

  const { queued } = await queueMatchAlertsForTrip(admin, tripId);
  return NextResponse.json({ ok: true, queued });
}
