import type { Metadata } from 'next';
import { UnsubscribeClient } from './UnsubscribeClient';

// Landing page of the "Se désabonner" link in e-mails sent to every member.
// It asks for one click instead of unsubscribing on load: mail apps' link
// scanners open every link, and must not unsubscribe people by doing so.
export const metadata: Metadata = {
  title: 'Se désabonner',
  robots: { index: false, follow: false },
};

export default function Page({ searchParams }: { searchParams: { u?: string; t?: string } }) {
  return <UnsubscribeClient u={searchParams.u ?? ''} t={searchParams.t ?? ''} />;
}
