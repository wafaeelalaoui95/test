// app/confidentialite/page.tsx
//
// Privacy Policy — the solicitor's text, verbatim, from lib/legal/privacy.json
// (see components/LegalDocument.tsx). Replaces Jibly's own French policy.
// The URL stays /confidentialite so every existing link keeps working.
//
// Additions to the solicitor's text (26 Nov 2026, at Wafae's request): a
// paragraph in section 7 on transfers to WEF Technologies FZE LLC (UAE), and
// that company named as controller for UAE-paid Bookings.

import type { Metadata } from 'next';
import { LegalDocument, type LegalBlock } from '@/components/LegalDocument';
import privacy from '@/lib/legal/privacy.json';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Jibly collects, uses and protects your personal data.',
  alternates: { canonical: '/confidentialite' },
};

export default function PrivacyPage() {
  return <LegalDocument blocks={privacy as LegalBlock[]} />;
}
