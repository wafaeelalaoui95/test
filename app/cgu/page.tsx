// app/cgu/page.tsx
//
// Marketplace Terms and Conditions — the solicitor's text, verbatim, from
// lib/legal/terms.json (see components/LegalDocument.tsx for how it is made).
//
// This replaces Jibly's own French CGU, which chose French law and French
// courts. Jibly Limited is an English company and the Terms are governed by
// the law of England and Wales, so the old text was not amended but retired.
// The URL stays /cgu so every existing link keeps working.

import type { Metadata } from 'next';
import { LegalDocument, type LegalBlock } from '@/components/LegalDocument';
import terms from '@/lib/legal/terms.json';

export const metadata: Metadata = {
  title: 'Marketplace Terms and Conditions',
  description: 'The terms that apply to every sender and traveller using the Jibly marketplace.',
  alternates: { canonical: '/cgu' },
};

export default function TermsPage() {
  return <LegalDocument blocks={terms as LegalBlock[]} />;
}
