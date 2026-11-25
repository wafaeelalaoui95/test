import { GuideLanding, guideMetadata } from '@/components/GuideLanding';

// Live trips are read per request, like the route pages.
export const dynamic = 'force-dynamic';

export const metadata = guideMetadata('/comparatif-voyageur-express-poste');

export default function Page() {
  return <GuideLanding path="/comparatif-voyageur-express-poste" />;
}
