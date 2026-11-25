import { GuideLanding, guideMetadata } from '@/components/GuideLanding';

// Live trips are read per request, like the route pages.
export const dynamic = 'force-dynamic';

export const metadata = guideMetadata('/douane-colis-ue-hors-ue');

export default function Page() {
  return <GuideLanding path="/douane-colis-ue-hors-ue" />;
}
