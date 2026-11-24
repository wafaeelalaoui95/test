import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { findUnfinishedPayments, sendUnfinishedPaymentEmail } from '@/lib/unfinished-payments';

/**
 * GET  /api/admin/unfinished-payments — people who started paying for a
 *      booking in the last 30 days and never finished, each with the email.
 * POST /api/admin/unfinished-payments { userId } — send that person's email.
 * Once per person, ever. See lib/unfinished-payments.ts.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const items = await findUnfinishedPayments(getAdminClient());
    return NextResponse.json({ items });
  } catch (e: any) {
    console.error('[admin/unfinished-payments]', e?.message);
    return NextResponse.json({ error: 'Lecture Stripe impossible' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId : null;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Re-checked at send time: they may have paid, or been emailed, since.
  const [item] = await findUnfinishedPayments(getAdminClient(), userId);
  if (!item) return NextResponse.json({ error: 'Plus d’actualité (paiement finalisé depuis ?)' }, { status: 409 });
  const res = await sendUnfinishedPaymentEmail(item);
  return res.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: res.reason ?? 'Envoi échoué' }, { status: 409 });
}
