import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { OnboardingCarousel } from '@/components/OnboardingCarousel';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cozy-stag.sunshade.icu';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Cozy — Share Your Space',
    template: '%s | Cozy',
  },
  description:
    'A positivity-only community where you share Light & Dark photos of your living spaces and pool points with your group.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cozy',
  },
  openGraph: {
    title: 'Cozy — Share Your Space',
    description: 'Gamified therapeutic cleaning and home sharing.',
    url: APP_URL,
    siteName: 'Cozy App',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Cozy — Share Your Space',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cozy — Share Your Space',
    description: 'Gamified therapeutic cleaning and home sharing.',
    images: ['/api/og'],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="h-[100dvh] w-full flex flex-col overflow-hidden bg-[var(--cozy-cream)] dark:bg-zinc-950 transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navbar />
          <main className="flex-1 flex flex-col relative overflow-y-auto w-full pt-14">{children}</main>
          <OnboardingCarousel />
        </ThemeProvider>
      </body>
    </html>
  );
}
