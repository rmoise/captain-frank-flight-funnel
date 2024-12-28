'use client';

import { Heebo } from 'next/font/google';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { LoadingProvider } from '@/providers/LoadingProvider';
import './globals.css';
import '@/styles/autofill.css';

const heebo = Heebo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={heebo.className}>
      <body>
        <Provider store={store}>
          <LoadingProvider>{children}</LoadingProvider>
        </Provider>
      </body>
    </html>
  );
}
