import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { findAudience, previewEmail, recentBroadcasts, sendOne, sendToAll } from '@/lib/broadcast';
import { formatName } from '@/lib/utils';

/**
 * GET  /api/admin/broadcast — how many members would get the "ajoutez vos
 *      prochains vols" e-mail, who is left out and why, the e-mail itself,
 *      and the last sends.
 * POST /api/admin/broadcast { mode: 'test' } — one copy to the operator.
 * POST /api/admin/broadcast { mode: 'all', expectedCount } — every member.
 *
 * See lib/broadcast.ts. Recipient e-mails are never returned, only counts.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const admin = getAdminClient();
  try {
    const audience = await findAudience(admin);
    return NextResponse.json({
      count: audience.recipients.length,
      skipped: audience.skipped,
      migrationReady: audience.migrationReady,
      template: previewEmail('Yasmine'),
      history: await recentBroadcasts(admin),
    });
  } catch (e: any) {
    console.error('[admin/broadcast] GET failed:', e?.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await getAdminContext();
  if (!isAdmin || !userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => null);
  const admin = getAdminClient();

  if (body?.mode === 'test') {
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data?.user?.email;
    if (!email) return NextResponse.json({ error: 'Pas d’e-mail sur votre compte' }, { status: 409 });
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', userId).maybeSingle();
    const firstName = formatName(profile?.full_name ?? '').split(' ')[0] || null;
    const ok = await sendOne({ userId, email, firstName });
    return ok
      ? NextResponse.json({ ok: true, to: email })
      : NextResponse.json({ error: 'Envoi échoué' }, { status: 502 });
  }

  if (body?.mode === 'all') {
    const expected = Number(body.expectedCount);
    if (!Number.isInteger(expected) || expected <= 0) {
      return NextResponse.json({ error: 'expectedCount required' }, { status: 400 });
    }
    const result = await sendToAll(admin, userId, expected);
    return result.ok
      ? NextResponse.json({ ok: true, row: result.row })
      : NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({ error: 'mode required' }, { status: 400 });
}
