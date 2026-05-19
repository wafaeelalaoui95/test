import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = getServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
