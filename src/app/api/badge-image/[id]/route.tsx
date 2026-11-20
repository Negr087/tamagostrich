import { ImageResponse } from 'next/og';
import { findAchievement } from '@/lib/badgeIssuer';

// PNG badge artwork for NIP-58 definitions: /api/badge-image/<achievementId>?size=256
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = findAchievement(id);
  if (!a) return new Response('Not found', { status: 404 });

  const size = new URL(req.url).searchParams.get('size') === '256' ? 256 : 512;
  const u = size / 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0a',
        }}
      >
        <div
          style={{
            width: 460 * u, height: 460 * u, borderRadius: 9999, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 35%, #1f2a10 0%, #171717 70%)',
            border: `${14 * u}px solid #b4f953`,
            boxShadow: `0 0 ${60 * u}px rgba(180,249,83,0.35)`,
          }}
        >
          <div style={{ fontSize: 190 * u, lineHeight: 1, display: 'flex' }}>{a.emoji}</div>
          <div style={{ marginTop: 24 * u, fontSize: 40 * u, fontWeight: 800, color: '#fafafa', display: 'flex' }}>
            {a.nameEn}
          </div>
          <div style={{ marginTop: 8 * u, fontSize: 22 * u, color: '#b4f953', letterSpacing: 4 * u, display: 'flex' }}>
            TAMAGOSTRICH
          </div>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      emoji: 'twemoji',
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable' },
    },
  );
}
