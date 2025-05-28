"use client";

import Script from "next/script";
import { HotjarScript } from "@/components/shared/HotjarScript";
import { useEffect } from "react";

// Create a client component for Cookiebot
const CookiebotScript = () => {
  // Skip in development to prevent errors
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  return (
    <Script
      id="Cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid="4812d2c5-a615-4c7f-80ba-ed2014b5a07c"
      data-blockingmode="auto"
      data-culture="de"
      strategy="afterInteractive"
    />
  );
};

// Handle adding the noscript GTM iframe safely
const AddGtmNoScript = () => {
  useEffect(() => {
    // Skip in development to prevent errors
    if (process.env.NODE_ENV === "development") {
      return;
    }

    // Only run on client, never during SSR
    if (typeof window !== "undefined") {
      // Create the noscript element
      const noScript = document.createElement("noscript");

      // Create the iframe
      const iframe = document.createElement("iframe");
      iframe.src = "https://www.googletagmanager.com/ns.html?id=GTM-MBBVJT3C";
      iframe.height = "0";
      iframe.width = "0";
      iframe.style.display = "none";
      iframe.style.visibility = "hidden";

      // Append iframe to noscript and noscript to body
      noScript.appendChild(iframe);
      document.body.appendChild(noScript);
    }

    // No cleanup needed, this runs once
  }, []);

  return null;
};

export function Scripts() {
  // Skip all scripts in development environment
  if (process.env.NODE_ENV === "development") {
    console.log("Third-party scripts disabled in development environment");
    return null;
  }

  return (
    <>
      <CookiebotScript />
      <Script id="google-consent-mode" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}

          gtag('consent', 'default', {
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'ad_storage': 'denied',
            'analytics_storage': 'denied',
            'functionality_storage': 'denied',
            'personalization_storage': 'denied',
            'security_storage': 'granted'
          });
        `}
      </Script>
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
      <AddGtmNoScript />
    </>
  );
}
