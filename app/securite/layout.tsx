// Server-side metadata for a client-component page (a 'use client' page
// cannot export metadata itself).
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(
  '/securite',
  'Règles de sécurité pour les voyageurs',
  'Savoir ce que l’on transporte, refuser un colis fermé, signaler un problème : les règles de sécurité Jibly pour voyager et envoyer sereinement.'
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
