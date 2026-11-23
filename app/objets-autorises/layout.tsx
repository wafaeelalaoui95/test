// Server-side metadata for a client-component page (a 'use client' page
// cannot export metadata itself).
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(
  '/objets-autorises',
  'Objets autorisés et interdits',
  'Documents, clés, vêtements, petits objets : la liste des catégories que l’on peut envoyer avec un voyageur sur Jibly, et ce qui est strictement interdit.'
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
