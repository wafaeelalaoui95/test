import { GuideLanding, guideMetadata } from '@/components/GuideLanding';

// Live trips are read per request, like the route pages.
export const dynamic = 'force-dynamic';

export const metadata = guideMetadata('/envoyer-cadeau-famille-etranger');

export default function Page() {
  return <GuideLanding path="/envoyer-cadeau-famille-etranger" />;
}
