// Server-side metadata for a client-component page (a 'use client' page
// cannot export metadata itself).
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(
  '/voyager',
  'Transporter un colis pendant votre voyage',
  'Vous voyagez bientôt ? Annoncez votre trajet sur Jibly et gagnez de l’argent en transportant de petits objets autorisés pour des particuliers vérifiés.'
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
