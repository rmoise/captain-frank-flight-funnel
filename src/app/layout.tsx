import './globals.css';
import { Providers } from '@/store/provider';
import { Heebo } from 'next/font/google';

const heebo = Heebo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heebo',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={heebo.variable}>
      <body className="font-heebo" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
