import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { parisClock, findOfferReminders, sendOfferReminder } from '@/lib/offer-reminders';

/**
 * GET /api/cron/offer-reminders
 *
 * "A traveller is waiting for your answer", sent at noon Paris time on the
 * day of the sender's date (see lib/offer-reminders.ts).
 *
 * The cron runs hourly but only acts in the 12:00 hour — the time the operator
 * chose. An offer that arrives after noon on the day is not emailed
 * automatically; it shows up on /admin, where it can be sent by hand.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEND_HOUR = 12;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    console.error(
      '[cron/offer-reminders] rejected — CRON_SECRET %s, Authorization header %s',
      secret ? 'set' : 'MISSING in this environment',
      auth ? 'present but does not match' : 'absent'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { hour } = parisClock();
  if (hour !== SEND_HOUR) return NextResponse.json({ skipped: 'not noon in Paris', hour });

  const admin = getAdminClient();
  const due = await findOfferReminders(admin);
  let sent = 0;
  for (const r of due) if (await sendOfferReminder(admin, r)) sent += 1;
  return NextResponse.json({ candidates: due.length, sent });
}
