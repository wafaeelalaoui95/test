import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { buildMatchAlert } from '@/lib/match-alerts';

/**
 * GET  /api/admin/match-alerts  — pending alerts, each with the exact email
 * POST /api/admin/match-alerts  { alertId, action: 'send' | 'dismiss' }
 *
 * The approval step for "a traveller is on your route" emails. Nothing reaches
 * a sender until the operator presses send here. The email is rebuilt at send
 * time from the same function as the preview, and refused if the pairing went
 * stale in between (trip cancelled, parcel already booked).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = getAdminClient();
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
    const alert = await buildMatchAlert(admin, row);
    if (!alert || alert.stale) {
      return NextResponse.json({ error: 'Stale — dismiss it instead' }, { status: 409 });
    }
    if (!alert.toEmail) return NextResponse.json({ error: 'Sender has no email' }, { status: 409 });

    // Claim the row before sending, so a double click cannot email twice.
    const { data: claimed } = await admin
      .from('trip_match_alerts')
      .update({ status: 'sent', decided_at: new Date().toISOString() })
      .eq('id', alertId)
      .eq('status', 'pending')
      .select('id');
    if (!claimed?.length) return NextResponse.json({ error: 'Already handled' }, { status: 409 });

    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: alert.toEmail,
        subject: alert.template.subject,
        html: alert.template.html,
        text: alert.template.text,
      });
    } catch (e: any) {
      console.error('[admin/match-alerts] send failed:', e?.message);
      await admin
        .from('trip_match_alerts')
        .update({ status: 'pending', decided_at: null })
        .eq('id', alertId);
      return NextResponse.json({ error: 'Send failed' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  await admin
    .from('trip_match_alerts')
    .update({ status: 'dismissed', decided_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('status', 'pending');
  return NextResponse.json({ ok: true });
}
