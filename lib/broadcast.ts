import type { SupabaseClient } from '@supabase/supabase-js';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { tripReminderBroadcastEmail } from '@/lib/email/templates';
import { unsubscribeApiUrl, unsubscribePageUrl } from '@/lib/unsubscribe';
import { formatName } from '@/lib/utils';

// =============================================================================
// E-mail to every member — "ajoutez vos prochains vols"
// =============================================================================
// Sent by hand from /admin → "E-mail à tous". Never by a cron.
//
// Who gets it: every profile that is not deleted, whose e-mail is confirmed
// and who has not clicked "se désabonner" (profiles.marketing_opt_out_at).
//
// Guards:
//   - nothing goes to everyone until the 2026-11-23-email-broadcasts migration
//     has run (without the opt-out column we could not leave anyone out);
//   - one run at a time, and not twice within an hour: a double click must not
//     e-mail every member twice. Each run is a row in email_broadcasts.

export const BROADCAST_KIND = 'trip_reminder';
const BATCH = 100; // Resend batch limit
const PAUSE_MS = 600; // Resend allows ~2 requests a second

export type Recipient = { userId: string; email: string; firstName: string | null };

export type Audience = {
  recipients: Recipient[];
  skipped: { optedOut: number; unconfirmed: number; deleted: number; noEmail: number };
  /** False until the migration has run: sending to everyone is refused. */
  migrationReady: boolean;
};

function firstNameOf(full: string | null | undefined): string | null {
  const f = formatName(full ?? '').split(' ')[0];
  return f || null;
}

export async function findAudience(admin: SupabaseClient): Promise<Audience> {
  let migrationReady = true;
  let profiles: any[] = [];
  const withOptOut = await admin
    .from('profiles')
    .select('id, full_name, deleted_at, marketing_opt_out_at')
    .limit(10000);
  if (withOptOut.error) {
    // Column missing: the migration has not run. Still count, never send.
    migrationReady = false;
    const plain = await admin.from('profiles').select('id, full_name, deleted_at').limit(10000);
    if (plain.error) throw new Error(plain.error.message);
    profiles = plain.data ?? [];
  } else {
    profiles = withOptOut.data ?? [];
  }
  const tableCheck = await admin.from('email_broadcasts').select('id').limit(1);
  if (tableCheck.error) migrationReady = false;

  const auth = new Map<string, any>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    for (const u of data.users) auth.set(u.id, u);
    if (data.users.length < 1000) break;
  }

  const skipped = { optedOut: 0, unconfirmed: 0, deleted: 0, noEmail: 0 };
  const recipients: Recipient[] = [];
  const seen = new Set<string>();
  for (const p of profiles) {
    if (p.deleted_at) { skipped.deleted++; continue; }
    if (p.marketing_opt_out_at) { skipped.optedOut++; continue; }
    const a = auth.get(p.id);
    const email = (a?.email ?? '').trim().toLowerCase();
    if (!email) { skipped.noEmail++; continue; }
    if (!a?.email_confirmed_at) { skipped.unconfirmed++; continue; }
    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push({ userId: p.id, email, firstName: firstNameOf(p.full_name) });
  }
  return { recipients, skipped, migrationReady };
}

function emailFor(r: Recipient) {
  const t = tripReminderBroadcastEmail({ firstName: r.firstName, unsubscribeUrl: unsubscribePageUrl(r.userId) });
  return {
    from: FROM_EMAIL,
    to: r.email,
    subject: t.subject,
    html: t.html,
    text: t.text,
    headers: {
      'List-Unsubscribe': `<${unsubscribeApiUrl(r.userId)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

/** The exact e-mail, for the preview in /admin. */
export function previewEmail(firstName: string | null) {
  return tripReminderBroadcastEmail({ firstName, unsubscribeUrl: '#' });
}

/** One copy to one person (the operator's test). */
export async function sendOne(r: Recipient): Promise<boolean> {
  const { error } = await getResend().emails.send(emailFor(r));
  if (error) console.error('[broadcast] test send failed:', error.message);
  return !error;
}

export type BroadcastRow = {
  id: string;
  subject: string;
  started_at: string;
  finished_at: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
};

export async function recentBroadcasts(admin: SupabaseClient): Promise<BroadcastRow[]> {
  const { data, error } = await admin
    .from('email_broadcasts')
    .select('id, subject, started_at, finished_at, recipient_count, sent_count, failed_count')
    .eq('kind', BROADCAST_KIND)
    .order('started_at', { ascending: false })
    .limit(10);
  return error ? [] : (data as BroadcastRow[]);
}

/**
 * Send to everyone. Returns the run's row, or a reason it refused.
 * `expectedCount` is the number the operator saw and confirmed: if the
 * audience changed meanwhile, refuse rather than send to a surprise number.
 */
export async function sendToAll(
  admin: SupabaseClient,
  sentBy: string,
  expectedCount: number
): Promise<{ ok: true; row: BroadcastRow } | { ok: false; reason: string }> {
  const audience = await findAudience(admin);
  if (!audience.migrationReady) {
    return { ok: false, reason: 'Lancez d’abord la migration 2026-11-23-email-broadcasts.sql dans Supabase.' };
  }
  const { recipients } = audience;
  if (!recipients.length) return { ok: false, reason: 'Personne à qui envoyer.' };
  if (recipients.length !== expectedCount) {
    return { ok: false, reason: `Le nombre de destinataires a changé (${recipients.length}). Rechargez et vérifiez.` };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from('email_broadcasts')
    .select('id, finished_at, started_at')
    .eq('kind', BROADCAST_KIND)
    .gte('started_at', hourAgo)
    .limit(1);
  if (recent?.length) {
    return { ok: false, reason: 'Un envoi a déjà été lancé il y a moins d’une heure.' };
  }

  const subject = previewEmail(null).subject;
  const { data: row, error } = await admin
    .from('email_broadcasts')
    .insert({ kind: BROADCAST_KIND, subject, sent_by: sentBy, recipient_count: recipients.length })
    .select('id, subject, started_at, finished_at, recipient_count, sent_count, failed_count')
    .single();
  if (error || !row) return { ok: false, reason: 'Impossible d’enregistrer l’envoi.' };

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const chunk = recipients.slice(i, i + BATCH);
    try {
      const { error: err } = await getResend().batch.send(chunk.map(emailFor));
      if (err) {
        console.error('[broadcast] batch failed:', err.message);
        failed += chunk.length;
      } else {
        sent += chunk.length;
      }
    } catch (e: any) {
      console.error('[broadcast] batch threw:', e?.message);
      failed += chunk.length;
    }
    await admin.from('email_broadcasts').update({ sent_count: sent, failed_count: failed }).eq('id', row.id);
    if (i + BATCH < recipients.length) await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  const finished = new Date().toISOString();
  await admin
    .from('email_broadcasts')
    .update({ sent_count: sent, failed_count: failed, finished_at: finished })
    .eq('id', row.id);
  return { ok: true, row: { ...(row as BroadcastRow), sent_count: sent, failed_count: failed, finished_at: finished } };
}
