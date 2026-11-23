import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

/**
 * POST /api/unsubscribe?u=<userId>&t=<token>
 *
 * Stops the e-mails sent to every member (lib/broadcast.ts). Called by the
 * /desabonnement page's button, and directly by mail apps through the
 * List-Unsubscribe-Post header (RFC 8058 one-click). No sign-in needed: the
 * token is an HMAC of the user id (lib/unsubscribe.ts).
 *
 * POST only: link scanners in mail apps open every GET link, and must not
 * unsubscribe people by doing so. Booking and payment e-mails are unaffected.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') ?? '';
  const t = req.nextUrl.searchParams.get('t') ?? '';
  if (!verifyUnsubscribeToken(u, t)) {
    return NextResponse.json({ error: 'invalid_link' }, { status: 400 });
  }
  const { error } = await getAdminClient()
    .from('profiles')
    .update({ marketing_opt_out_at: new Date().toISOString() })
    .eq('id', u)
    .is('marketing_opt_out_at', null);
  if (error) {
    console.error('[unsubscribe] update failed:', error.message);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
