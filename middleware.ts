import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     * - Stripe webhooks: they carry no session to refresh, and signature
     *   verification depends on the byte-exact request body. Keeping
     *   middleware off that path removes any chance of it interfering.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/identity/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
