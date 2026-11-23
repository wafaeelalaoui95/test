import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';

/**
 * GET /api/admin/chats            — every booking conversation, latest activity first
 * GET /api/admin/chats?id=<uuid>  — one conversation's messages, oldest first
 *
 * Read-only, for moderation. There is deliberately no POST: the operator reads
 * a chat, they never speak in it — a message from "Jibly" landing in a private
 * conversation would read as the platform taking a side.
 *
 * Also deliberately does NOT touch messages.read_at. Marking a message read is
 * the recipient's signal; an operator looking at the thread must not make the
 * traveller's unread badge disappear.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const { isAdmin, userId } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const admin = getAdminClient();
  const id = req.nextUrl.searchParams.get('id');

  if (id) {
    if (!UUID.test(id)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

    const { data: messages, error } = await admin
      .from('messages')
      .select('id, sender_id, body, read_at, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(1000);
    if (error) {
      console.error('[admin/chats] messages query failed:', error.message);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }
    // Reading a private conversation is worth a trace in the logs.
    console.log(`[admin/chats] conversation ${id} read by ${userId}`);
    return NextResponse.json({ messages: messages ?? [] });
  }

  const { data: convs, error } = await admin
    .from('conversations')
    .select('id, booking_intent_id, sender_id, traveler_id, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    console.error('[admin/chats] conversations query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  const rows = convs ?? [];
  if (!rows.length) return NextResponse.json({ conversations: [] });

  const convIds = rows.map((c: any) => c.id);
  const bookingIds = [...new Set(rows.map((c: any) => c.booking_intent_id).filter(Boolean))];
  const personIds = [...new Set(rows.flatMap((c: any) => [c.sender_id, c.traveler_id]).filter(Boolean))];

  const [{ data: msgs }, { data: bookings }, { data: people }, { data: disputes }] = await Promise.all([
    // Only what is needed for counts and last activity, not the bodies.
    admin
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', convIds)
      .limit(20000),
    bookingIds.length
      ? admin
          .from('booking_intents')
          .select('id, pickup_city, destination_city, item_title, payment_status')
          .in('id', bookingIds)
      : Promise.resolve({ data: [] as any[] }),
    personIds.length
      ? admin.from('profiles').select('id, full_name').in('id', personIds)
      : Promise.resolve({ data: [] as any[] }),
    bookingIds.length
      ? admin.from('disputes').select('booking_intent_id, status').in('booking_intent_id', bookingIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const stats = new Map<string, { count: number; last: string | null }>();
  for (const m of (msgs ?? []) as any[]) {
    const s = stats.get(m.conversation_id) ?? { count: 0, last: null };
    s.count += 1;
    if (!s.last || m.created_at > s.last) s.last = m.created_at;
    stats.set(m.conversation_id, s);
  }
  const bookingById = new Map((bookings ?? []).map((b: any) => [b.id, b]));
  const nameById = new Map((people ?? []).map((p: any) => [p.id, p.full_name]));
  const disputed = new Set((disputes ?? []).map((d: any) => d.booking_intent_id));

  const conversations = rows
    .map((c: any) => {
      const b = bookingById.get(c.booking_intent_id);
      const s = stats.get(c.id) ?? { count: 0, last: null };
      return {
        id: c.id,
        bookingId: c.booking_intent_id,
        senderId: c.sender_id,
        travelerId: c.traveler_id,
        senderName: nameById.get(c.sender_id) ?? null,
        travelerName: nameById.get(c.traveler_id) ?? null,
        route: b ? `${b.pickup_city} → ${b.destination_city}` : null,
        item: b?.item_title ?? null,
        paymentStatus: b?.payment_status ?? null,
        hasDispute: disputed.has(c.booking_intent_id),
        messageCount: s.count,
        lastMessageAt: s.last,
        createdAt: c.created_at,
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));

  return NextResponse.json({ conversations });
}
