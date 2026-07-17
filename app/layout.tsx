import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Cozy — Share Your Space',
  description:
    'A positivity-only community where you share Light & Dark photos of your living spaces. Earn points by contributing and cheering others on.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cozy',
  },
  openGraph: {
    title: 'Cozy — Share Your Space',
    description: 'Gamified therapeutic cleaning and home sharing.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#e8a87c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="h-[100dvh] w-full flex flex-col overflow-hidden" style={{ background: 'var(--cozy-cream)' }}>
        <Navbar />
        <main className="flex-1 flex flex-col relative overflow-hidden w-full pt-14">{children}</main>
      </body>
    </html>
  );
}
