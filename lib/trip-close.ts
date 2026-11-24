import { getAdminClient } from '@/lib/supabase/server';

// A traveller who has delivered a parcel has made the journey, so the trip
// is no longer on offer: mark it 'completed'. Every public listing of trips
// (search, home page, route pages, profiles, match alerts) filters on
// status = 'open', and booking/negotiation refuse a completed trip. Bookings
// already on the trip carry on untouched. Never throws: the delivery itself
// is what matters, this is housekeeping.
export async function closeTripAfterDelivery(tripId: string | null | undefined, from: string) {
  if (!tripId) return;
  try {
    const { error } = await getAdminClient()
      .from('traveler_trips')
      .update({ status: 'completed' })
      .eq('id', tripId)
      .in('status', ['open', 'matched', 'in_transit']);
    if (error) console.error(`[${from}] could not close trip`, tripId, error.message);
  } catch (e: any) {
    console.error(`[${from}] could not close trip`, tripId, e?.message);
  }
}
