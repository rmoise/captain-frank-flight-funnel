import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Providers } from './providers';
import { ReduxProvider } from './ReduxProvider';

const heebo = Heebo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heebo',
});

export const metadata: Metadata = {
  title: 'Captain Frank',
  description: 'Your flight assistance companion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${heebo.variable}`}>
      <body className="font-heebo" suppressHydrationWarning>
        <ReduxProvider>
          <Providers>
            <Navbar />
            <div className="min-h-screen">{children}</div>
          </Providers>
        </ReduxProvider>
      </body>
    </html>
  );
}
