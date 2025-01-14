'use client';

import { Heebo } from 'next/font/google';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { NavigationProvider } from '@/components/providers/NavigationProvider';
import './globals.css';
import '@/styles/autofill.css';
import Script from 'next/script';
import { HotjarScript } from '@/components/shared/HotjarScript';

const heebo = Heebo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-heebo',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${heebo.variable}`}>
      <head>
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="4812d2c5-a615-4c7f-80ba-ed2014b5a07c"
          data-blockingmode="auto"
          data-culture="de"
          strategy="beforeInteractive"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-MBBVJT3C');
          `}
        </Script>
        <HotjarScript />
      </head>
      <body suppressHydrationWarning className="overflow-x-hidden">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MBBVJT3C"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <NavigationProvider>
          <LoadingProvider>
            <div className="relative w-full overflow-x-hidden">{children}</div>
          </LoadingProvider>
        </NavigationProvider>
      </body>
    </html>
  );
}
