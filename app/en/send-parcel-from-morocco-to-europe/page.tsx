import { GuideLanding, guideMetadata } from '@/components/GuideLanding';

// Live trips are read per request, like the route pages.
export const dynamic = 'force-dynamic';

export const metadata = guideMetadata('/en/send-parcel-from-morocco-to-europe');

export default function Page() {
  return <GuideLanding path="/en/send-parcel-from-morocco-to-europe" />;
}
