'use client';

// Catches errors thrown in the root layout itself, where the normal
// error.tsx (which lives inside the layout) can't render. It must supply
// its own <html>/<body> and can't rely on providers/global CSS, so the
// copy is bilingual-neutral and styled inline.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#FBF8F2',
          color: '#2C2620',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
            Une erreur est survenue
          </h1>
          <p style={{ fontSize: 15, color: '#7a736a', lineHeight: 1.6, marginBottom: 24 }}>
            Un problème inattendu s&apos;est produit. · Something went wrong.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#2C2620',
              color: '#FBF8F2',
              border: 'none',
              borderRadius: 999,
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Réessayer · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
