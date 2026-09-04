import { getSiteUrl } from '@/lib/site-url';
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { formatName } from '@/lib/utils';

/**
 * POST /api/messages/send
 *
 * Body: { conversationId: string, body: string }
 *
 * 1. Verifies the caller is a participant of the conversation.
 * 2. Inserts the message.
 * 3. If the last notification email to the recipient was sent more than
 *    EMAIL_COOLDOWN_MIN ago (or never), sends one and updates the
 *    conversation row. Otherwise stays silent — the recipient is
 *    presumed to be actively chatting.
 *
 * The email send is best-effort: if it fails we still return success for
 * the message itself so the chat keeps working.
 */

const EMAIL_COOLDOWN_MIN = 5;

export async function POST(req: NextRequest) {
  let payload: { conversationId?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversationId, body } = payload;
  if (!conversationId || !body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json(
      { error: 'conversationId and body are required' },
      { status: 400 }
    );
  }
  if (body.length > 4000) {
    return NextResponse.json({ error: 'Message too long (max 4000)' }, { status: 400 });
  }

  const supabase = getServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 1. Fetch the conversation and verify the caller is a participant.
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select(
      'id, sender_id, traveler_id, booking_intent_id, last_email_to_sender_at, last_email_to_traveler_at'
    )
    .eq('id', conversationId)
    .maybeSingle();
  if (convErr || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conv.sender_id !== user.id && conv.traveler_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Insert the message
  const { data: inserted, error: insErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
    })
    .select('*')
    .maybeSingle();
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // 3. Decide whether to email the recipient. The "recipient direction"
  //    determines which cooldown field we read & bump.
  const isFromSender = user.id === conv.sender_id;
  const recipientId = isFromSender ? conv.traveler_id : conv.sender_id;
  const lastEmailField = isFromSender
    ? 'last_email_to_traveler_at'
    : 'last_email_to_sender_at';
  const lastEmailAt = conv[lastEmailField] as string | null;

  const cooldownMs = EMAIL_COOLDOWN_MIN * 60 * 1000;
  const now = Date.now();
  const lastSent = lastEmailAt ? new Date(lastEmailAt).getTime() : 0;
  const shouldSendEmail = now - lastSent > cooldownMs;

  if (shouldSendEmail) {
    // Run email + cooldown update in the background. We do NOT await
    // because the user's reply UX shouldn't depend on Resend latency.
    // Errors are logged server-side.
    sendNotificationEmail({
      recipientId,
      senderId: user.id,
      conversationId,
      bookingIntentId: conv.booking_intent_id,
      body: body.trim(),
    })
      .then(async (sent) => {
        if (sent) {
          await supabase
            .from('conversations')
            .update({ [lastEmailField]: new Date().toISOString() })
            .eq('id', conversationId);
        }
      })
      .catch((e) => {
        console.warn('[messages/send] email failed:', e);
      });
  }

  return NextResponse.json({ message: inserted });
}

/**
 * Compose and send the notification email. Returns true if Resend
 * accepted the message, false otherwise. We use the server-side Supabase
 * client (already in scope of the route) to look up the recipient's
 * email and the sender's name — both required for a nice email.
 */
async function sendNotificationEmail(params: {
  recipientId: string;
  senderId: string;
  conversationId: string;
  bookingIntentId: string;
  body: string;
}): Promise<boolean> {
  const { recipientId, senderId, conversationId, bookingIntentId, body } = params;

  const supabase = getServerClient();

  // Recipient: need their email AND name. Email lives in auth.users which
  // we can't query from the public schema directly, so we use the admin
  // approach via service role.
  // For the MVP we'll just look up the profile and assume the email is
  // accessible via the auth admin API. If not configured, we fall back
  // to skipping email gracefully.
  try {
    // The profiles table doesn't have email. We need auth.admin which
    // requires a service-role key. We'll use the Supabase SDK's admin
    // listUsers as a workaround. Configured via SUPABASE_SERVICE_ROLE_KEY.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      console.warn('[messages/send] no SUPABASE_SERVICE_ROLE_KEY — skipping email');
      return false;
    }

    // Use a one-off admin client just for reading the user's email.
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: getUserErr } =
      await admin.auth.admin.getUserById(recipientId);
    if (getUserErr || !userData?.user?.email) {
      console.warn('[messages/send] could not resolve recipient email');
      return false;
    }
    const recipientEmail = userData.user.email;

    // Sender's first name for the subject line
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .maybeSingle();
    // Title-cased, like everywhere else a name is shown. See the same fix in
    // app/api/notify/route.ts.
    // English, like every other transactional email — see lib/email/templates.ts
    // for why: nothing records a person's language, so there is nothing to
    // choose from.
    const senderFirstName =
      (senderProfile?.full_name
        ? formatName(senderProfile.full_name).split(' ')[0]
        : '') || 'Someone';

    // Pick a deep link to the booking. The user lands on /me which is
    // where the modal will reopen via the URL hash. We pass the
    // booking id so the dashboard can open the matching chat modal.
    const baseUrl = getSiteUrl();
    const link = `${baseUrl}/me?chat=${bookingIntentId}`;

    const resend = getResend();
    const preview = body.length > 140 ? body.slice(0, 140).trim() + '…' : body;

    const { error: sendErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `${senderFirstName} sent you a message on Jibly`,
      html: renderEmail({ senderFirstName, preview, link }),
    });

    if (sendErr) {
      console.warn('[messages/send] Resend error:', sendErr);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[messages/send] sendNotificationEmail caught:', e);
    return false;
  }
}

function renderEmail({
  senderFirstName,
  preview,
  link,
}: {
  senderFirstName: string;
  preview: string;
  link: string;
}): string {
  // Escape user-supplied content. Resend will minify whitespace, so
  // we don't need to be fussy about formatting.
  const escape = (s: string) =>
    s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#FBF8F2; padding:32px 20px; margin:0; color:#2C2620;">
        <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; padding:32px;">
          <div style="font-size:13px; color:#7458E8; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:16px;">
            Jibly · New message
          </div>
          <h1 style="font-size:24px; font-weight:800; letter-spacing:-0.5px; margin:0 0 12px;">
            ${escape(senderFirstName)} wrote to you
          </h1>
          <div style="font-size:15px; color:#5a544c; line-height:1.6; border-left:3px solid #7458E8; padding-left:16px; margin:20px 0; font-style:italic;">
            « ${escape(preview)} »
          </div>
          <a href="${escape(link)}" style="display:inline-block; background:#2C2620; color:#FBF8F2; padding:12px 24px; border-radius:999px; text-decoration:none; font-weight:600; font-size:14px; margin-top:8px;">
            Read the message
          </a>
          <p style="font-size:12px; color:#a09a92; line-height:1.5; margin-top:32px;">
            You are receiving this because you have an active booking on Jibly. To reply,
            open the conversation from your account.
          </p>
        </div>
      </body>
    </html>
  `;
}
