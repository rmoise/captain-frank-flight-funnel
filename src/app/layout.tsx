'use client';

import { Heebo } from 'next/font/google';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { LoadingProvider } from '@/providers/LoadingProvider';
import './globals.css';
import '@/styles/autofill.css';

const heebo = Heebo({
  subsets: ['latin'],
  variable: '--font-heebo',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={heebo.className}>
        <Provider store={store}>
          <LoadingProvider>{children}</LoadingProvider>
        </Provider>
      </body>
    </html>
  );
}
