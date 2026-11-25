import { GuidesIndex, guidesIndexMetadata } from '@/components/GuidesIndex';

export const metadata = guidesIndexMetadata('en');

export default function GuidesPageEn() {
  return <GuidesIndex lang="en" />;
}
