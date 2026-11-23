// Server-side metadata for a client-component page (a 'use client' page
// cannot export metadata itself).
import type { Metadata } from 'next';
import { NOINDEX } from '@/lib/seo';

export const metadata: Metadata = { title: 'Créer un compte', robots: NOINDEX };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
