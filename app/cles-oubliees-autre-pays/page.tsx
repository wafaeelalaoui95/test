import { GuideLanding, guideMetadata } from '@/components/GuideLanding';

// Live trips are read per request, like the route pages.
export const dynamic = 'force-dynamic';

export const metadata = guideMetadata('/cles-oubliees-autre-pays');

export default function Page() {
  return <GuideLanding path="/cles-oubliees-autre-pays" />;
}
