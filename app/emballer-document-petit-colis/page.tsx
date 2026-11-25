import { GuideLanding, guideMetadata } from '@/components/GuideLanding';

// Live trips are read per request, like the route pages.
export const dynamic = 'force-dynamic';

export const metadata = guideMetadata('/emballer-document-petit-colis');

export default function Page() {
  return <GuideLanding path="/emballer-document-petit-colis" />;
}
