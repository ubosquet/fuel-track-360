import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Fuel-Track-360 | Dashboard',
  description:
    'Real-time fuel logistics management platform for Haiti. Track S2L inspections, manifests, and fleet operations.',
  keywords: 'fuel, logistics, Haiti, S2L, manifest, fleet, tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
