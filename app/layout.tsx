// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Libre_Baskerville, Playfair_Display } from 'next/font/google';
import './globals.css';

// Primary serif font (closest elegant match to Times New Roman)
const libre = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-libre',
  display: 'swap',
});

// Display font for headings (optional – very elegant pairing)
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CarbonWatch – Village Carbon Dashboard',
    template: '%s | CarbonWatch',
  },
  description:
    'Real-time carbon emissions monitoring, sequestration tracking, and intervention planning for Indian villages – developed under India–Denmark Joint Climate Initiative.',
  keywords: [
    'carbon dashboard',
    'village carbon neutrality',
    'SLCR Varanasi',
    'carbon emissions India',
    'climate resilience villages',
    'greenhouse gas monitoring',
  ],
  authors: [{ name: 'SLCR Varanasi', url: 'https://slcr-varanasi.gov.in' }],
  creator: 'Smart Laboratory on Clean Rivers (SLCR)',
  publisher: 'Ministry of Jal Shakti',
  openGraph: {
    title: 'CarbonWatch – Village Carbon Dashboard',
    description:
      'Empowering rural India to measure, reduce, and achieve carbon neutrality through data-driven insights.',
    url: 'https://your-domain.com',
    siteName: 'CarbonWatch',
    images: [
      {
        url: '/images/og-image.jpg', // ← add this image to public/images
        width: 1200,
        height: 630,
        alt: 'CarbonWatch Dashboard – Rural India Carbon Neutrality',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarbonWatch – Village Carbon Dashboard',
    description:
      'Real-time carbon monitoring and climate action planning for Indian villages.',
    images: ['/images/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        {/* Preload important fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`
          ${libre.variable} ${playfair.variable}
          font-serif bg-gray-50 text-gray-900 antialiased
          selection:bg-emerald-200 selection:text-emerald-900
          dark:bg-gray-950 dark:text-gray-100 dark:selection:bg-emerald-800 dark:selection:text-white
        `}
      >
        {children}
      </body>
    </html>
  );
}