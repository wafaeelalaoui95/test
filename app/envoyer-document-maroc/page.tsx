import { GuideLanding, guideMetadata } from '@/components/GuideLanding';

// Live trips are read per request, like the route pages.
export const dynamic = 'force-dynamic';

export const metadata = guideMetadata('/envoyer-document-maroc');

export default function Page() {
  return <GuideLanding path="/envoyer-document-maroc" />;
}
