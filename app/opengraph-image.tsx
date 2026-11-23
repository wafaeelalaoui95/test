// Share preview (WhatsApp, Instagram, Facebook, X…) for every page that does
// not define its own. Generated at build time from the brand colours, so there
// is no binary asset to keep in sync with the copy.
import { ImageResponse } from 'next/og';

// Edge runtime: the Node build of next/og fails to prerender on Windows.
export const runtime = 'edge';

export const alt = 'Jibly – Envoi de colis entre particuliers';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 90px',
          background: '#FBF8F2',
          color: '#181410',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, color: '#5B41C9', marginBottom: 36 }}>Jibly</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          Envoyez vos documents et petits colis
        </div>
        <div style={{ fontSize: 76, fontWeight: 500, fontStyle: 'italic', color: '#5B41C9', lineHeight: 1.1 }}>
          avec un voyageur.
        </div>
        <div style={{ fontSize: 30, color: '#5A5145', marginTop: 40 }}>Envoi de colis entre particuliers · jibly.io</div>
      </div>
    ),
    size
  );
}
