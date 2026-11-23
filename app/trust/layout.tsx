// Server-side metadata for a client-component page (a 'use client' page
// cannot export metadata itself).
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(
  '/trust',
  'Comment ça marche et confiance',
  'Vérification d’identité, paiement sécurisé, code de remise et gestion des litiges : comment Jibly sécurise l’envoi de colis entre particuliers.'
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
