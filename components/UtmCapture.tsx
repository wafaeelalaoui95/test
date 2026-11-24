'use client';

import { useEffect } from 'react';
import { captureUtm } from '@/lib/utm';

/** Remembers the utm_* tags of the link a visitor arrived by. Renders nothing. */
export function UtmCapture() {
  useEffect(() => {
    captureUtm();
  }, []);
  return null;
}
