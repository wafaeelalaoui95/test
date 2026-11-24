import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MessagingProvider } from '@/components/GlobalMessaging';
import { I18nProvider } from '@/lib/i18n/context';
import { AuthProvider } from '@/lib/supabase/auth-provider';
import { getSiteUrl } from '@/lib/site-url';
import { SHARE_IMAGE } from '@/lib/seo';
import { UtmCapture } from '@/components/UtmCapture';

const siteUrl = getSiteUrl();

// Self-hosted by Next at build time: no render-blocking Google Fonts @import.
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope' });

const DEFAULT_TITLE = 'Envoi de colis entre particuliers | Jibly';
const DEFAULT_DESCRIPTION =
  'Envoi de colis entre particuliers : envoyez documents, clés ou petits colis avec un voyageur vérifié qui fait déjà le trajet. Prix fixé entre vous, réservation sécurisée.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Pages set their own title; the template adds the brand. No canonical here:
  // it would be inherited by every page (each page sets its own).
  title: { default: DEFAULT_TITLE, template: '%s | Jibly' },
  description: DEFAULT_DESCRIPTION,
  applicationName: 'Jibly',
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    type: 'website',
    url: siteUrl,
    siteName: 'Jibly',
    locale: 'fr_FR',
    images: [SHARE_IMAGE],
  },
  twitter: {
    // Square-ish logo: the small card shows it whole instead of cropping it.
    card: 'summary',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [SHARE_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: '#FBF8F2',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-cream-50 text-ink-500">
        <I18nProvider>
          <AuthProvider>
            <MessagingProvider>
              <Navbar />
              <main className="relative">{children}</main>
              <Footer />
            </MessagingProvider>
          </AuthProvider>
        </I18nProvider>
        <Analytics />
        <UtmCapture />
      </body>
    </html>
  );
}
