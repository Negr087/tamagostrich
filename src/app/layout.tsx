import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tamagostrich — Tu Mascota Nostr',
  description: 'Cuidá a tu Mascota, el avestruz virtual que vive en el protocolo Nostr.',
  icons: {
    icon: '/logo.png',
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
        {children}
      </body>
    </html>
  );
}
