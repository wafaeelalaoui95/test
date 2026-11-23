// app/annulation-remboursement/page.tsx
//
// Cancellation & Refund Policy — the solicitor's text, verbatim, from
// lib/legal/cancellation-refund.json (see components/LegalDocument.tsx).
// The Terms make it part of the contract, so it needs its own page.

import type { Metadata } from 'next';
import { LegalDocument, type LegalBlock } from '@/components/LegalDocument';
import policy from '@/lib/legal/cancellation-refund.json';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy',
  description: 'When and how a Jibly booking can be cancelled, and how refunds work.',
  alternates: { canonical: '/annulation-remboursement' },
};

export default function CancellationRefundPage() {
  return <LegalDocument blocks={policy as LegalBlock[]} />;
}
