import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { I18nProvider } from '@/lib/i18n/context';
import { AuthProvider } from '@/lib/supabase/auth-provider';

export const metadata: Metadata = {
  title: 'Jibly — Send things with a traveler',
  description:
    'Someone is already going your way. Send your documents, keys or small items with a community of verified travelers.',
  keywords: ['Jibly', 'envoi documents', 'voyageurs', 'peer-to-peer', 'community travel'],
  openGraph: {
    title: 'Jibly — Someone is already going your way',
    description: 'Send your stuff with a verified traveler community, worldwide.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-cream-50 text-ink-500">
        <I18nProvider>
          <AuthProvider>
            <Navbar />
            <main className="relative">{children}</main>
            <Footer />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
