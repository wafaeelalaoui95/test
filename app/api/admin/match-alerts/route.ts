import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { buildMatchAlert, requeueOpenTrips, sendMatchAlert } from '@/lib/match-alerts';

/**
 * GET  /api/admin/match-alerts  — pending alerts, each with the exact email
 * POST /api/admin/match-alerts  { alertId, action: 'send' | 'dismiss' }
 *
 * The approval step for "a traveller near your route" emails. Exact-route
 * alerts go out on their own (autoSendExactAlerts); "nearby" ones reach a
 * sender only when the operator presses send here. The email is rebuilt at send
 * time from the same function as the preview, and refused if the pairing went
 * stale in between (trip cancelled, parcel already booked).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = getAdminClient();
  // Catch the pairings publishing a trip cannot see — see requeueOpenTrips.
  await requeueOpenTrips(admin);
  const { data: rows, error } = await admin
    .from('trip_match_alerts')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[admin/match-alerts] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const alerts = (await Promise.all((rows ?? []).map((a) => buildMatchAlert(admin, a)))).filter(Boolean);
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const alertId = typeof body?.alertId === 'string' ? body.alertId : null;
  const action = body?.action;
  if (!alertId || (action !== 'send' && action !== 'dismiss')) {
    return NextResponse.json({ error: 'alertId and action required' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: row } = await admin
    .from('trip_match_alerts')
    .select('*')
    .eq('id', alertId)
    .eq('status', 'pending')
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Already handled' }, { status: 409 });

  if (action === 'send') {
    const res = await sendMatchAlert(admin, row);
    if (res.ok) return NextResponse.json({ ok: true });
    const errors = {
      stale: ['Stale — dismiss it instead', 409],
      no_email: ['Sender has no email', 409],
      handled: ['Already handled', 409],
      send_failed: ['Send failed', 502],
    } as const;
    const [msg, status] = errors[res.reason];
    return NextResponse.json({ error: msg }, { status });
  }

  await admin
    .from('trip_match_alerts')
    .update({ status: 'dismissed', decided_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('status', 'pending');
  return NextResponse.json({ ok: true });
}
