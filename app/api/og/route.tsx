import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'Cozy — Share Your Space';
    const subtitle = searchParams.get('subtitle') || 'Gamified therapeutic home sharing & group point pooling';
    const emoji = searchParams.get('emoji') || '🏡';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'linear-gradient(140deg, #faf7f2 0%, #f5ede0 50%, #ede0cc 100%)',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top Brand Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #f0c060, #e8a87c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                boxShadow: '0 8px 24px rgba(196,112,74,0.35)',
              }}
            >
              {emoji}
            </div>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#c4704a', letterSpacing: '-0.02em' }}>
              Cozy App
            </span>
          </div>

          {/* Main Title & Subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: '#1a1410',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#8a7060', lineHeight: 1.4 }}>
              {subtitle}
            </div>
          </div>

          {/* Bottom Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              borderRadius: '999px',
              background: 'rgba(240,192,96,0.25)',
              border: '1.5px solid rgba(240,192,96,0.5)',
              color: '#9a441e',
              fontSize: '20px',
              fontWeight: 800,
            }}
          >
            <span>✨ Join the Cozy Community</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('OG Image Generation Error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
