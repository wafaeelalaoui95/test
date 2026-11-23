import { RouteLanding, routeMetadata } from '@/components/RouteLanding';

// Live trips are read per request, like the home page.
export const dynamic = 'force-dynamic';

export const metadata = routeMetadata('/envoi-colis-paris-casablanca');

export default function Page() {
  return <RouteLanding path="/envoi-colis-paris-casablanca" />;
}
