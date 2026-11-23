// Server-side metadata for a client-component page (a 'use client' page
// cannot export metadata itself).
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(
  '/envoyer',
  'Envoyer un colis avec un voyageur',
  'Publiez votre demande ou réservez un voyageur qui fait déjà le trajet pour envoyer vos documents, clés ou petits colis. Prix fixé entre vous, paiement sécurisé.'
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
