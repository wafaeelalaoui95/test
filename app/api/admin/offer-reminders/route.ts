import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { findOfferReminders, sendOfferReminder } from '@/lib/offer-reminders';

/**
 * GET  /api/admin/offer-reminders — today's "a traveller is waiting for your
 *      answer" emails not yet sent, each with the exact email.
 * POST /api/admin/offer-reminders { requestId } — send one now.
 *
 * The noon cron sends these automatically; this is for sending one by hand
 * (before noon, or for an offer that came in after). Once sent, from either
 * side, it is never sent again. See lib/offer-reminders.ts.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const reminders = await findOfferReminders(getAdminClient());
  return NextResponse.json({ reminders });
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const requestId = typeof body?.requestId === 'string' ? body.requestId : null;
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });

  const admin = getAdminClient();
  // Re-checked at send time: the offer may have been answered since the list loaded.
  const [r] = await findOfferReminders(admin, requestId);
  if (!r) return NextResponse.json({ error: 'Plus d’actualité ou déjà envoyé' }, { status: 409 });
  if (!r.toEmail) return NextResponse.json({ error: 'Pas d’e-mail' }, { status: 409 });
  const ok = await sendOfferReminder(admin, r);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Envoi échoué ou déjà envoyé' }, { status: 502 });
}
