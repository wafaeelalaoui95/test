/**
 * Wraps a promise with a hard timeout. If the inner promise hasn't settled
 * after `ms` milliseconds, the returned promise rejects with a clear error.
 *
 * Why this exists: the Supabase JS client occasionally returns promises that
 * never resolve or reject (cookie/session edge cases). Without a timeout,
 * any `await` on such a promise hangs forever — which leaves loading states
 * stuck and spinners spinning indefinitely. This helper bounds the wait so
 * the UI always gets either a result or an error it can show.
 *
 * Usage:
 *   await withTimeout(supabase.auth.signInWithPassword(...), 8000, 'Sign in')
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 8000,
  label: string = 'Operation'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
