import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { requeueOpenTrips, autoSendExactAlerts } from '@/lib/match-alerts';

/**
 * GET /api/cron/match-alerts
 *
 * Hourly catch-up for the "a traveller is on your route" emails.
 *
 * Publishing a trip queues and sends at once (/api/trip/announce), which
 * misses a parcel posted AFTER the trip it could ride on, and any alert held
 * back by the one-email-per-parcel-per-day limit. This re-pairs every open
 * trip and sends whatever exact-route alerts are now due. "Nearby" alerts are
 * only queued — they wait for the operator on /admin.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    console.error(
      '[cron/match-alerts] rejected — CRON_SECRET %s, Authorization header %s',
      secret ? 'set' : 'MISSING in this environment',
      auth ? 'present but does not match' : 'absent'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const { queued } = await requeueOpenTrips(admin);
  const { sent } = await autoSendExactAlerts(admin);
  return NextResponse.json({ ok: true, queued, sent });
}
