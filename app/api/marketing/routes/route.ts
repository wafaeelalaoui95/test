import { withoutDepartedTrips } from '@/lib/trip-departure';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/marketing/routes
 *
 * What is on the market right now, by route — the raw material for the weekly
 * marketing drafts (see marketing/AGENT.md).
 *
 * Aggregates only. No names, no user ids, no listing ids, no descriptions:
 * whatever this returns gets pasted into a public Facebook group, so it must
 * never carry anything that points at a person. Free-text fields are left out
 * entirely rather than filtered, because "my mother's keys, she lives at…" is
 * exactly what a filter misses.
 *
 * Its own secret, not CRON_SECRET. This one lives on a laptop in a scheduled
 * task; if it leaks, the worst anyone learns is how many trips leave Paris
 * next week — it must not also let them trigger payouts.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Far enough ahead to plan a post around, near enough that the trip is real.
const HORIZON_DAYS = 21;

type RouteKey = string;

function routeKey(fromCity: string, fromCountry: string, toCity: string, toCountry: string): RouteKey {
  return `${fromCity.trim()} (${fromCountry}) → ${toCity.trim()} (${toCountry})`;
}

export async function GET(req: NextRequest) {
  const secret = process.env.MARKETING_SECRET?.trim();
  const auth = req.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    console.error(
      '[marketing/routes] rejected — MARKETING_SECRET %s, Authorization header %s',
      secret ? 'set' : 'MISSING in this environment',
      auth ? 'present but does not match' : 'absent'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + HORIZON_DAYS * 86_400_000).toISOString().slice(0, 10);

  const [tripsRes, requestsRes] = await Promise.all([
    supabase
      .from('traveler_trips')
      .select('departure_city, departure_country, arrival_city, arrival_country, departure_date, flight_time, available_space, compensation_min')
      .eq('status', 'open')
      .gte('departure_date', today)
      .lte('departure_date', horizon),
    supabase
      .from('shipping_requests')
      .select('pickup_city, pickup_country, destination_city, destination_country, desired_delivery_date, item_category, budget, urgency_level')
      .eq('status', 'pending')
      .gte('desired_delivery_date', today),
  ]);

  if (tripsRes.error || requestsRes.error) {
    console.error('[marketing/routes] query failed', tripsRes.error ?? requestsRes.error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const trips = new Map<RouteKey, { count: number; dates: string[]; spaces: string[]; min_price_eur: number }>();
  for (const t of withoutDepartedTrips(tripsRes.data ?? [])) {
    const key = routeKey(t.departure_city, t.departure_country, t.arrival_city, t.arrival_country);
    const row = trips.get(key) ?? { count: 0, dates: [], spaces: [], min_price_eur: Infinity };
    row.count += 1;
    row.dates.push(t.departure_date);
    if (!row.spaces.includes(t.available_space)) row.spaces.push(t.available_space);
    row.min_price_eur = Math.min(row.min_price_eur, t.compensation_min);
    trips.set(key, row);
  }

  const requests = new Map<RouteKey, { count: number; by_date: string[]; categories: string[]; budget_eur: [number, number]; urgent: number }>();
  for (const r of requestsRes.data ?? []) {
    const key = routeKey(r.pickup_city, r.pickup_country, r.destination_city, r.destination_country);
    const row = requests.get(key) ?? { count: 0, by_date: [], categories: [], budget_eur: [Infinity, 0] as [number, number], urgent: 0 };
    row.count += 1;
    row.by_date.push(r.desired_delivery_date);
    if (!row.categories.includes(r.item_category)) row.categories.push(r.item_category);
    row.budget_eur = [Math.min(row.budget_eur[0], r.budget), Math.max(row.budget_eur[1], r.budget)];
    if (r.urgency_level !== 'standard') row.urgent += 1;
    requests.set(key, row);
  }

  const sortDates = (d: string[]) => [...d].sort();

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    horizon_days: HORIZON_DAYS,
    open_trips: [...trips].map(([route, r]) => ({ route, ...r, dates: sortDates(r.dates) }))
      .sort((a, b) => b.count - a.count),
    waiting_parcels: [...requests].map(([route, r]) => ({ route, ...r, by_date: sortDates(r.by_date) }))
      .sort((a, b) => b.count - a.count),
  });
}
