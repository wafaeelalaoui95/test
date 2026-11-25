import { GuidesIndex, guidesIndexMetadata } from '@/components/GuidesIndex';

export const metadata = guidesIndexMetadata('fr');

export default function GuidesPage() {
  return <GuidesIndex lang="fr" />;
}
