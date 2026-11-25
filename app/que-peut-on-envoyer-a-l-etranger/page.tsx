import { GuideLanding, guideMetadata } from '@/components/GuideLanding';

// Live trips are read per request, like the route pages.
export const dynamic = 'force-dynamic';

export const metadata = guideMetadata('/que-peut-on-envoyer-a-l-etranger');

export default function Page() {
  return <GuideLanding path="/que-peut-on-envoyer-a-l-etranger" />;
}
