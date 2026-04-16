import type { Metadata } from 'next';
import './globals.css';
import SessionRestorer from '@/components/SessionRestorer';

export const metadata: Metadata = {
  title: 'Tamagostrich — Tu Mascota Nostr',
  description: 'Cuidá a tu Mascota, el avestruz virtual que vive en el protocolo Nostr.',
  themeColor: '#0a0a0a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tamagostrich',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-lc-black text-lc-white antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <SessionRestorer />
        {children}
      </body>
    </html>
  );
}
